const { mysqlPool } = require('../config/database');
const bcrypt = require('bcryptjs');

// SSN Format Validation: XXX-XX-XXXX
const SSN_REGEX = /^[0-9]{3}-[0-9]{2}-[0-9]{4}$/;

// Valid US State Abbreviations
const VALID_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

// ZIP Code Validation: ##### or #####-####
const ZIP_REGEX = /^[0-9]{5}(-[0-9]{4})?$/;

class User {
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        user_id VARCHAR(11) PRIMARY KEY COMMENT 'SSN Format: XXX-XX-XXXX',
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(2),
        zip_code VARCHAR(10),
        profile_image VARCHAR(500),
        profile_picture_url VARCHAR(500),
        credit_card_last_four VARCHAR(4),
        credit_card_type VARCHAR(20),
        payment_method VARCHAR(50),
        home_airport VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_email (email),
        INDEX idx_active (is_active),
        INDEX idx_city_state (city, state)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await mysqlPool.execute(query);
  }

  static validateSSN(userId) {
    if (!SSN_REGEX.test(userId)) {
      throw new Error('invalid_user_id: User ID must match SSN format XXX-XX-XXXX');
    }
    return true;
  }

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

  static async create(userData) {
    // Validate if SSN format provided
    if (userData.user_id && SSN_REGEX.test(userData.user_id)) {
      this.validateSSN(userData.user_id);
    }
    
    // Validate state and zip if provided
    if (userData.state) this.validateState(userData.state);
    if (userData.zip_code) this.validateZipCode(userData.zip_code);

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const userId = userData.user_id || `USR-${Date.now()}`;
    
    const query = `
      INSERT INTO users (
        user_id, first_name, last_name, email, password, phone_number, 
        address, city, state, zip_code, profile_image, profile_picture_url,
        credit_card_last_four, credit_card_type, payment_method, home_airport
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    try {
      const [result] = await mysqlPool.execute(query, [
        userId,
        userData.first_name || null,
        userData.last_name || null,
        userData.email,
        hashedPassword,
        userData.phone_number || null,
        userData.address || null,
        userData.city || null,
        userData.state?.toUpperCase() || null,
        userData.zip_code || null,
        userData.profile_image || null,
        userData.profile_picture_url || null,
        userData.credit_card_last_four || null,
        userData.credit_card_type || null,
        userData.payment_method || null,
        userData.home_airport || null,
      ]);
      return { user_id: userId, ...userData };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('duplicate_user: A user with this ID or email already exists');
      }
      throw error;
    }
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ? AND is_active = true';
    const [rows] = await mysqlPool.execute(query, [email]);
    return rows[0];
  }

  static async findById(userId) {
    const query = 'SELECT * FROM users WHERE user_id = ? AND is_active = true';
    const [rows] = await mysqlPool.execute(query, [userId]);
    return rows[0];
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User;
