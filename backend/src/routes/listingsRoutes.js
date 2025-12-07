const express = require('express');
const router = express.Router();
const listingsController = require('../controllers/listingsController');
const { authenticate, authorize } = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/cacheMiddleware');

// Cache configuration for GET endpoints
const cacheConfig = { ttl: 600, prefix: 'listings', trackMetrics: true };

// Public GET routes (for traveler frontend) - with caching
router.get('/flights', cacheMiddleware(cacheConfig), listingsController.getAllFlights);
router.get('/hotels', cacheMiddleware(cacheConfig), listingsController.getAllHotels);
router.get('/cars', cacheMiddleware(cacheConfig), listingsController.getAllCars);

// Protected POST routes (for admin only) - no caching for mutations
router.post('/flight', authenticate, authorize('super_admin', 'admin'), listingsController.addFlight);
router.post('/hotel', authenticate, authorize('super_admin', 'admin'), listingsController.addHotel);
router.post('/car', authenticate, authorize('super_admin', 'admin'), listingsController.addCar);

module.exports = router;
