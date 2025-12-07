-- ============================================
-- KAYAK TRAVEL PLATFORM DATABASE SCHEMA
-- MySQL Initialization Script
-- Full Schema with all required fields per project requirements
-- ============================================

CREATE DATABASE IF NOT EXISTS kayak_db;
USE kayak_db;

-- ============================================
-- USERS TABLE (SSN Format User ID)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(11) PRIMARY KEY COMMENT 'SSN Format: XXX-XX-XXXX',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(2) COMMENT 'Valid US state abbreviation',
    zip_code VARCHAR(10) COMMENT 'Format: ##### or #####-####',
    profile_image VARCHAR(500),
    credit_card_last_four VARCHAR(4),
    credit_card_type VARCHAR(20),
    payment_method VARCHAR(50),
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
    role VARCHAR(100) COMMENT 'Reports and Analytics Managed',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_admins_email (email),
    INDEX idx_admins_access (access_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- VENDORS TABLE (Providers/Operators)
-- ============================================
CREATE TABLE IF NOT EXISTS vendors (
    vendor_id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_name VARCHAR(255) NOT NULL,
    service_type ENUM('FLIGHT', 'HOTEL', 'CAR') NOT NULL,
    api_endpoint VARCHAR(500),
    model_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_vendors_type (service_type),
    INDEX idx_vendors_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- FLIGHTS TABLE
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
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL,
    INDEX idx_flights_route (departure_airport, arrival_airport),
    INDEX idx_flights_date (departure_datetime),
    INDEX idx_flights_price (ticket_price),
    INDEX idx_flights_rating (flight_rating),
    INDEX idx_flights_class (flight_class)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- HOTELS TABLE
-- ============================================
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
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL,
    INDEX idx_hotels_city (city),
    INDEX idx_hotels_state (state),
    INDEX idx_hotels_star_rating (star_rating),
    INDEX idx_hotels_hotel_rating (hotel_rating),
    INDEX idx_hotels_price (price_per_night)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CARS TABLE
-- ============================================
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
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL,
    INDEX idx_cars_type (car_type),
    INDEX idx_cars_status (availability_status),
    INDEX idx_cars_price (daily_rental_price),
    INDEX idx_cars_rating (car_rating),
    INDEX idx_cars_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BOOKINGS TABLE (Past/Current/Future Trips)
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
    booking_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(11) NOT NULL COMMENT 'SSN Format',
    booking_type ENUM('FLIGHT', 'HOTEL', 'CAR') NOT NULL,
    reference_id VARCHAR(50) NOT NULL COMMENT 'Flight/Hotel/Car ID',
    provider_name VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    quantity INT DEFAULT 1 COMMENT 'Passengers/Rooms/Days',
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') DEFAULT 'PENDING',
    payment_status ENUM('PENDING', 'PAID', 'REFUNDED') DEFAULT 'PENDING',
    traveler_details JSON COMMENT 'Array of traveler info',
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_bookings_user (user_id),
    INDEX idx_bookings_type (booking_type),
    INDEX idx_bookings_status (status),
    INDEX idx_bookings_date (start_date),
    INDEX idx_bookings_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- BILLING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS billing (
    billing_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(11) NOT NULL COMMENT 'SSN Format',
    booking_type ENUM('FLIGHT', 'HOTEL', 'CAR') NOT NULL,
    booking_id VARCHAR(50) NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Date of Transaction',
    total_amount DECIMAL(10, 2) NOT NULL COMMENT 'Total Amount Paid',
    payment_method VARCHAR(50) COMMENT 'Credit Card, PayPal, etc.',
    card_last_four VARCHAR(4),
    transaction_status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
    invoice_number VARCHAR(50) UNIQUE,
    invoice_details JSON COMMENT 'Invoice / Receipt Details',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_billing_user (user_id),
    INDEX idx_billing_date (transaction_date),
    INDEX idx_billing_status (transaction_status),
    INDEX idx_billing_type (booking_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================
-- CLICK TRACKING TABLE (User/Item Tracking)
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
    user_id VARCHAR(11),
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
INSERT INTO admins (admin_id, email, password, first_name, last_name, access_level, role)
VALUES 
('ADM-001', 'superadmin@kayak.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Super', 'Admin', 'super_admin', 'Full System Access'),
('ADM-002', 'admin@kayak.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin', 'User', 'admin', 'Listing Management'),
('ADM-003', 'manager@kayak.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Manager', 'User', 'manager', 'Reports & Analytics')
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- Insert default vendors
INSERT INTO vendors (vendor_name, service_type, model_name, email) VALUES
('Delta Airlines', 'FLIGHT', 'DeltaFlights', 'delta@vendor.com'),
('United Airlines', 'FLIGHT', 'UnitedFlights', 'united@vendor.com'),
('American Airlines', 'FLIGHT', 'AmericanFlights', 'american@vendor.com'),
('Southwest Airlines', 'FLIGHT', 'SouthwestFlights', 'southwest@vendor.com'),
('JetBlue', 'FLIGHT', 'JetBlueFlights', 'jetblue@vendor.com'),
('Marriott', 'HOTEL', 'MarriottHotels', 'marriott@vendor.com'),
('Hilton', 'HOTEL', 'HiltonHotels', 'hilton@vendor.com'),
('Hyatt', 'HOTEL', 'HyattHotels', 'hyatt@vendor.com'),
('Holiday Inn', 'HOTEL', 'HolidayInnHotels', 'holidayinn@vendor.com'),
('Enterprise', 'CAR', 'EnterpriseCars', 'enterprise@vendor.com'),
('Hertz', 'CAR', 'HertzCars', 'hertz@vendor.com'),
('Avis', 'CAR', 'AvisCars', 'avis@vendor.com'),
('Budget', 'CAR', 'BudgetCars', 'budget@vendor.com')
ON DUPLICATE KEY UPDATE vendor_name = VALUES(vendor_name);

-- Insert sample user (SSN format)
INSERT INTO users (user_id, first_name, last_name, email, password, phone_number, city, state, zip_code)
VALUES 
('123-45-6789', 'John', 'Doe', 'john.doe@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '5551234567', 'San Jose', 'CA', '95123'),
('987-65-4321', 'Jane', 'Smith', 'jane.smith@email.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '5559876543', 'New York', 'NY', '10001')
ON DUPLICATE KEY UPDATE email = VALUES(email);

-- ============================================
-- GRANT PRIVILEGES
-- ============================================
CREATE USER IF NOT EXISTS 'kayak_user'@'localhost' IDENTIFIED BY 'kayak_pass_2024';
CREATE USER IF NOT EXISTS 'kayak_user'@'%' IDENTIFIED BY 'kayak_pass_2024';
GRANT ALL PRIVILEGES ON kayak_db.* TO 'kayak_user'@'localhost';
GRANT ALL PRIVILEGES ON kayak_db.* TO 'kayak_user'@'%';
FLUSH PRIVILEGES;
