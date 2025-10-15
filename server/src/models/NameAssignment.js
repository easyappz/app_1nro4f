'use strict';

const mongoose = require('mongoose');

const NameAssignmentSchema = new mongoose.Schema(
  {
    nameKeyHash: { type: String, required: true, unique: true, index: true },
    index: { type: Number, required: true },
    suffix: { type: Number, default: 0 }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false
  }
);

// Unique pair (index, suffix) to guarantee uniqueness of visual names
NameAssignmentSchema.index({ index: 1, suffix: 1 }, { unique: true });
// Helpful index for scans
NameAssignmentSchema.index({ index: 1 });

module.exports = mongoose.model('NameAssignment', NameAssignmentSchema);
