const ActivityLog = require('../models/ActivityLog');

const errorHandler = async (err, req, res, next) => {
  console.error('Error:', err);

  // Log error to MongoDB if admin is authenticated
  if (req.admin) {
    try {
      await ActivityLog.create({
        admin_id: req.admin.admin_id,
        action: 'SYSTEM_ERROR',
        entity_type: 'SYSTEM',
        details: {
          error_name: err.name,
          error_message: err.message,
          stack: err.stack,
          url: req.originalUrl,
          method: req.method
        },
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        status: 'FAILURE',
        error_message: err.message
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
  }

  // MySQL duplicate entry error
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry. Record already exists.',
      error: err.sqlMessage
    });
  }

  // MySQL foreign key constraint error
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference. Related record does not exist.'
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(err.errors).map(e => e.message)
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
};

module.exports = { errorHandler, notFoundHandler };
