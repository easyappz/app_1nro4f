'use strict';

const mongoose = require('mongoose');
const Listing = require('@src/models/Listing');
const { fetchAvitoTitle } = require('@src/utils/avito');

const listingController = {
  async resolveListing(req, res) {
    try {
      const { url } = req.body || {};

      if (!url || typeof url !== 'string' || !url.trim()) {
        return res.status(400).json({ error: { message: 'Field "url" is required and must be a non-empty string' } });
      }

      const rawUrl = url.trim();

      try {
        // Validate URL format
        // eslint-disable-next-line no-new
        new URL(rawUrl);
      } catch (e) {
        return res.status(400).json({ error: { message: `Invalid URL: ${rawUrl}` } });
      }

      const existing = await Listing.findOne({ url: rawUrl });
      if (existing) {
        return res.status(200).json({ data: existing });
      }

      let title = '';
      try {
        title = await fetchAvitoTitle(rawUrl);
      } catch (e) {
        // Non-fatal, we still create the listing with empty title
        title = '';
      }

      try {
        const created = await Listing.create({ url: rawUrl, title });
        return res.status(201).json({ data: created });
      } catch (err) {
        if (err && err.code === 11000) {
          // Race condition: listing was created meanwhile
          const doc = await Listing.findOne({ url: rawUrl });
          if (doc) {
            return res.status(200).json({ data: doc });
          }
        }
        return res.status(500).json({ error: { message: err.message || 'Failed to create listing' } });
      }
    } catch (error) {
      return res.status(500).json({ error: { message: error.message } });
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
      return res.status(500).json({ error: { message: error.message } });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: { message: 'Invalid listing id' } });
      }

      const doc = await Listing.findByIdAndUpdate(
        id,
        { $inc: { viewsCount: 1 } },
        { new: true }
      );

      if (!doc) {
        return res.status(404).json({ error: { message: 'Listing not found' } });
      }

      return res.status(200).json({ data: doc });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message } });
    }
  }
};

module.exports = listingController;
