-- MySQL schema for bookings, billing, users, deals
CREATE DATABASE IF NOT EXISTS kayak_admin;
USE kayak_admin;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(64) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id VARCHAR(64) UNIQUE,
  user_id VARCHAR(64),
  booking_type VARCHAR(32),
  booking_ref VARCHAR(128),
  start_date DATE,
  end_date DATE,
  status VARCHAR(32),
  total_amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing (
  id INT AUTO_INCREMENT PRIMARY KEY,
  billing_id VARCHAR(64) UNIQUE,
  user_id VARCHAR(64),
  booking_id VARCHAR(64),
  booking_type VARCHAR(32),
  transaction_date TIMESTAMP,
  total_amount DECIMAL(10,2),
  payment_method VARCHAR(32),
  transaction_status VARCHAR(32),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deals_normalized (
  id INT AUTO_INCREMENT PRIMARY KEY,
  listing_id VARCHAR(128),
  date DATE,
  price DECIMAL(10,2),
  availability INT,
  amenities TEXT,
  tags TEXT,
  neighbourhood VARCHAR(255),
  source VARCHAR(128),
  raw_payload JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deals_listing_date ON deals_normalized(listing_id, date);

-- AI chat sessions and messages for Concierge UI
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id VARCHAR(128) UNIQUE,
  title VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chat_id VARCHAR(128),
  role VARCHAR(32),
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (chat_id)
);

-- ============================================
-- FLIGHTS / HOTELS / CARS LISTINGS TABLES
-- Full schema from kayak-platform integration
-- ============================================

CREATE TABLE IF NOT EXISTS flights (
    flight_id VARCHAR(50) PRIMARY KEY COMMENT 'e.g., AA123',
    vendor_id INT,
    airline_name VARCHAR(255) NOT NULL COMMENT 'Airline / Operator Name',
    operator_name VARCHAR(255),
    departure_airport VARCHAR(10) NOT NULL,
    arrival_airport VARCHAR(10) NOT NULL,
    departure_datetime DATETIME NOT NULL,
    arrival_datetime DATETIME NOT NULL,
    duration INT COMMENT 'Duration in minutes',
    flight_class ENUM('Economy', 'Premium Economy', 'Business', 'First') DEFAULT 'Economy',
    ticket_price DECIMAL(10, 2) NOT NULL,
    total_seats INT DEFAULT 150 COMMENT 'Total Available Seats',
    available_seats INT DEFAULT 150,
    flight_rating DECIMAL(2, 1) DEFAULT 0.0 COMMENT 'Average rating 0-5',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_flights_route (departure_airport, arrival_airport),
    INDEX idx_flights_date (departure_datetime),
    INDEX idx_flights_price (ticket_price),
    INDEX idx_flights_rating (flight_rating),
    INDEX idx_flights_class (flight_class)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS hotels (
    hotel_id VARCHAR(50) PRIMARY KEY,
    vendor_id INT,
    hotel_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL COMMENT 'Valid US state abbreviation',
    zip_code VARCHAR(10) COMMENT 'Format: ##### or #####-####',
    star_rating TINYINT DEFAULT 3 COMMENT '1-5 stars',
    hotel_rating DECIMAL(2, 1) DEFAULT 0.0 COMMENT 'Guest rating 0-5',
    total_rooms INT DEFAULT 100 COMMENT 'Number of Rooms',
    available_rooms INT DEFAULT 100,
    room_type VARCHAR(50) DEFAULT 'Standard' COMMENT 'Single, Double, Suite, etc.',
    price_per_night DECIMAL(10, 2) NOT NULL,
    amenities JSON COMMENT 'e.g., Wi-Fi, Breakfast, Parking',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_hotels_city (city),
    INDEX idx_hotels_state (state),
    INDEX idx_hotels_star_rating (star_rating),
    INDEX idx_hotels_hotel_rating (hotel_rating),
    INDEX idx_hotels_price (price_per_night)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS cars (
    car_id VARCHAR(50) PRIMARY KEY,
    vendor_id INT,
    car_type VARCHAR(50) NOT NULL COMMENT 'SUV, Sedan, Compact, etc.',
    company_name VARCHAR(255) NOT NULL COMMENT 'Company / Provider Name',
    provider_name VARCHAR(255),
    model VARCHAR(100) NOT NULL COMMENT 'Model and Year',
    year INT,
    transmission_type ENUM('Automatic', 'Manual') DEFAULT 'Automatic',
    seats INT DEFAULT 5 COMMENT 'Number of Seats',
    daily_rental_price DECIMAL(10, 2) NOT NULL,
    car_rating DECIMAL(2, 1) DEFAULT 0.0 COMMENT 'Customer rating 0-5',
    availability_status ENUM('AVAILABLE', 'RENTED', 'MAINTENANCE') DEFAULT 'AVAILABLE',
    pickup_location VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_cars_type (car_type),
    INDEX idx_cars_status (availability_status),
    INDEX idx_cars_price (daily_rental_price),
    INDEX idx_cars_rating (car_rating),
    INDEX idx_cars_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
