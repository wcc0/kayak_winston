# Billing Service API Documentation

## Base URL
```
http://localhost:8086/api
```

## Endpoints

### 1. Create Billing
**POST** `/billing`

Create a new billing record.

**Request Body:**
```json
{
  "user_id": "123-45-6789",
  "booking_type": "flight",
  "booking_id": "uuid",
  "total_amount": 500.00,
  "payment_method": "credit_card"
}
```

**Response:** (201 Created)
```json
{
  "success": true,
  "message": "Billing created successfully",
  "data": {
    "billing_id": "uuid",
    "user_id": "123-45-6789",
    "booking_type": "flight",
    "total_amount": 500.00,
    "transaction_status": "pending"
  }
}
```

### 2. Get Billing by ID
**GET** `/billing/:billing_id`

Retrieve billing details.

**Response:** (200 OK)
```json
{
  "success": true,
  "data": { ... }
}
```

### 3. Get User Billings
**GET** `/user/:user_id/billings`

Get all billings for a user.

**Response:** (200 OK)
```json
{
  "success": true,
  "count": 5,
  "data": [ ... ]
}
```

### 4. Process Payment
**POST** `/payment/process`

Process payment for a billing.

**Request Body:**
```json
{
  "billing_id": "uuid",
  "payment_details": {
    "amount": 500.00,
    "payment_method": "credit_card",
    "card_details": {
      "number": "4111111111111111",
      "expiry": "12/25",
      "cvv": "123",
      "holder_name": "John Doe"
    }
  }
}
```

### 5. Search Billings (Admin)
**GET** `/admin/billings/search?start_date=2025-01-01&end_date=2025-12-31`

Search billings with filters.

### 6. Get Billing Statistics (Admin)
**GET** `/admin/billings/stats`

###Get billing statistics for analytics.

###Billing Endpoints
POST   /billing                   - Create billing
GET    /billing/:billing_id       - Get billing by ID
GET    /user/:user_id/billings    - Get all billings for a user
PUT    /billing/:billing_id       - Update billing
DELETE /billing/:billing_id       - Delete billing

###Payment Endpoints
POST   /payment/process           - Process payment

###Invoice Endpoints
POST   /invoice/:billing_id       - Create invoice
GET    /invoice/:billing_id       - Get invoice by billing ID

###Admin Endpoints
GET    /admin/billings/search     - Search billings
GET    /admin/billings/stats      - Billing statistics
