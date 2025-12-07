const express = require('express');
const router = express.Router();
const travelerController = require('../controllers/travelerController');
const reviewsController = require('../controllers/reviewsController');
const { validateReview } = require('../middleware/validation');

// Public routes (no authentication required for travelers)

// User registration
router.post('/register', travelerController.registerUser);

// User login
router.post('/login', travelerController.loginUser);

// Create booking
router.post('/bookings', travelerController.createBooking);

// Get user bookings
router.get('/bookings/:userId', travelerController.getUserBookings);

// Cancel booking
router.put('/bookings/:bookingId/cancel', travelerController.cancelBooking);

// Reviews
router.post('/reviews', validateReview, reviewsController.createReview);
router.get('/reviews/:listingType/:listingId', reviewsController.getReviewsByListing);
router.get('/reviews/user/:userId', reviewsController.getReviewsByUser);

module.exports = router;
