'use strict';

const mongoose = require('mongoose');
const Listing = require('@src/models/Listing');
const { fetchAvitoDetails } = require('@src/utils/avito');

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
            return res.status(200).json({ data: doc });
          } catch (err) {
            if (err && err.code === 11000) {
              // Race: duplicate avitoId just created elsewhere
              const conflict = await Listing.findOne({ avitoId });
              if (conflict) {
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
          return res.status(201).json({ data: created });
        } catch (err) {
          if (err && err.code === 11000) {
            // Race: someone created it by avitoId
            const docDup = await Listing.findOne({ avitoId });
            if (docDup) {
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

      return res.status(200).json({ data: doc });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  }
};

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

module.exports = listingController;
