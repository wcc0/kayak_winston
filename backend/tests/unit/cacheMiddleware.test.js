/**
 * Unit Tests for Cache Middleware
 */

const {
  generateCacheKey,
  getCacheMetrics,
  resetCacheMetrics
} = require('../../src/middleware/cacheMiddleware');

describe('Cache Middleware', () => {
  beforeEach(() => {
    resetCacheMetrics();
  });

  describe('generateCacheKey', () => {
    it('should generate unique key for different URLs', () => {
      const req1 = {
        method: 'GET',
        originalUrl: '/api/users',
        query: {},
        user: { admin_id: 'admin1' }
      };

      const req2 = {
        method: 'GET',
        originalUrl: '/api/billing',
        query: {},
        user: { admin_id: 'admin1' }
      };

      const key1 = generateCacheKey(req1);
      const key2 = generateCacheKey(req2);

      expect(key1).not.toBe(key2);
    });

    it('should generate same key for identical requests', () => {
      const req1 = {
        method: 'GET',
        originalUrl: '/api/users',
        query: { page: '1' },
        user: { admin_id: 'admin1' }
      };

      const req2 = {
        method: 'GET',
        originalUrl: '/api/users',
        query: { page: '1' },
        user: { admin_id: 'admin1' }
      };

      const key1 = generateCacheKey(req1);
      const key2 = generateCacheKey(req2);

      expect(key1).toBe(key2);
    });

    it('should include query params in key', () => {
      const req1 = {
        method: 'GET',
        originalUrl: '/api/users',
        query: { page: '1' },
        user: { admin_id: 'admin1' }
      };

      const req2 = {
        method: 'GET',
        originalUrl: '/api/users',
        query: { page: '2' },
        user: { admin_id: 'admin1' }
      };

      const key1 = generateCacheKey(req1);
      const key2 = generateCacheKey(req2);

      expect(key1).not.toBe(key2);
    });

    it('should differentiate by user', () => {
      const req1 = {
        method: 'GET',
        originalUrl: '/api/users',
        query: {},
        user: { admin_id: 'admin1' }
      };

      const req2 = {
        method: 'GET',
        originalUrl: '/api/users',
        query: {},
        user: { admin_id: 'admin2' }
      };

      const key1 = generateCacheKey(req1);
      const key2 = generateCacheKey(req2);

      expect(key1).not.toBe(key2);
    });

    it('should handle anonymous users', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/public',
        query: {}
      };

      const key = generateCacheKey(req);
      expect(key).toContain('anonymous');
    });

    it('should use custom prefix', () => {
      const req = {
        method: 'GET',
        originalUrl: '/api/users',
        query: {},
        user: { admin_id: 'admin1' }
      };

      const key = generateCacheKey(req, 'custom');
      expect(key).toContain('custom');
    });
  });

  describe('getCacheMetrics', () => {
    it('should return initial metrics', () => {
      const metrics = getCacheMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
      expect(metrics.hitRate).toBe('0%');
    });

    it('should return all required fields', () => {
      const metrics = getCacheMetrics();

      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('cacheHits');
      expect(metrics).toHaveProperty('cacheMisses');
      expect(metrics).toHaveProperty('hitRate');
      expect(metrics).toHaveProperty('avgResponseTimeWithCache');
      expect(metrics).toHaveProperty('avgResponseTimeWithoutCache');
      expect(metrics).toHaveProperty('timeSavedPerRequest');
      expect(metrics).toHaveProperty('performanceImprovement');
      expect(metrics).toHaveProperty('uptimeSeconds');
    });
  });

  describe('resetCacheMetrics', () => {
    it('should reset all metrics to zero', () => {
      // Get metrics and verify reset
      resetCacheMetrics();
      const metrics = getCacheMetrics();

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.cacheHits).toBe(0);
      expect(metrics.cacheMisses).toBe(0);
    });
  });
});

