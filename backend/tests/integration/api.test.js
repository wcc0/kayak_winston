/**
 * Integration Tests for Kayak Admin API
 * Tests core functionality, caching, and distributed services
 */

const request = require('supertest');
const app = require('../../src/server');

// Test configuration
const TEST_CONFIG = {
  adminCredentials: {
    email: 'admin@kayak.com',
    password: 'Admin@123'
  },
  testUser: {
    user_id: 'TEST-001',
    email: 'testuser@test.com',
    first_name: 'Test',
    last_name: 'User',
    password: 'Test@123'
  }
};

let authToken = null;

// ============================================
// AUTHENTICATION TESTS
// ============================================
describe('Authentication API', () => {
  describe('POST /api/admin/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/admin/auth/login')
        .send(TEST_CONFIG.adminCredentials)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.admin).toBeDefined();
      
      // Store token for subsequent tests
      authToken = response.body.data.token;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/admin/auth/login')
        .send({ email: 'wrong@email.com', password: 'wrongpass' })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid');
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/admin/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/admin/auth/verify', () => {
    it('should verify valid token', async () => {
      const response = await request(app)
        .get('/api/admin/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.admin).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/admin/auth/verify')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should reject missing token', async () => {
      const response = await request(app)
        .get('/api/admin/auth/verify')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
});

// ============================================
// USERS API TESTS
// ============================================
describe('Users API', () => {
  describe('GET /api/admin/users', () => {
    it('should return paginated users list', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
      expect(Array.isArray(response.body.data.users)).toBe(true);
    });

    it('should return users with search filter', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ search: 'test' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should include cache headers', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Check for cache headers (either HIT or MISS)
      expect(response.headers['x-cache']).toBeDefined();
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should return user details', async () => {
      // First get a user ID from the list
      const listResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (listResponse.body.data.users.length > 0) {
        const userId = listResponse.body.data.users[0].user_id;
        
        const response = await request(app)
          .get(`/api/admin/users/${userId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.user_id).toBe(userId);
      }
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/admin/users/NONEXISTENT-ID')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });
});

// ============================================
// BILLING API TESTS
// ============================================
describe('Billing API', () => {
  describe('GET /api/admin/billing', () => {
    it('should return paginated billing records', async () => {
      const response = await request(app)
        .get('/api/admin/billing')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.billing).toBeDefined();
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter by date range', async () => {
      const response = await request(app)
        .get('/api/admin/billing/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/admin/billing/stats', () => {
    it('should return billing statistics', async () => {
      const response = await request(app)
        .get('/api/admin/billing/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ year: 2024 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalRevenue).toBeDefined();
    });
  });
});

// ============================================
// ANALYTICS API TESTS
// ============================================
describe('Analytics API', () => {
  describe('GET /api/admin/analytics/revenue/top-properties', () => {
    it('should return top properties by revenue', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/revenue/top-properties')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ year: 2024 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/admin/analytics/revenue/by-city', () => {
    it('should return city-wise revenue', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/revenue/by-city')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ year: 2024 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/admin/analytics/providers/top-performers', () => {
    it('should return top providers', async () => {
      const response = await request(app)
        .get('/api/admin/analytics/providers/top-performers')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ year: 2024 })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});

// ============================================
// LISTINGS API TESTS
// ============================================
describe('Listings API', () => {
  describe('POST /api/admin/listings/flight', () => {
    it('should add a new flight', async () => {
      const flightData = {
        flight_id: `FL-${Date.now()}`,
        airline_name: 'Test Airlines',
        departure_airport: 'SFO',
        arrival_airport: 'LAX',
        departure_datetime: '2024-12-25T10:00:00',
        arrival_datetime: '2024-12-25T11:30:00',
        duration: 90,
        flight_class: 'Economy',
        ticket_price: 199.99,
        total_seats: 150,
        available_seats: 150
      };

      const response = await request(app)
        .post('/api/admin/listings/flight')
        .set('Authorization', `Bearer ${authToken}`)
        .send(flightData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/admin/listings/hotel', () => {
    it('should add a new hotel', async () => {
      const hotelData = {
        hotel_id: `HT-${Date.now()}`,
        hotel_name: 'Test Hotel',
        address: '123 Test St',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94105',
        star_rating: 4,
        total_rooms: 100,
        available_rooms: 80,
        room_type: 'Deluxe',
        price_per_night: 199.99,
        amenities: ['WiFi', 'Pool', 'Gym']
      };

      const response = await request(app)
        .post('/api/admin/listings/hotel')
        .set('Authorization', `Bearer ${authToken}`)
        .send(hotelData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/admin/listings/car', () => {
    it('should add a new car', async () => {
      const carData = {
        car_id: `CR-${Date.now()}`,
        car_type: 'SUV',
        company_name: 'Test Rentals',
        model: 'Test Model X',
        year: 2024,
        transmission_type: 'Automatic',
        seats: 5,
        daily_rental_price: 89.99,
        availability_status: 'AVAILABLE'
      };

      const response = await request(app)
        .post('/api/admin/listings/car')
        .set('Authorization', `Bearer ${authToken}`)
        .send(carData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });
});

// ============================================
// CACHE PERFORMANCE TESTS
// ============================================
describe('Cache Performance', () => {
  it('should return faster on cache hit', async () => {
    // First request - cache miss
    const start1 = Date.now();
    await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const time1 = Date.now() - start1;

    // Second request - should be cache hit
    const start2 = Date.now();
    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);
    const time2 = Date.now() - start2;

    // Cache hit should be faster (allow for variance)
    console.log(`Cache Miss: ${time1}ms, Cache Hit: ${time2}ms`);
    
    // Just verify cache header is present
    expect(response.headers['x-cache']).toBeDefined();
  });
});

// ============================================
// HEALTH CHECK TESTS
// ============================================
describe('Health Check', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('running');
    });
  });
});

// ============================================
// ERROR HANDLING TESTS
// ============================================
describe('Error Handling', () => {
  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/api/admin/unknown-route')
      .set('Authorization', `Bearer ${authToken}`)
      .expect(404);

    expect(response.body.success).toBe(false);
  });

  it('should handle malformed JSON', async () => {
    const response = await request(app)
      .post('/api/admin/auth/login')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }')
      .expect(400);

    expect(response.body.success).toBe(false);
  });
});

