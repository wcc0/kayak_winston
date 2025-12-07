const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Add listings
router.post('/flight', authorize('super_admin', 'admin'), listingsController.addFlight);
router.post('/hotel', authorize('super_admin', 'admin'), listingsController.addHotel);
router.post('/car', authorize('super_admin', 'admin'), listingsController.addCar);

// Search listings
router.get('/search', listingsController.searchListings);

module.exports = router;
