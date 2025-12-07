const { producer } = require('../config/kafka');

let isConnected = false;

const connectProducer = async () => {
  if (!isConnected) {
    await producer.connect();
    isConnected = true;
    console.log('✅ Kafka Producer connected');
  }
};

const sendMessage = async (topic, message) => {
  try {
    await connectProducer();
    
    await producer.send({
      topic,
      messages: [
        {
          key: message.key || null,
          value: JSON.stringify(message.value),
          headers: message.headers || {}
        }
      ]
    });
    
    console.log(`📤 Message sent to topic: ${topic}`);
  } catch (error) {
    console.error('❌ Error sending message:', error);
    throw error;
  }
};

const disconnectProducer = async () => {
  if (isConnected) {
    await producer.disconnect();
    isConnected = false;
    console.log('✅ Kafka Producer disconnected');
  }
};

module.exports = { connectProducer, sendMessage, disconnectProducer };