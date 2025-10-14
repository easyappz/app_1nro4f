const express = require('express');

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

module.exports = router;
