/**
 * Flight Model - MySQL + MongoDB hybrid
 * Core data in MySQL, reviews/images in MongoDB
 */
const { mysqlPool } = require('../config/database');
const mongoose = require('mongoose');

// MongoDB Schema for flight images and detailed info
const flightDetailsSchema = new mongoose.Schema({
  flight_id: { type: String, required: true, unique: true },
  images: [{
    url: String,
    type: { type: String, enum: ['aircraft', 'cabin', 'meal', 'seat'] },
    caption: String
  }],
  airline_logo: String,
  aircraft_type: String,
  baggage_info: {
    carry_on: { allowed: Boolean, weight_limit: Number },
    checked: { allowed: Boolean, weight_limit: Number, price: Number }
  },
  meal_info: {
    included: Boolean,
    options: [String]
  },
  entertainment: {
    wifi: Boolean,
    screens: Boolean,
    power_outlets: Boolean
  },
  average_rating: { type: Number, default: 0 },
  total_reviews: { type: Number, default: 0 }
}, { collection: 'flight_details', timestamps: true });

const FlightDetails = mongoose.model('FlightDetails', flightDetailsSchema);

class Flight {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS flights (
        flight_id VARCHAR(50) PRIMARY KEY,
        airline_name VARCHAR(255) NOT NULL,
        operator_name VARCHAR(255),
        departure_airport VARCHAR(10) NOT NULL,
        arrival_airport VARCHAR(10) NOT NULL,
        departure_datetime DATETIME NOT NULL,
        arrival_datetime DATETIME NOT NULL,
        duration INT COMMENT 'Duration in minutes',
        flight_class ENUM('Economy', 'Premium Economy', 'Business', 'First') DEFAULT 'Economy',
        ticket_price DECIMAL(10, 2) NOT NULL,
        total_seats INT DEFAULT 150,
        available_seats INT DEFAULT 150,
        flight_rating DECIMAL(2, 1) DEFAULT 0.0,
        vendor_id INT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_route (departure_airport, arrival_airport),
        INDEX idx_date (departure_datetime),
        INDEX idx_price (ticket_price),
        INDEX idx_rating (flight_rating),
        INDEX idx_class (flight_class),
        FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await mysqlPool.execute(query);
  }

  static async create(flightData) {
    const query = `
      INSERT INTO flights (
        flight_id, airline_name, operator_name, departure_airport, arrival_airport,
        departure_datetime, arrival_datetime, duration, flight_class,
        ticket_price, total_seats, available_seats, vendor_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await mysqlPool.execute(query, [
      flightData.flight_id,
      flightData.airline_name,
      flightData.operator_name || flightData.airline_name,
      flightData.departure_airport,
      flightData.arrival_airport,
      flightData.departure_datetime,
      flightData.arrival_datetime,
      flightData.duration || null,
      flightData.flight_class || 'Economy',
      flightData.ticket_price,
      flightData.total_seats || 150,
      flightData.available_seats || flightData.total_seats || 150,
      flightData.vendor_id || null
    ]);

    // Create MongoDB details document
    await FlightDetails.create({
      flight_id: flightData.flight_id,
      airline_logo: flightData.airline_logo,
      images: flightData.images || [],
      aircraft_type: flightData.aircraft_type
    });

    return result;
  }

  static async findById(flightId) {
    const query = 'SELECT * FROM flights WHERE flight_id = ? AND is_active = true';
    const [rows] = await mysqlPool.execute(query, [flightId]);
    if (rows[0]) {
      // Get MongoDB details
      const details = await FlightDetails.findOne({ flight_id: flightId });
      return { ...rows[0], details };
    }
    return null;
  }

  static async search(filters = {}) {
    let query = 'SELECT * FROM flights WHERE is_active = true';
    const params = [];

    if (filters.departure_airport) {
      query += ' AND departure_airport = ?';
      params.push(filters.departure_airport);
    }
    if (filters.arrival_airport) {
      query += ' AND arrival_airport = ?';
      params.push(filters.arrival_airport);
    }
    if (filters.departure_date) {
      query += ' AND DATE(departure_datetime) = ?';
      params.push(filters.departure_date);
    }
    if (filters.flight_class) {
      query += ' AND flight_class = ?';
      params.push(filters.flight_class);
    }
    if (filters.min_price) {
      query += ' AND ticket_price >= ?';
      params.push(filters.min_price);
    }
    if (filters.max_price) {
      query += ' AND ticket_price <= ?';
      params.push(filters.max_price);
    }
    if (filters.min_seats) {
      query += ' AND available_seats >= ?';
      params.push(filters.min_seats);
    }

    // Sort options
    const sortField = filters.sort_by || 'ticket_price';
    const sortOrder = filters.sort_order || 'ASC';
    query += ` ORDER BY ${sortField} ${sortOrder}`;
    query += ' LIMIT 100';

    const [rows] = await mysqlPool.execute(query, params);
    return rows;
  }

  static async updateRating(flightId, newRating, totalReviews) {
    const query = 'UPDATE flights SET flight_rating = ? WHERE flight_id = ?';
    await mysqlPool.execute(query, [newRating, flightId]);
    
    await FlightDetails.updateOne(
      { flight_id: flightId },
      { average_rating: newRating, total_reviews: totalReviews }
    );
  }

  static async bookSeats(flightId, numSeats) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();
      
      // Check availability
      const [rows] = await connection.execute(
        'SELECT available_seats FROM flights WHERE flight_id = ? FOR UPDATE',
        [flightId]
      );
      
      if (!rows[0] || rows[0].available_seats < numSeats) {
        throw new Error('Not enough seats available');
      }
      
      // Update seats
      await connection.execute(
        'UPDATE flights SET available_seats = available_seats - ? WHERE flight_id = ?',
        [numSeats, flightId]
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
}

module.exports = { Flight, FlightDetails };
