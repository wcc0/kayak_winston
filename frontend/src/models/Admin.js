const { mysqlPool } = require('../config/database');
const bcrypt = require('bcryptjs');

class Admin {
  static async createTable() {
    const query = `
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    
    await mysqlPool.execute(query);
  }

  static async create(adminData) {
    const hashedPassword = await bcrypt.hash(adminData.password, 10);
    
    const query = `
      INSERT INTO admins (
        admin_id, first_name, last_name, email, password,
        phone_number, address, city, state, zip_code, access_level
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await mysqlPool.execute(query, [
      adminData.admin_id,
      adminData.first_name,
      adminData.last_name,
      adminData.email,
      hashedPassword,
      adminData.phone_number || null,
      adminData.address || null,
      adminData.city || null,
      adminData.state || null,
      adminData.zip_code || null,
      adminData.access_level || 'admin'
    ]);
    
    return result;
  }

  static async findByEmail(email) {
    const query = 'SELECT * FROM admins WHERE email = ? AND is_active = true';
    const [rows] = await mysqlPool.execute(query, [email]);
    return rows[0];
  }

  static async findById(adminId) {
    const query = 'SELECT * FROM admins WHERE admin_id = ? AND is_active = true';
    const [rows] = await mysqlPool.execute(query, [adminId]);
    return rows[0];
  }

  static async updateLastLogin(adminId) {
    const query = 'UPDATE admins SET last_login = CURRENT_TIMESTAMP WHERE admin_id = ?';
    await mysqlPool.execute(query, [adminId]);
  }

  static async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = Admin;
