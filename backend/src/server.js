const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const { connectMongoDB, testMySQLConnection } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { connectKafka } = require('./config/kafka');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { getCacheMetrics, resetCacheMetrics } = require('./middleware/cacheMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const listingsRoutes = require('./routes/listingsRoutes');
const usersRoutes = require('./routes/usersRoutes');
const billingRoutes = require('./routes/billingRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const travelerRoutes = require('./routes/travelerRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin service is running',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Cache metrics endpoint
app.get('/metrics/cache', (req, res) => {
  const metrics = getCacheMetrics();
  res.json({
    success: true,
    data: metrics,
    timestamp: new Date().toISOString()
  });
});

// Reset cache metrics (for benchmarking)
app.post('/metrics/cache/reset', (req, res) => {
  resetCacheMetrics();
  res.json({
    success: true,
    message: 'Cache metrics reset successfully',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/admin/auth', authRoutes);
app.use('/api/admin/listings', listingsRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/api/admin/billing', billingRoutes);
app.use('/api/admin/analytics', analyticsRoutes);

// Traveler routes (bookings, reviews)
app.use('/api/traveler', travelerRoutes);

// Public user routes (signup/login)
const publicUsersRoutes = require('./routes/publicUsersRoutes');
app.use('/api/users', publicUsersRoutes);

// AI chat routes (public) - used by frontend Concierge page to persist and read chats
const aiRoutes = require('./routes/aiRoutes');
app.use('/api/ai', aiRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Initialize connections and start server
const startServer = async () => {
  try {
    // Connect to databases
    await testMySQLConnection();
    await connectMongoDB();
    
    // Connect to Redis
    await connectRedis();
    
    // Connect to Kafka
    await connectKafka();
    
    // Start server
    app.listen(PORT, () => {
      console.log('========================================');
      console.log(`🚀 Admin Service running on port ${PORT}`);
      console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log('========================================');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

startServer();

module.exports = app;
