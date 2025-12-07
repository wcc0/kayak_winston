const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Revenue analytics
router.get('/revenue/top-properties', analyticsController.getTopPropertiesByRevenue);
router.get('/revenue/by-city', analyticsController.getCityWiseRevenue);

// Provider analytics
router.get('/providers/top-performers', analyticsController.getTopProviders);

// User behavior analytics
router.get('/page-clicks', analyticsController.getPageClicks);
router.get('/listing-clicks', analyticsController.getListingClicks);
router.get('/user-tracking', analyticsController.getUserTracking);

module.exports = router;
