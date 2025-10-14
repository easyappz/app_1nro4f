'use strict';

const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, unique: true, trim: true },
    title: { type: String, default: '' },
    viewsCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.models.Listing || mongoose.model('Listing', ListingSchema);
