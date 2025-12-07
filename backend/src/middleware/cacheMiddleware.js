/**
 * Redis Caching Middleware
 * Provides automatic caching for API responses with performance tracking
 */

const { cacheHelper, getRedisClient } = require('../config/redis');

// Performance metrics storage
const metrics = {
  hits: 0,
  misses: 0,
  totalRequests: 0,
  avgResponseTimeWithCache: [],
  avgResponseTimeWithoutCache: [],
  startTime: Date.now()
};

/**
 * Generate cache key from request
 */
const generateCacheKey = (req, prefix = 'api') => {
  const userId = req.user?.admin_id || 'anonymous';
  const queryString = JSON.stringify(req.query);
  const baseKey = `${prefix}:${req.method}:${req.originalUrl}`;
  return `${baseKey}:${queryString}:${userId}`;
};

/**
 * Cache middleware factory
 * @param {Object} options - Configuration options
 * @param {number} options.ttl - Time to live in seconds (default: 300)
 * @param {string} options.prefix - Cache key prefix
 * @param {boolean} options.trackMetrics - Whether to track performance metrics
 */
const cacheMiddleware = (options = {}) => {
  const { ttl = 300, prefix = 'api', trackMetrics = true } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const startTime = Date.now();
    const cacheKey = generateCacheKey(req, prefix);

    if (trackMetrics) {
      metrics.totalRequests++;
    }

    try {
      // Try to get cached response
      const cachedData = await cacheHelper.get(cacheKey);

      if (cachedData) {
        // Cache HIT
        const responseTime = Date.now() - startTime;
        
        if (trackMetrics) {
          metrics.hits++;
          metrics.avgResponseTimeWithCache.push(responseTime);
        }

        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Response-Time': `${responseTime}ms`
        });

        return res.json(cachedData);
      }

      // Cache MISS - proceed with request and cache response
      if (trackMetrics) {
        metrics.misses++;
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = async (data) => {
        const responseTime = Date.now() - startTime;

        if (trackMetrics) {
          metrics.avgResponseTimeWithoutCache.push(responseTime);
        }

        // Cache successful responses only
        if (res.statusCode >= 200 && res.statusCode < 300) {
          await cacheHelper.set(cacheKey, data, ttl);
        }

        // Add cache headers
        res.set({
          'X-Cache': 'MISS',
          'X-Cache-Key': cacheKey,
          'X-Response-Time': `${responseTime}ms`
        });

        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

/**
 * Invalidate cache for specific patterns
 */
const invalidateCache = async (patterns) => {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];
  
  for (const pattern of patternArray) {
    await cacheHelper.delPattern(pattern);
  }
};

/**
 * Get cache performance metrics
 */
const getCacheMetrics = () => {
  const hitRate = metrics.totalRequests > 0 
    ? ((metrics.hits / metrics.totalRequests) * 100).toFixed(2) 
    : 0;

  const avgCacheHitTime = metrics.avgResponseTimeWithCache.length > 0
    ? (metrics.avgResponseTimeWithCache.reduce((a, b) => a + b, 0) / metrics.avgResponseTimeWithCache.length).toFixed(2)
    : 0;

  const avgCacheMissTime = metrics.avgResponseTimeWithoutCache.length > 0
    ? (metrics.avgResponseTimeWithoutCache.reduce((a, b) => a + b, 0) / metrics.avgResponseTimeWithoutCache.length).toFixed(2)
    : 0;

  const timeSaved = avgCacheMissTime - avgCacheHitTime;
  const uptimeSeconds = (Date.now() - metrics.startTime) / 1000;

  return {
    totalRequests: metrics.totalRequests,
    cacheHits: metrics.hits,
    cacheMisses: metrics.misses,
    hitRate: `${hitRate}%`,
    avgResponseTimeWithCache: `${avgCacheHitTime}ms`,
    avgResponseTimeWithoutCache: `${avgCacheMissTime}ms`,
    timeSavedPerRequest: `${timeSaved.toFixed(2)}ms`,
    performanceImprovement: avgCacheMissTime > 0 
      ? `${((timeSaved / avgCacheMissTime) * 100).toFixed(2)}%` 
      : '0%',
    uptimeSeconds: uptimeSeconds.toFixed(0)
  };
};

/**
 * Reset cache metrics
 */
const resetCacheMetrics = () => {
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.totalRequests = 0;
  metrics.avgResponseTimeWithCache = [];
  metrics.avgResponseTimeWithoutCache = [];
  metrics.startTime = Date.now();
};

/**
 * Cache warming - pre-populate cache with frequently accessed data
 */
const warmCache = async (warmupFunctions) => {
  console.log('🔥 Starting cache warmup...');
  const results = [];

  for (const warmup of warmupFunctions) {
    try {
      const startTime = Date.now();
      const { key, data, ttl } = await warmup();
      await cacheHelper.set(key, data, ttl || 3600);
      results.push({
        key,
        status: 'success',
        timeMs: Date.now() - startTime
      });
    } catch (error) {
      results.push({
        key: warmup.name || 'unknown',
        status: 'error',
        error: error.message
      });
    }
  }

  console.log('✅ Cache warmup complete:', results);
  return results;
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  getCacheMetrics,
  resetCacheMetrics,
  warmCache,
  generateCacheKey
};

