'use strict';
require('module-alias/register');
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('@src/routes/main');
const Listing = require('@src/models/Listing');
const NameAssignment = require('@src/models/NameAssignment');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Simple request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} ${ms}ms`);
  });
  next();
});

// Routes
app.use('/api', apiRoutes);

// 404 handler for API
app.use('/api', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Not Found',
      details: `Route ${req.method} ${req.originalUrl} does not exist`
    }
  });
});

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({
    error: {
      message: err.message || 'Internal Server Error',
      details: err.stack ? err.stack.split('\n')[0] : undefined
    }
  });
});

// MongoDB connection
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');

    // Sync indexes for models
    try {
      await Listing.syncIndexes();
      console.log('Listing indexes synchronized');
    } catch (syncErr) {
      console.error('Failed to sync Listing indexes:', syncErr.message);
    }

    try {
      await NameAssignment.syncIndexes();
      console.log('NameAssignment indexes synchronized');
    } catch (syncErr) {
      console.error('Failed to sync NameAssignment indexes:', syncErr.message);
    }
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
  }
})();

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = { app, server };
