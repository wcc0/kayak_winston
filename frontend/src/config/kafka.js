const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'admin-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(',')
});

const producer = kafka.producer();
const consumer = kafka.consumer({ 
  groupId: process.env.KAFKA_GROUP_ID || 'admin-consumer-group' 
});

const connectKafka = async () => {
  try {
    await producer.connect();
    console.log('✅ Kafka Producer Connected');
    
    await consumer.connect();
    console.log('✅ Kafka Consumer Connected');
  } catch (error) {
    console.error('❌ Kafka Connection Error:', error.message);
  }
};

const disconnectKafka = async () => {
  await producer.disconnect();
  await consumer.disconnect();
};

module.exports = {
  kafka,
  producer,
  consumer,
  connectKafka,
  disconnectKafka
};
