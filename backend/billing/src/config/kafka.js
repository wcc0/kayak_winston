const { Kafka } = require('kafkajs');
require('dotenv').config();

const kafka = new Kafka({
  clientId: 'billing-service',
  brokers: [process.env.KAFKA_BROKER]
});

const producer = kafka.producer();
const consumer = kafka.consumer({ 
  groupId: process.env.KAFKA_GROUP_ID 
});

module.exports = { kafka, producer, consumer };