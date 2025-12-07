/**
 * Review Model - MongoDB
 * Stores reviews for flights, hotels, and cars
 */
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  review_id: {
    type: String,
    required: true,
    unique: true,
    default: () => 'REV-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
  },
  user_id: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{3}-[0-9]{2}-[0-9]{4}$/.test(v);
      },
      message: 'User ID must be in SSN format: XXX-XX-XXXX'
    }
  },
  user_name: {
    type: String,
    required: true
  },
  listing_type: {
    type: String,
    required: true,
    enum: ['FLIGHT', 'HOTEL', 'CAR'],
    index: true
  },
  listing_id: {
    type: String,
    required: true,
    index: true
  },
  booking_id: {
    type: String,
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    index: true
  },
  title: {
    type: String,
    maxlength: 200
  },
  review_text: {
    type: String,
    required: true,
    maxlength: 2000
  },
  // Specific ratings for different aspects
  ratings_breakdown: {
    cleanliness: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 },
    location: { type: Number, min: 1, max: 5 },
    amenities: { type: Number, min: 1, max: 5 }
  },
  // For flights specifically
  flight_experience: {
    on_time: { type: Boolean },
    seat_comfort: { type: Number, min: 1, max: 5 },
    crew_service: { type: Number, min: 1, max: 5 },
    food_quality: { type: Number, min: 1, max: 5 }
  },
  // Review images (uploaded by user)
  images: [{
    url: String,
    caption: String,
    uploaded_at: { type: Date, default: Date.now }
  }],
  helpful_votes: {
    type: Number,
    default: 0
  },
  is_verified: {
    type: Boolean,
    default: false
  },
  response: {
    text: String,
    responded_by: String,
    responded_at: Date
  },
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'reviews'
});

// Compound indexes for efficient queries
reviewSchema.index({ listing_type: 1, listing_id: 1, created_at: -1 });
reviewSchema.index({ user_id: 1, created_at: -1 });
reviewSchema.index({ rating: 1, listing_type: 1 });

// Calculate average rating for a listing
reviewSchema.statics.getAverageRating = async function(listingType, listingId) {
  const result = await this.aggregate([
    { $match: { listing_type: listingType, listing_id: listingId, is_active: true } },
    { $group: {
      _id: null,
      avgRating: { $avg: '$rating' },
      totalReviews: { $sum: 1 }
    }}
  ]);
  return result[0] || { avgRating: 0, totalReviews: 0 };
};

// Get reviews by user
reviewSchema.statics.getByUser = async function(userId, limit = 20) {
  return this.find({ user_id: userId, is_active: true })
    .sort({ created_at: -1 })
    .limit(limit);
};

// Get reviews by listing
reviewSchema.statics.getByListing = async function(listingType, listingId, limit = 20) {
  return this.find({ listing_type: listingType, listing_id: listingId, is_active: true })
    .sort({ created_at: -1 })
    .limit(limit);
};

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
