'use strict';

const mongoose = require('mongoose');
const Listing = require('@src/models/Listing');
const { fetchAvitoDetails, resolveListingIdFromUrl } = require('@src/utils/avito');

const ENRICH_MIN_INTERVAL_MS = 60 * 1000; // 60 seconds
const ENRICH_MAX_ATTEMPTS = 5;

const listingController = {
  async resolveListing(req, res) {
    try {
      const { url } = req.body || {};

      if (!url || typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ error: { message: 'Field "url" is required and must be a non-empty string', details: 'Empty or non-string url' } });
      }

      const rawUrl = url.trim();

      try {
        // Validate URL format
        // eslint-disable-next-line no-new
        new URL(rawUrl);
      } catch (e) {
        return res.status(400).json({ error: { message: `Invalid URL: ${rawUrl}`, details: e.message } });
      }

      // Fast offline pre-parse: resolve candidate avitoId from URL and short-circuit if already in DB
      const candidateId = resolveListingIdFromUrl(rawUrl);
      if (isNonEmptyString(candidateId)) {
        try {
          const existing = await Listing.findOne({ avitoId: candidateId });
          if (existing) {
            return res.status(200).json({ data: existing });
          }
        } catch (e) {
          return res.status(500).json({ error: { message: 'Failed to check existing listing by avitoId', details: e.message } });
        }
      }

      let details;
      try {
        details = await fetchAvitoDetails(rawUrl);
      } catch (e) {
        // If we cannot resolve avitoId specifically, return 422; otherwise 500
        const msg = e && e.message ? e.message : 'Failed to resolve listing';
        const isAvitoIdError = msg.includes('Unable to resolve avitoId');
        return res.status(isAvitoIdError ? 422 : 500).json({ error: { message: msg, details: e.message } });
      }

      const { avitoId, title, mainImageUrl, canonicalUrl } = details || {};

      if (!isNonEmptyString(avitoId)) {
        return res.status(422).json({ error: { message: 'Unable to resolve avitoId from page content or URL', details: 'Empty avitoId' } });
      }

      const normalizedUrl = (isNonEmptyString(canonicalUrl) && canonicalUrl.trim()) || rawUrl;
      const offlineMinimal = !isNonEmptyString(title) && !isNonEmptyString(mainImageUrl);

      try {
        // 1) Try to find by avitoId
        let doc = await Listing.findOne({ avitoId });
        if (doc) {
          const updates = {};
          if (isNonEmptyString(title) && title !== doc.title) updates.title = title;
          if (isNonEmptyString(mainImageUrl) && mainImageUrl !== doc.mainImageUrl) updates.mainImageUrl = mainImageUrl;
          if (isNonEmptyString(canonicalUrl) && canonicalUrl !== doc.canonicalUrl) updates.canonicalUrl = canonicalUrl;
          if (isNonEmptyString(normalizedUrl) && normalizedUrl !== doc.url) updates.url = normalizedUrl;

          if (Object.keys(updates).length > 0) {
            doc.set(updates);
            await doc.save();
          }

          // Schedule enrichment only if we received offline-minimal and the stored doc still lacks data
          if (offlineMinimal && shouldEnrichDoc(doc)) {
            scheduleEnrichment(doc._id, 'resolveListing:existing-by-id');
          }

          return res.status(200).json({ data: doc });
        }

        // 2) Backward compatibility: find by URL (raw or canonical)
        doc = await Listing.findOne({ $or: [{ url: rawUrl }, { url: normalizedUrl }] });
        if (doc) {
          try {
            doc.set({
              avitoId,
              title: isNonEmptyString(title) ? title : doc.title,
              mainImageUrl: isNonEmptyString(mainImageUrl) ? mainImageUrl : doc.mainImageUrl,
              canonicalUrl: isNonEmptyString(canonicalUrl) ? canonicalUrl : doc.canonicalUrl,
              url: isNonEmptyString(normalizedUrl) ? normalizedUrl : doc.url
            });
            await doc.save();

            if (offlineMinimal && shouldEnrichDoc(doc)) {
              scheduleEnrichment(doc._id, 'resolveListing:existing-by-url');
            }

            return res.status(200).json({ data: doc });
          } catch (err) {
            if (err && err.code === 11000) {
              // Race: duplicate avitoId just created elsewhere
              const conflict = await Listing.findOne({ avitoId });
              if (conflict) {
                if (offlineMinimal && shouldEnrichDoc(conflict)) {
                  scheduleEnrichment(conflict._id, 'resolveListing:dup-after-url');
                }
                return res.status(200).json({ data: conflict });
              }
            }
            return res.status(500).json({ error: { message: 'Failed to update existing listing', details: err.message } });
          }
        }

        // 3) Create new
        try {
          const created = await Listing.create({
            url: normalizedUrl,
            canonicalUrl: isNonEmptyString(canonicalUrl) ? canonicalUrl : '',
            avitoId,
            mainImageUrl: isNonEmptyString(mainImageUrl) ? mainImageUrl : '',
            title: isNonEmptyString(title) ? title : ''
          });

          if (offlineMinimal && shouldEnrichDoc(created)) {
            scheduleEnrichment(created._id, 'resolveListing:created');
          }

          return res.status(201).json({ data: created });
        } catch (err) {
          if (err && err.code === 11000) {
            // Race: someone created it by avitoId
            const docDup = await Listing.findOne({ avitoId });
            if (docDup) {
              if (offlineMinimal && shouldEnrichDoc(docDup)) {
                scheduleEnrichment(docDup._id, 'resolveListing:dup-after-create');
              }
              return res.status(200).json({ data: docDup });
            }
          }
          return res.status(500).json({ error: { message: 'Failed to create listing', details: err.message } });
        }
      } catch (errOuter) {
        return res.status(500).json({ error: { message: errOuter.message || 'Unexpected error', details: errOuter.message } });
      }
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  },

  async getPopular(req, res) {
    try {
      const limitParam = parseInt(String(req.query.limit || '20'), 10);
      const limit = Number.isNaN(limitParam) ? 20 : Math.min(Math.max(limitParam, 1), 100);

      const items = await Listing.find({})
        .sort({ viewsCount: -1, createdAt: -1 })
        .limit(limit);

      return res.status(200).json({ data: items, meta: { limit } });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: { message: 'Invalid listing id', details: 'Bad ObjectId' } });
      }

      const doc = await Listing.findByIdAndUpdate(
        id,
        { $inc: { viewsCount: 1 } },
        { new: true }
      );

      if (!doc) {
        return res.status(404).json({ error: { message: 'Listing not found', details: 'No document with provided id' } });
      }

      // Background lazy enrichment when data is incomplete
      const missingCore = !isNonEmptyString(doc.title) || !isNonEmptyString(doc.mainImageUrl);
      if (missingCore && shouldEnrichDoc(doc)) {
        scheduleEnrichment(doc._id, 'getById');
      }

      return res.status(200).json({ data: doc });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  }
};

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function shouldEnrichDoc(doc) {
  const attempts = Number(doc.enrichAttempts || 0);
  const last = doc.lastEnrichedAt instanceof Date ? doc.lastEnrichedAt.getTime() : 0;
  const now = Date.now();
  const intervalOk = last === 0 || now - last > ENRICH_MIN_INTERVAL_MS;
  const attemptsOk = attempts < ENRICH_MAX_ATTEMPTS;
  return intervalOk && attemptsOk;
}

function scheduleEnrichment(listingId, reason) {
  try {
    setTimeout(async () => {
      try {
        await enrichListingSafe(listingId, reason);
      } catch (e) {
        console.error(`[lazy-enrich] failed (id=${listingId}, reason=${reason}):`, e.message);
      }
    }, 0);
  } catch (e) {
    // Do not block response
    console.error(`[lazy-enrich] schedule error (id=${listingId}, reason=${reason}):`, e.message);
  }
}

async function enrichListingSafe(listingId, reason) {
  try {
    const doc = await Listing.findById(listingId);
    if (!doc) return;

    const targetUrl = isNonEmptyString(doc.canonicalUrl) ? doc.canonicalUrl : doc.url;
    if (!isNonEmptyString(targetUrl)) return;

    let details;
    try {
      details = await fetchAvitoDetails(targetUrl);
    } catch (e) {
      // Even on failure, record attempt timestamp to avoid hot loops
      await Listing.findByIdAndUpdate(listingId, {
        $set: { lastEnrichedAt: new Date() },
        $inc: { enrichAttempts: 1 }
      }).catch((err) => console.error('[lazy-enrich] mark failed attempt:', err.message));
      console.warn(`[lazy-enrich] fetch failed (id=${listingId}, reason=${reason}):`, e.message);
      return;
    }

    const updatesSet = { lastEnrichedAt: new Date() };
    let hasFieldImprovements = false;

    if (!isNonEmptyString(doc.title) && isNonEmptyString(details.title)) {
      updatesSet.title = details.title;
      hasFieldImprovements = true;
    }
    if (!isNonEmptyString(doc.mainImageUrl) && isNonEmptyString(details.mainImageUrl)) {
      updatesSet.mainImageUrl = details.mainImageUrl;
      hasFieldImprovements = true;
    }
    if (isNonEmptyString(details.canonicalUrl) && details.canonicalUrl !== doc.canonicalUrl) {
      updatesSet.canonicalUrl = details.canonicalUrl;
      hasFieldImprovements = true;
    }

    // Always store attempt/time; update fields only if improved
    await Listing.findByIdAndUpdate(listingId, {
      $set: updatesSet,
      $inc: { enrichAttempts: 1 }
    }).catch((err) => console.error('[lazy-enrich] failed to update listing:', err.message));

    if (hasFieldImprovements) {
      console.log(`[lazy-enrich] listing improved (id=${listingId}, reason=${reason})`);
    }
  } catch (error) {
    console.error('[lazy-enrich] unexpected error:', error.message);
  }
}

module.exports = listingController;
