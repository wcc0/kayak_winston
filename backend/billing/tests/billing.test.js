const request = require('supertest');
const app = require('../server');

describe('Billing Service Tests', () => {
  let billing_id;
  
  // Test create billing
  test('POST /api/billing - Create billing', async () => {
    const response = await request(app)
      .post('/api/billing')
      .send({
        user_id: '123-45-6789',
        booking_type: 'flight',
        booking_id: '550e8400-e29b-41d4-a716-446655440000',
        total_amount: 500.00,
        payment_method: 'credit_card'
      });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    billing_id = response.body.data.billing_id;
  });
  
  // Test get billing
  test('GET /api/billing/:id - Get billing by ID', async () => {
    const response = await request(app)
      .get(`/api/billing/${billing_id}`);
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
  
  // Test invalid SSN
  test('POST /api/billing - Invalid SSN format', async () => {
    const response = await request(app)
      .post('/api/billing')
      .send({
        user_id: '12345',  // Invalid format
        booking_type: 'hotel',
        booking_id: '550e8400-e29b-41d4-a716-446655440000',
        total_amount: 300.00,
        payment_method: 'paypal'
      });
    
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
});