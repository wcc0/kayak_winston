-- ============================================
-- KAYAK TRAVEL PLATFORM DATABASE SCHEMA
-- MySQL Initialization Script
-- ============================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS kayak_db;
USE kayak_db;

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(20) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_users_email (email),
    INDEX idx_users_active (is_active),
    INDEX idx_users_city_state (city, state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- ADMINS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS admins (
    admin_id VARCHAR(20) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    access_level ENUM('admin', 'manager', 'super_admin') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_admins_email (email),
    INDEX idx_admins_access (access_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- VENDORS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
    vendor_id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_name VARCHAR(255) NOT NULL,
    service_type ENUM('FLIGHT', 'HOTEL', 'CAR') NOT NULL,
    api_endpoint VARCHAR(500),
    model_name VARCHAR(100),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_vendors_type (service_type),
    INDEX idx_vendors_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- FLIGHTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS flights (
    flight_id VARCHAR(50) PRIMARY KEY,
    vendor_id INT,
    airline_name VARCHAR(255) NOT NULL,
    departure_airport VARCHAR(10) NOT NULL,
    arrival_airport VARCHAR(10) NOT NULL,
    departure_datetime DATETIME NOT NULL,
    arrival_datetime DATETIME NOT NULL,
    duration INT,
    flight_class ENUM('Economy', 'Business', 'First') DEFAULT 'Economy',
    ticket_price DECIMAL(10, 2) NOT NULL,
    total_seats INT DEFAULT 150,
    available_seats INT DEFAULT 150,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    INDEX idx_flights_route (departure_airport, arrival_airport),
    INDEX idx_flights_date (departure_datetime),
    INDEX idx_flights_vendor (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- HOTELS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS hotels (
    hotel_id VARCHAR(50) PRIMARY KEY,
    vendor_id INT,
    hotel_name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50),
    zip_code VARCHAR(20),
    star_rating TINYINT DEFAULT 3,
    total_rooms INT DEFAULT 100,
    available_rooms INT DEFAULT 100,
    room_type VARCHAR(50),
    price_per_night DECIMAL(10, 2) NOT NULL,
    amenities JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    INDEX idx_hotels_city (city),
    INDEX idx_hotels_rating (star_rating),
    INDEX idx_hotels_vendor (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CARS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS cars (
    car_id VARCHAR(50) PRIMARY KEY,
    vendor_id INT,
    car_type VARCHAR(50) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    model VARCHAR(100),
    year INT,
    transmission_type ENUM('Automatic', 'Manual') DEFAULT 'Automatic',
    seats INT DEFAULT 5,
    daily_rental_price DECIMAL(10, 2) NOT NULL,
    availability_status ENUM('AVAILABLE', 'RENTED', 'MAINTENANCE') DEFAULT 'AVAILABLE',
    pickup_location VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id),
    INDEX idx_cars_type (car_type),
    INDEX idx_cars_status (availability_status),
    INDEX idx_cars_vendor (vendor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BILLING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS billing (
    billing_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    booking_id VARCHAR(50),
    booking_type ENUM('FLIGHT', 'HOTEL', 'CAR') NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    transaction_status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_billing_user (user_id),
    INDEX idx_billing_date (transaction_date),
    INDEX idx_billing_status (transaction_status),
    INDEX idx_billing_type (booking_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
    booking_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    booking_type ENUM('FLIGHT', 'HOTEL', 'CAR') NOT NULL,
    reference_id VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    quantity INT DEFAULT 1,
    total_price DECIMAL(10, 2) NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_bookings_user (user_id),
    INDEX idx_bookings_type (booking_type),
    INDEX idx_bookings_status (status),
    INDEX idx_bookings_date (start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CLICK TRACKING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS click_tracker (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    event_time DATETIME,
    event_name VARCHAR(255),
    page_id VARCHAR(255),
    button_id VARCHAR(255),
    object_id VARCHAR(255),
    page_nav TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_click_user (user_id),
    INDEX idx_click_session (session_id),
    INDEX idx_click_time (event_time),
    INDEX idx_click_page (page_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- SEARCH HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS search_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20),
    search_type ENUM('FLIGHT', 'HOTEL', 'CAR') NOT NULL,
    source_city VARCHAR(100),
    destination_city VARCHAR(100),
    start_date DATE,
    end_date DATE,
    passengers INT DEFAULT 1,
    search_params JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_search_user (user_id),
    INDEX idx_search_type (search_type),
    INDEX idx_search_date (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert default super admin (password: Admin@123)
INSERT INTO admins (admin_id, email, password, first_name, last_name, access_level)
VALUES 
('ADM-001', 'superadmin@kayak.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super', 'Admin', 'super_admin'),
('ADM-002', 'admin@kayak.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin')
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Insert default vendors
INSERT INTO vendors (vendor_name, service_type, model_name, email) VALUES
('Delta Airlines', 'FLIGHT', 'DeltaFlights', 'delta@vendor.com'),
('United Airlines', 'FLIGHT', 'UnitedFlights', 'united@vendor.com'),
('American Airlines', 'FLIGHT', 'AmericanFlights', 'american@vendor.com'),
('Marriott', 'HOTEL', 'MarriottHotels', 'marriott@vendor.com'),
('Hilton', 'HOTEL', 'HiltonHotels', 'hilton@vendor.com'),
('Hyatt', 'HOTEL', 'HyattHotels', 'hyatt@vendor.com'),
('Enterprise', 'CAR', 'EnterpriseCars', 'enterprise@vendor.com'),
('Hertz', 'CAR', 'HertzCars', 'hertz@vendor.com'),
('Avis', 'CAR', 'AvisCars', 'avis@vendor.com')
ON DUPLICATE KEY UPDATE vendor_name = VALUES(vendor_name);

-- ============================================
-- GRANT PRIVILEGES
-- ============================================
GRANT ALL PRIVILEGES ON kayak_db.* TO 'kayak_user'@'%';
FLUSH PRIVILEGES;

