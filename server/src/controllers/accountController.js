'use strict';

const mongoose = require('mongoose');
const Account = require('@src/models/Account');
const Comment = require('@src/models/Comment');
const { fetchAvitoAccountDetails } = require('@src/utils/avito');
const { displayNameFromKey } = require('@src/utils/namegen');

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function normalizeComment(doc) {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  if (typeof obj.likesCount !== 'number') obj.likesCount = 0;
  return obj;
}

function parseLimit(raw, min, max, def) {
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n)) return def;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

const accountController = {
  async resolveAccount(req, res) {
    try {
      const { url } = req.body || {};

      if (!url || typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ error: { message: 'Field "url" is required and must be a non-empty string', details: 'Empty or non-string url' } });
      }

      const rawUrl = url.trim();
      try {
        // eslint-disable-next-line no-new
        new URL(rawUrl);
      } catch (e) {
        return res.status(400).json({ error: { message: `Invalid URL: ${rawUrl}`, details: e.message } });
      }

      let details;
      try {
        details = await fetchAvitoAccountDetails(rawUrl);
      } catch (e) {
        const msg = e && e.message ? e.message : 'Failed to resolve account';
        const isUserIdError = msg.includes('Unable to resolve avitoUserId');
        return res.status(isUserIdError ? 422 : 500).json({ error: { message: msg, details: e.message } });
      }

      const { displayName, avitoUserId, avatarUrl, canonicalUrl } = details || {};
      if (!isNonEmptyString(avitoUserId)) {
        return res.status(422).json({ error: { message: 'Unable to resolve avitoUserId from page content or URL', details: 'Empty avitoUserId' } });
      }

      const normalizedUrl = (isNonEmptyString(canonicalUrl) && canonicalUrl.trim()) || rawUrl;

      try {
        // 1) Try to find by avitoUserId
        let doc = await Account.findOne({ avitoUserId });
        if (doc) {
          const updates = {};
          if (isNonEmptyString(displayName) && displayName !== doc.displayName) updates.displayName = displayName;
          if (isNonEmptyString(avatarUrl) && avatarUrl !== doc.avatarUrl) updates.avatarUrl = avatarUrl;
          if (isNonEmptyString(canonicalUrl) && canonicalUrl !== doc.canonicalUrl) updates.canonicalUrl = canonicalUrl;
          if (isNonEmptyString(normalizedUrl) && normalizedUrl !== doc.url) updates.url = normalizedUrl;
          if (Object.keys(updates).length > 0) {
            doc.set(updates);
            await doc.save();
          }
          return res.status(200).json({ data: doc });
        }

        // 2) Backward compatibility: find by URL (raw or canonical)
        doc = await Account.findOne({ $or: [{ url: rawUrl }, { url: normalizedUrl }] });
        if (doc) {
          try {
            doc.set({
              avitoUserId,
              displayName: isNonEmptyString(displayName) ? displayName : doc.displayName,
              avatarUrl: isNonEmptyString(avatarUrl) ? avatarUrl : doc.avatarUrl,
              canonicalUrl: isNonEmptyString(canonicalUrl) ? canonicalUrl : doc.canonicalUrl,
              url: isNonEmptyString(normalizedUrl) ? normalizedUrl : doc.url
            });
            await doc.save();
            return res.status(200).json({ data: doc });
          } catch (err) {
            if (err && err.code === 11000) {
              const conflict = await Account.findOne({ avitoUserId });
              if (conflict) return res.status(200).json({ data: conflict });
            }
            return res.status(500).json({ error: { message: 'Failed to update existing account', details: err.message } });
          }
        }

        // 3) Create new
        try {
          const created = await Account.create({
            url: normalizedUrl,
            canonicalUrl: isNonEmptyString(canonicalUrl) ? canonicalUrl : '',
            avitoUserId,
            displayName: isNonEmptyString(displayName) ? displayName : '',
            avatarUrl: isNonEmptyString(avatarUrl) ? avatarUrl : ''
          });
          return res.status(201).json({ data: created });
        } catch (err) {
          if (err && err.code === 11000) {
            const docDup = await Account.findOne({ avitoUserId });
            if (docDup) return res.status(200).json({ data: docDup });
          }
          return res.status(500).json({ error: { message: 'Failed to create account', details: err.message } });
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

      const items = await Account.find({})
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
        return res.status(400).json({ error: { message: 'Invalid account id', details: 'Bad ObjectId' } });
      }

      const doc = await Account.findByIdAndUpdate(
        id,
        { $inc: { viewsCount: 1 } },
        { new: true }
      );

      if (!doc) {
        return res.status(404).json({ error: { message: 'Account not found', details: 'No document with provided id' } });
      }
      return res.status(200).json({ data: doc });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  },

  async listByAccount(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: { message: 'Invalid account id', details: 'Bad ObjectId' } });
      }
      const account = await Account.findById(id);
      if (!account) {
        return res.status(404).json({ error: { message: 'Account not found', details: 'No document with provided id' } });
      }
      const comments = await Comment.find({ accountId: id }).sort({ createdAt: -1 });
      return res.status(200).json({ data: comments.map(normalizeComment) });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  },

  async createForAccount(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: { message: 'Invalid account id', details: 'Bad ObjectId' } });
      }
      const account = await Account.findById(id);
      if (!account) {
        return res.status(404).json({ error: { message: 'Account not found', details: 'No document with provided id' } });
      }

      const { nameKey, text, authorName } = req.body || {};
      const key = typeof nameKey === 'string' ? nameKey.trim() : '';
      const body = typeof text === 'string' ? text.trim() : '';
      const legacyName = typeof authorName === 'string' ? authorName.trim() : '';

      if (!body) {
        return res.status(400).json({ error: { message: 'Field "text" is required', details: 'Empty text' } });
      }

      let finalName = '';
      if (isNonEmptyString(key)) {
        finalName = await displayNameFromKey(key);
      } else if (isNonEmptyString(legacyName)) {
        finalName = legacyName;
      } else {
        return res.status(400).json({ error: { message: 'Field "nameKey" is required', details: 'Missing nameKey' } });
      }

      const created = await Comment.create({ accountId: account._id, authorName: finalName, text: body });
      return res.status(201).json({ data: normalizeComment(created) });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  },

  async popularByAccount(req, res) {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: { message: 'Invalid account id', details: 'Bad ObjectId' } });
      }
      const account = await Account.findById(id);
      if (!account) {
        return res.status(404).json({ error: { message: 'Account not found', details: 'No document with provided id' } });
      }

      const limit = parseLimit(req.query.limit, 1, 10, 2);
      const comments = await Comment.find({ accountId: id })
        .sort({ likesCount: -1, createdAt: -1 })
        .limit(limit);

      return res.status(200).json({ data: comments.map(normalizeComment) });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  }
};

module.exports = accountController;
