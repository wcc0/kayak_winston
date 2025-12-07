const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  admin_id: {
    type: String,
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'LOGOUT',
      'CREATE_LISTING',
      'UPDATE_LISTING',
      'DELETE_LISTING',
      'VIEW_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'VIEW_BILLING',
      'GENERATE_REPORT',
      'SYSTEM_ERROR'
    ]
  },
  entity_type: {
    type: String,
    enum: ['FLIGHT', 'HOTEL', 'CAR', 'USER', 'BILLING', 'SYSTEM']
  },
  entity_id: {
    type: String
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ip_address: {
    type: String
  },
  user_agent: {
    type: String
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILURE', 'WARNING'],
    default: 'SUCCESS'
  },
  error_message: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
activityLogSchema.index({ admin_id: 1, timestamp: -1 });
activityLogSchema.index({ action: 1, timestamp: -1 });
activityLogSchema.index({ entity_type: 1, entity_id: 1 });

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

module.exports = ActivityLog;
