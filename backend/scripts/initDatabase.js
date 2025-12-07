const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
require('dotenv').config();

async function initMySQL() {
  console.log('Initializing MySQL database...');
  
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '1234'
  });

  // Create database
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.MYSQL_DATABASE || 'kayak_admin'}`);
  await connection.query(`USE ${process.env.MYSQL_DATABASE || 'kayak_admin'}`);

  // Create admins table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS admins (
      admin_id VARCHAR(11) PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      phone_number VARCHAR(20),
      address VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(2),
      zip_code VARCHAR(10),
      role VARCHAR(50) DEFAULT 'admin',
      access_level ENUM('super_admin', 'admin', 'manager') DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login TIMESTAMP NULL,
      is_active BOOLEAN DEFAULT true,
      INDEX idx_email (email),
      INDEX idx_access_level (access_level)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Create users table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id VARCHAR(11) PRIMARY KEY,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone_number VARCHAR(20),
      address VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(2),
      zip_code VARCHAR(10),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT true,
      INDEX idx_email (email),
      INDEX idx_city_state (city, state)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Create flights table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS flights (
      flight_id VARCHAR(20) PRIMARY KEY,
      airline_name VARCHAR(100) NOT NULL,
      departure_airport VARCHAR(10) NOT NULL,
      arrival_airport VARCHAR(10) NOT NULL,
      departure_datetime DATETIME NOT NULL,
      arrival_datetime DATETIME NOT NULL,
      duration INT NOT NULL,
      flight_class ENUM('Economy', 'Business', 'First') NOT NULL,
      ticket_price DECIMAL(10, 2) NOT NULL,
      total_seats INT NOT NULL,
      available_seats INT NOT NULL,
      rating DECIMAL(3, 2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_route (departure_airport, arrival_airport),
      INDEX idx_departure (departure_datetime)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Create hotels table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS hotels (
      hotel_id VARCHAR(20) PRIMARY KEY,
      hotel_name VARCHAR(200) NOT NULL,
      address VARCHAR(255) NOT NULL,
      city VARCHAR(100) NOT NULL,
      state VARCHAR(2) NOT NULL,
      zip_code VARCHAR(10) NOT NULL,
      star_rating INT CHECK (star_rating BETWEEN 1 AND 5),
      total_rooms INT NOT NULL,
      available_rooms INT NOT NULL,
      room_type VARCHAR(50),
      price_per_night DECIMAL(10, 2) NOT NULL,
      amenities JSON,
      rating DECIMAL(3, 2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_location (city, state),
      INDEX idx_star_rating (star_rating)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Create cars table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS cars (
      car_id VARCHAR(20) PRIMARY KEY,
      car_type VARCHAR(50) NOT NULL,
      company_name VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      year INT NOT NULL,
      transmission_type ENUM('Automatic', 'Manual') NOT NULL,
      seats INT NOT NULL,
      daily_rental_price DECIMAL(10, 2) NOT NULL,
      availability_status ENUM('AVAILABLE', 'RENTED', 'MAINTENANCE') DEFAULT 'AVAILABLE',
      rating DECIMAL(3, 2) DEFAULT 0.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_car_type (car_type),
      INDEX idx_company (company_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Create billing table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS billing (
      billing_id VARCHAR(50) PRIMARY KEY,
      user_id VARCHAR(11) NOT NULL,
      booking_type ENUM('FLIGHT', 'HOTEL', 'CAR') NOT NULL,
      booking_id VARCHAR(50) NOT NULL,
      transaction_date DATETIME NOT NULL,
      total_amount DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50),
      transaction_status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
      invoice_details JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user (user_id),
      INDEX idx_booking (booking_type, booking_id),
      INDEX idx_transaction_date (transaction_date),
      INDEX idx_status (transaction_status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  console.log('✅ MySQL tables created successfully');
  await connection.end();
}

async function initMongoDB() {
  console.log('Initializing MongoDB database...');
  
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kayak_admin');
  
  // Collections will be created automatically when models are used
  console.log('✅ MongoDB connected successfully');
  
  await mongoose.disconnect();
}

async function initialize() {
  try {
    await initMySQL();
    await initMongoDB();
    console.log('\n🎉 Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initialize();
