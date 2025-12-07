const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['PAGE_VIEW', 'LISTING_CLICK', 'BOOKING', 'SEARCH', 'FILTER'],
    index: true
  },
  page_name: {
    type: String
  },
  listing_type: {
    type: String,
    enum: ['FLIGHT', 'HOTEL', 'CAR']
  },
  listing_id: {
    type: String
  },
  user_id: {
    type: String,
    index: true
  },
  session_id: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  ip_address: {
    type: String
  },
  user_agent: {
    type: String
  },
  location: {
    city: String,
    state: String,
    country: String
  }
}, {
  timestamps: true
});

// Compound indexes for analytics queries
analyticsSchema.index({ date: 1, type: 1 });
analyticsSchema.index({ listing_type: 1, listing_id: 1, date: 1 });
analyticsSchema.index({ user_id: 1, date: 1 });

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
