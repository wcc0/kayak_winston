const Review = require('../models/Review');
const { validateReview, handleValidationErrors } = require('../middleware/validation');

// Create a new review
const createReview = async (req, res) => {
  try {
    const {
      user_id,
      user_name,
      listing_type,
      listing_id,
      booking_id,
      rating,
      review_text,
      ratings_breakdown,
      flight_experience,
      images
    } = req.body;

    const review = await Review.create({
      user_id,
      user_name,
      listing_type,
      listing_id,
      booking_id,
      rating,
      review_text,
      ratings_breakdown,
      flight_experience,
      images
    });

    // Compute new averages
    const agg = await Review.getAverageRating(listing_type, listing_id);

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
      aggregate: agg
    });
  } catch (err) {
    console.error('Create review error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit review', error: err.message });
  }
};

// Get reviews for a listing
const getReviewsByListing = async (req, res) => {
  try {
    const { listingType, listingId } = req.params;
    const reviews = await Review.getByListing(listingType.toUpperCase(), listingId);
    const agg = await Review.getAverageRating(listingType.toUpperCase(), listingId);
    return res.json({ success: true, data: reviews, aggregate: agg });
  } catch (err) {
    console.error('Get listing reviews error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

// Get reviews by user
const getReviewsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const reviews = await Review.getByUser(userId);
    return res.json({ success: true, data: reviews });
  } catch (err) {
    console.error('Get user reviews error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};

module.exports = {
  createReview,
  getReviewsByListing,
  getReviewsByUser,
};
