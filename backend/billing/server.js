const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { connectDB } = require('./src/config/database');
const connectMongoDB = require('./src/config/mongodb');
const billingRoutes = require('./src/routes/billingRoutes');
const errorHandler = require('./src/middleware/errorHandler');
const { connectConsumer } = require('./src/kafka/consumer');
const { connectProducer } = require('./src/kafka/producer');

const app = express();
const PORT = process.env.PORT || 8086;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Routes
app.get('/', (req, res) => {
  res.json({
    service: 'Billing Service',
    version: '1.0.0',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', billingRoutes);

// Error handler
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDB();
    await connectMongoDB();
    
    // Connect to Kafka
    await connectProducer();
    await connectConsumer();
    //console.log('⚠️  Kafka disabled - running without message queue');
    // Start Express server
    app.listen(PORT, () => {
      console.log(`🚀 Billing Service running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV}`);
      console.log(`🔗 API URL: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

startServer();