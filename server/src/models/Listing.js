'use strict';

const mongoose = require('mongoose');

const ListingSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    canonicalUrl: { type: String, default: '', trim: true },
    avitoId: { type: String, index: true, unique: true, sparse: true, trim: true },
    mainImageUrl: { type: String, default: '', trim: true },
    title: { type: String, default: '', trim: true },
    viewsCount: { type: Number, default: 0, min: 0 },
    // Lazy enrichment service fields
    lastEnrichedAt: { type: Date, default: null },
    enrichAttempts: { type: Number, default: 0, min: 0 },
    lastEnrichError: { type: String, default: '', trim: true }
  },
  { timestamps: true }
);

// Ensure unique sparse index on avitoId
ListingSchema.index({ avitoId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Listing || mongoose.model('Listing', ListingSchema);