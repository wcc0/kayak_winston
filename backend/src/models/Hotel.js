/**
 * Hotel Model - MySQL + MongoDB hybrid
 * Core data in MySQL, reviews/images in MongoDB
 */
const { mysqlPool } = require('../config/database');
const mongoose = require('mongoose');

// Valid US State Abbreviations
const VALID_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

// ZIP Code Validation
const ZIP_REGEX = /^[0-9]{5}(-[0-9]{4})?$/;

// MongoDB Schema for hotel images and detailed info
const hotelDetailsSchema = new mongoose.Schema({
  hotel_id: { type: String, required: true, unique: true },
  images: [{
    url: String,
    type: { type: String, enum: ['exterior', 'room', 'bathroom', 'lobby', 'pool', 'restaurant', 'other'] },
    caption: String,
    is_primary: { type: Boolean, default: false }
  }],
  room_images: [{
    room_type: String,
    images: [{ url: String, caption: String }]
  }],
  policies: {
    check_in_time: String,
    check_out_time: String,
    cancellation_policy: String,
    pet_policy: { allowed: Boolean, fee: Number },
    smoking_policy: String,
    age_restriction: Number
  },
  nearby_attractions: [{
    name: String,
    distance: String,
    type: String
  }],
  average_rating: { type: Number, default: 0 },
  total_reviews: { type: Number, default: 0 },
  rating_breakdown: {
    cleanliness: { type: Number, default: 0 },
    service: { type: Number, default: 0 },
    location: { type: Number, default: 0 },
    value: { type: Number, default: 0 },
    amenities: { type: Number, default: 0 }
  }
}, { collection: 'hotel_details', timestamps: true });

const HotelDetails = mongoose.model('HotelDetails', hotelDetailsSchema);

class Hotel {
  static validateState(state) {
    if (state && !VALID_STATES.includes(state.toUpperCase())) {
      throw new Error('malformed_state: Invalid US state abbreviation');
    }
    return true;
  }

  static validateZipCode(zipCode) {
    if (zipCode && !ZIP_REGEX.test(zipCode)) {
      throw new Error('malformed_zip_code: ZIP code must be ##### or #####-####');
    }
    return true;
  }

  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS hotels (
        hotel_id VARCHAR(50) PRIMARY KEY,
        hotel_name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        city VARCHAR(100) NOT NULL,
        state VARCHAR(2) NOT NULL,
        zip_code VARCHAR(10),
        star_rating TINYINT DEFAULT 3 CHECK (star_rating BETWEEN 1 AND 5),
        hotel_rating DECIMAL(2, 1) DEFAULT 0.0,
        total_rooms INT DEFAULT 100,
        available_rooms INT DEFAULT 100,
        room_type VARCHAR(50) DEFAULT 'Standard',
        price_per_night DECIMAL(10, 2) NOT NULL,
        amenities JSON,
        vendor_id INT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_city (city),
        INDEX idx_state (state),
        INDEX idx_star_rating (star_rating),
        INDEX idx_hotel_rating (hotel_rating),
        INDEX idx_price (price_per_night),
        FOREIGN KEY (vendor_id) REFERENCES vendors(vendor_id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await mysqlPool.execute(query);
  }

  static async create(hotelData) {
    this.validateState(hotelData.state);
    this.validateZipCode(hotelData.zip_code);

    const query = `
      INSERT INTO hotels (
        hotel_id, hotel_name, address, city, state, zip_code,
        star_rating, total_rooms, available_rooms, room_type,
        price_per_night, amenities, vendor_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const amenitiesJson = typeof hotelData.amenities === 'string' 
      ? hotelData.amenities 
      : JSON.stringify(hotelData.amenities || []);

    const [result] = await mysqlPool.execute(query, [
      hotelData.hotel_id,
      hotelData.hotel_name,
      hotelData.address,
      hotelData.city,
      hotelData.state.toUpperCase(),
      hotelData.zip_code,
      hotelData.star_rating || 3,
      hotelData.total_rooms || 100,
      hotelData.available_rooms || hotelData.total_rooms || 100,
      hotelData.room_type || 'Standard',
      hotelData.price_per_night,
      amenitiesJson,
      hotelData.vendor_id || null
    ]);

    // Create MongoDB details document
    await HotelDetails.create({
      hotel_id: hotelData.hotel_id,
      images: hotelData.images || [],
      policies: hotelData.policies || {}
    });

    return result;
  }

  static async findById(hotelId) {
    const query = 'SELECT * FROM hotels WHERE hotel_id = ? AND is_active = true';
    const [rows] = await mysqlPool.execute(query, [hotelId]);
    if (rows[0]) {
      const details = await HotelDetails.findOne({ hotel_id: hotelId });
      const hotel = rows[0];
      hotel.amenities = typeof hotel.amenities === 'string' 
        ? JSON.parse(hotel.amenities) 
        : hotel.amenities;
      return { ...hotel, details };
    }
    return null;
  }

  static async search(filters = {}) {
    let query = 'SELECT * FROM hotels WHERE is_active = true';
    const params = [];

    if (filters.city) {
      query += ' AND city = ?';
      params.push(filters.city);
    }
    if (filters.state) {
      this.validateState(filters.state);
      query += ' AND state = ?';
      params.push(filters.state.toUpperCase());
    }
    if (filters.min_star_rating) {
      query += ' AND star_rating >= ?';
      params.push(filters.min_star_rating);
    }
    if (filters.min_price) {
      query += ' AND price_per_night >= ?';
      params.push(filters.min_price);
    }
    if (filters.max_price) {
      query += ' AND price_per_night <= ?';
      params.push(filters.max_price);
    }
    if (filters.room_type) {
      query += ' AND room_type = ?';
      params.push(filters.room_type);
    }
    if (filters.min_rooms) {
      query += ' AND available_rooms >= ?';
      params.push(filters.min_rooms);
    }

    const sortField = filters.sort_by || 'price_per_night';
    const sortOrder = filters.sort_order || 'ASC';
    query += ` ORDER BY ${sortField} ${sortOrder}`;
    query += ' LIMIT 100';

    const [rows] = await mysqlPool.execute(query, params);
    return rows.map(h => ({
      ...h,
      amenities: typeof h.amenities === 'string' ? JSON.parse(h.amenities) : h.amenities
    }));
  }

  static async updateRating(hotelId, newRating, totalReviews, breakdown = {}) {
    const query = 'UPDATE hotels SET hotel_rating = ? WHERE hotel_id = ?';
    await mysqlPool.execute(query, [newRating, hotelId]);
    
    await HotelDetails.updateOne(
      { hotel_id: hotelId },
      { 
        average_rating: newRating, 
        total_reviews: totalReviews,
        rating_breakdown: breakdown
      }
    );
  }

  static async bookRoom(hotelId, numRooms = 1) {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();
      
      const [rows] = await connection.execute(
        'SELECT available_rooms FROM hotels WHERE hotel_id = ? FOR UPDATE',
        [hotelId]
      );
      
      if (!rows[0] || rows[0].available_rooms < numRooms) {
        throw new Error('Not enough rooms available');
      }
      
      await connection.execute(
        'UPDATE hotels SET available_rooms = available_rooms - ? WHERE hotel_id = ?',
        [numRooms, hotelId]
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

module.exports = { Hotel, HotelDetails };
