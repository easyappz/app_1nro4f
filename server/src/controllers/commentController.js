'use strict';

const mongoose = require('mongoose');
const Comment = require('@src/models/Comment');
const Listing = require('@src/models/Listing');

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
      return res.status(200).json({ data: comments });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message } });
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
      return res.status(201).json({ data: created });
    } catch (error) {
      return res.status(500).json({ error: { message: error.message } });
    }
  }
};

module.exports = commentController;
