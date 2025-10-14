'use strict';

const mongoose = require('mongoose');
const Comment = require('@src/models/Comment');
const Listing = require('@src/models/Listing');

function normalizeComment(doc) {
  if (!doc) return doc;
  const obj = doc.toObject ? doc.toObject() : doc;
  if (typeof obj.likesCount !== 'number') obj.likesCount = 0;
  return obj;
}

function parseLimit(raw) {
  const min = 1;
  const max = 10;
  const def = 2;
  let n = parseInt(raw, 10);
  if (Number.isNaN(n)) n = def;
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

const commentController = {
  async listByListing(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: { message: 'Invalid listing id' } });
      }

      const listing = await Listing.findById(id);
      if (!listing) {
        return res.status(404).json({ error: { message: 'Listing not found' } });
      }

      const comments = await Comment.find({ listingId: id }).sort({ createdAt: -1 });
      const normalized = comments.map(normalizeComment);
      return res.status(200).json({ data: normalized });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  },

  async createForListing(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: { message: 'Invalid listing id' } });
      }

      const listing = await Listing.findById(id);
      if (!listing) {
        return res.status(404).json({ error: { message: 'Listing not found' } });
      }

      const { authorName, text } = req.body || {};
      const name = typeof authorName === 'string' ? authorName.trim() : '';
      const body = typeof text === 'string' ? text.trim() : '';

      if (!name) {
        return res.status(400).json({ error: { message: 'Field "authorName" is required' } });
      }

      if (!body) {
        return res.status(400).json({ error: { message: 'Field "text" is required' } });
      }

      const created = await Comment.create({ listingId: listing._id, authorName: name, text: body });
      return res.status(201).json({ data: normalizeComment(created) });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  },

  async like(req, res) {
    try {
      const { commentId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ error: { message: 'Invalid comment id' } });
      }

      const updated = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { likesCount: 1 } },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res.status(404).json({ error: { message: 'Comment not found' } });
      }

      return res.status(200).json({ data: normalizeComment(updated) });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  },

  async unlike(req, res) {
    try {
      const { commentId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(commentId)) {
        return res.status(400).json({ error: { message: 'Invalid comment id' } });
      }

      const existing = await Comment.findById(commentId);
      if (!existing) {
        return res.status(404).json({ error: { message: 'Comment not found' } });
      }

      const current = typeof existing.likesCount === 'number' ? existing.likesCount : 0;
      const next = Math.max(0, current - 1);

      if (next === current) {
        return res.status(200).json({ data: normalizeComment(existing) });
      }

      const updated = await Comment.findByIdAndUpdate(
        commentId,
        { $set: { likesCount: next } },
        { new: true, runValidators: true }
      );

      return res.status(200).json({ data: normalizeComment(updated) });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  },

  async popularByListing(req, res) {
    try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: { message: 'Invalid listing id' } });
      }

      const listing = await Listing.findById(id);
      if (!listing) {
        return res.status(404).json({ error: { message: 'Listing not found' } });
      }

      const limit = parseLimit(req.query.limit);
      const comments = await Comment.find({ listingId: id })
        .sort({ likesCount: -1, createdAt: -1 })
        .limit(limit);

      const normalized = comments.map(normalizeComment);
      return res.status(200).json({ data: normalized });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message, details: error.message } });
    }
  }
};

module.exports = commentController;
