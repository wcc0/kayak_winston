const { consumer } = require('../config/kafka');
const billingService = require('../services/billingService');

const connectConsumer = async () => {
  await consumer.connect();
  console.log('✅ Kafka Consumer connected');
  
  // Subscribe to booking events with auto-create
  await consumer.subscribe({ 
    topic: 'booking.completed', 
    fromBeginning: false 
  }).catch(async (error) => {
    if (error.type === 'UNKNOWN_TOPIC_OR_PARTITION') {
      console.log('⚠️  Topic does not exist, will be created on first message');
    } else {
      throw error;
    }
  });
  
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const data = JSON.parse(message.value.toString());
        console.log(`📥 Received message from ${topic}:`, data);
        
        // Process billing based on booking completion
        if (topic === 'booking.completed') {
          await billingService.createBillingFromBooking(data);
        }
      } catch (error) {
        console.error('❌ Error processing message:', error);
      }
    }
  });
};

const disconnectConsumer = async () => {
  await consumer.disconnect();
  console.log('✅ Kafka Consumer disconnected');
};

module.exports = { connectConsumer, disconnectConsumer };