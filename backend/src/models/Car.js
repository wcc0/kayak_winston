/**
 * Car Model - MySQL + MongoDB hybrid
 * Core data in MySQL, reviews/images in MongoDB
 */
const { mysqlPool } = require('../config/database');
const mongoose = require('mongoose');

// MongoDB Schema for car images and detailed info
const carDetailsSchema = new mongoose.Schema({
  car_id: { type: String, required: true, unique: true },
  images: [{
    url: String,
    type: { type: String, enum: ['exterior', 'interior', 'trunk', 'features'] },
    caption: String
  }],
  company_logo: String,
  features: {
    air_conditioning: { type: Boolean, default: true },
    bluetooth: { type: Boolean, default: false },
    gps: { type: Boolean, default: false },
    usb_charger: { type: Boolean, default: false },
    child_seat: { available: Boolean, price: Number },
    additional_driver: { available: Boolean, price: Number }
  },
  insurance_options: [{
    type: String,
    name: String,
    price_per_day: Number,
    coverage: String
  }],
  pickup_locations: [{
    address: String,
    city: String,
    state: String,
    hours: String
  }],
  average_rating: { type: Number, default: 0 },
  total_reviews: { type: Number, default: 0 }
}, { collection: 'car_details', timestamps: true });

const CarDetails = mongoose.model('CarDetails', carDetailsSchema);

class Car {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS cars (
        car_id VARCHAR(50) PRIMARY KEY,
        car_type VARCHAR(50) NOT NULL,
        company_name VARCHAR(255) NOT NULL,
        provider_name VARCHAR(255),
        model VARCHAR(100) NOT NULL,
        year INT,
        transmission_type ENUM('Automatic', 'Manual') DEFAULT 'Automatic',
        seats INT DEFAULT 5,
        daily_rental_price DECIMAL(10, 2) NOT NULL,
        car_rating DECIMAL(2, 1) DEFAULT 0.0,
        availability_status ENUM('AVAILABLE', 'RENTED', 'MAINTENANCE') DEFAULT 'AVAILABLE',
        pickup_location VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(2),
        vendor_id INT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_type (car_type),
        INDEX idx_status (availability_status),
        INDEX idx_price (daily_rental_price),
        INDEX idx_rating (car_rating),
        INDEX idx_city (city),
        FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await mysqlPool.execute(query);
  }

  static async create(carData) {
    const query = `
      INSERT INTO cars (
        car_id, car_type, company_name, provider_name, model, year,
        transmission_type, seats, daily_rental_price, pickup_location,
        city, state, vendor_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await mysqlPool.execute(query, [
      carData.car_id,
      carData.car_type,
      carData.company_name,
      carData.provider_name || carData.company_name,
      carData.model,
      carData.year || new Date().getFullYear(),
      carData.transmission_type || 'Automatic',
      carData.seats || 5,
      carData.daily_rental_price,
      carData.pickup_location,
      carData.city,
      carData.state?.toUpperCase(),
      carData.vendor_id || null
    ]);

    // Create MongoDB details document
    await CarDetails.create({
      car_id: carData.car_id,
      images: carData.images || [],
      company_logo: carData.company_logo,
      features: carData.features || {}
    });

    return result;
  }

  static async findById(carId) {
    const query = 'SELECT * FROM cars WHERE car_id = ? AND is_active = true';
    const [rows] = await mysqlPool.execute(query, [carId]);
    if (rows[0]) {
      const details = await CarDetails.findOne({ car_id: carId });
      return { ...rows[0], details };
    }
    return null;
  }

  static async search(filters = {}) {
    let query = 'SELECT * FROM cars WHERE is_active = true AND availability_status = "AVAILABLE"';
    const params = [];

    if (filters.car_type) {
      query += ' AND car_type = ?';
      params.push(filters.car_type);
    }
    if (filters.city) {
      query += ' AND city = ?';
      params.push(filters.city);
    }
    if (filters.min_price) {
      query += ' AND daily_rental_price >= ?';
      params.push(filters.min_price);
    }
    if (filters.max_price) {
      query += ' AND daily_rental_price <= ?';
      params.push(filters.max_price);
    }
    if (filters.transmission) {
      query += ' AND transmission_type = ?';
      params.push(filters.transmission);
    }
    if (filters.min_seats) {
      query += ' AND seats >= ?';
      params.push(filters.min_seats);
    }

    const sortField = filters.sort_by || 'daily_rental_price';
    const sortOrder = filters.sort_order || 'ASC';
    query += ` ORDER BY ${sortField} ${sortOrder}`;
    query += ' LIMIT 100';

    const [rows] = await mysqlPool.execute(query, params);
    return rows;
  }

  static async updateRating(carId, newRating, totalReviews) {
    const query = 'UPDATE cars SET car_rating = ? WHERE car_id = ?';
    await mysqlPool.execute(query, [newRating, carId]);
    
    await CarDetails.updateOne(
      { car_id: carId },
      { average_rating: newRating, total_reviews: totalReviews }
    );
  }

  static async updateStatus(carId, status) {
    if (!['AVAILABLE', 'RENTED', 'MAINTENANCE'].includes(status)) {
      throw new Error('Invalid car status');
    }
    const query = 'UPDATE cars SET availability_status = ? WHERE car_id = ?';
    await mysqlPool.execute(query, [status, carId]);
  }

  static async rent(carId) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [rows] = await connection.execute(
        'SELECT availability_status FROM cars WHERE car_id = ? FOR UPDATE',
        [carId]
      );
      
      if (!rows[0] || rows[0].availability_status !== 'AVAILABLE') {
        throw new Error('Car is not available for rental');
      }
      
      await connection.execute(
        'UPDATE cars SET availability_status = "RENTED" WHERE car_id = ?',
        [carId]
      );
      
      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async returnCar(carId) {
    const query = 'UPDATE cars SET availability_status = "AVAILABLE" WHERE car_id = ?';
    await mysqlPool.execute(query, [carId]);
  }
}

module.exports = { Car, CarDetails };
