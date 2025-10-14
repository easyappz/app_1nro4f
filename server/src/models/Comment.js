'use strict';

const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema(
  {
    listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    authorName: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    likesCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
