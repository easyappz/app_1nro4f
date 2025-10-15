'use strict';

const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    canonicalUrl: { type: String, default: '', trim: true },
    avitoUserId: { type: String, index: true, unique: true, sparse: true, trim: true },
    displayName: { type: String, default: '', trim: true },
    avatarUrl: { type: String, default: '', trim: true },
    viewsCount: { type: Number, default: 0, min: 0 }
  },
  { timestamps: true }
);

// Ensure unique sparse index on avitoUserId
AccountSchema.index({ avitoUserId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Account || mongoose.model('Account', AccountSchema);
