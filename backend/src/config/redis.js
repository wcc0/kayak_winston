const redis = require('redis');
require('dotenv').config();

// Redis Client Configuration  
// Support both URL and host/port configurations
let redisClient = null;

const getRedisUrl = () => {
  const url = process.env.REDIS_URL 
    || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
  console.log('🔍 Redis Configuration:');
  console.log('  REDIS_URL env:', process.env.REDIS_URL);
  console.log('  REDIS_HOST env:', process.env.REDIS_HOST);
  console.log('  REDIS_PORT env:', process.env.REDIS_PORT);
  console.log('  Final redisUrl:', url);
  return url;
};

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = redis.createClient({
      url: getRedisUrl(),
      legacyMode: false
    });

    // Error handling
    redisClient.on('error', (err) => {
      console.error('❌ Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis Connected Successfully');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis Client Ready');
    });
  }
  return redisClient;
};

// Connect to Redis
const connectRedis = async () => {
  try {
    const client = getRedisClient();
    await client.connect();
  } catch (error) {
    console.error('❌ Redis Connection Error:', error.message);
  }
};

// Cache helper functions
const cacheHelper = {
  get: async (key) => {
    try {
      const client = getRedisClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  },

  set: async (key, value, expirationInSeconds = 300) => {
    try {
      const client = getRedisClient();
      await client.setEx(key, expirationInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  },

  del: async (key) => {
    try {
      const client = getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error);
      return false;
    }
  },

  delPattern: async (pattern) => {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Redis DEL PATTERN error:', error);
      return false;
    }
  }
};

module.exports = {
  redisClient: null,  // Will be initialized on first use
  getRedisClient,
  connectRedis,
  cacheHelper
};
