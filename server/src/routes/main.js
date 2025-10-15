const express = require('express');
const listingController = require('@src/controllers/listingController');
const commentController = require('@src/controllers/commentController');
const accountController = require('@src/controllers/accountController');

const router = express.Router();

// GET /api/hello
router.get('/hello', (req, res) => {
  try {
    res.json({ message: 'Hello from API!' });
  } catch (error) {
    res.status(500).json({
      error: {
        message: error.message,
        details: 'Failed to handle /hello'
      }
    });
  }
});

// GET /api/status
router.get('/status', (req, res) => {
  try {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime())
    });
  } catch (error) {
    res.status(500).json({
      error: {
        message: error.message,
        details: 'Failed to handle /status'
      }
    });
  }
});

// Listings
router.post('/listings/resolve', (req, res) => listingController.resolveListing(req, res));
router.get('/listings/popular', (req, res) => listingController.getPopular(req, res));
router.get('/listings/:id', (req, res) => listingController.getById(req, res));

// Comments for a listing
router.get('/listings/:id/comments', (req, res) => commentController.listByListing(req, res));
router.post('/listings/:id/comments', (req, res) => commentController.createForListing(req, res));
router.get('/listings/:id/comments/popular', (req, res) => commentController.popularByListing(req, res));

// Accounts
router.post('/accounts/resolve', (req, res) => accountController.resolveAccount(req, res));
router.get('/accounts/popular', (req, res) => accountController.getPopular(req, res));
router.get('/accounts/:id', (req, res) => accountController.getById(req, res));

// Comments for an account
router.get('/accounts/:id/comments', (req, res) => accountController.listByAccount(req, res));
router.post('/accounts/:id/comments', (req, res) => accountController.createForAccount(req, res));
router.get('/accounts/:id/comments/popular', (req, res) => accountController.popularByAccount(req, res));

// Comment likes
router.post('/comments/:commentId/like', (req, res) => commentController.like(req, res));
router.post('/comments/:commentId/unlike', (req, res) => commentController.unlike(req, res));

module.exports = router;
