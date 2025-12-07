# Kayak Admin Service API Documentation

Base URL: `http://localhost:5001/api/admin`

## Authentication
All endpoints except /auth/login require JWT token.

## Auth Endpoints
- POST /auth/login - Admin login
- POST /auth/logout - Admin logout  
- GET /auth/verify - Verify token

## Listings Endpoints
- POST /listings/flight - Add flight
- POST /listings/hotel - Add hotel
- POST /listings/car - Add car
- GET /listings/search - Search listings

## Users Endpoints
- GET /users - Get all users
- GET /users/:id - Get user by ID
- PUT /users/:id - Update user
- DELETE /users/:id - Delete user

## Billing Endpoints
- GET /billing - Get all billing
- GET /billing/:id - Get billing by ID
- GET /billing/search - Search by date
- GET /billing/stats - Get statistics

## Analytics Endpoints
- GET /analytics/revenue/top-properties - Top 10 properties
- GET /analytics/revenue/by-city - City-wise revenue
- GET /analytics/providers/top-performers - Top providers
- GET /analytics/page-clicks - Page clicks
- GET /analytics/listing-clicks - Listing clicks
- GET /analytics/user-tracking - User tracking
