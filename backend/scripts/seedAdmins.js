/**
 * Seed Demo Admin Users
 * Run: node scripts/seedAdmins.js
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seedAdmins() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'kayak_admin'
  });

  console.log('🔧 Connected to MySQL');

  try {
    // Create admins table if not exists
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        admin_id VARCHAR(50) PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone_number VARCHAR(20),
        address VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(10),
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
    `);
    console.log('✅ Admins table ready');

    // Demo admin users
    const admins = [
      {
        admin_id: 'ADM-001',
        first_name: 'Super',
        last_name: 'Admin',
        email: 'superadmin@kayak.com',
        password: 'Admin@123',
        phone_number: '4151234567',
        city: 'San Jose',
        state: 'CA',
        zip_code: '95112',
        access_level: 'super_admin'
      },
      {
        admin_id: 'ADM-002',
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@kayak.com',
        password: 'Admin@123',
        phone_number: '4159876543',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94102',
        access_level: 'admin'
      },
      {
        admin_id: 'ADM-003',
        first_name: 'Manager',
        last_name: 'User',
        email: 'manager@kayak.com',
        password: 'Admin@123',
        phone_number: '4155551234',
        city: 'Oakland',
        state: 'CA',
        zip_code: '94612',
        access_level: 'manager'
      }
    ];

    for (const admin of admins) {
      // Check if exists
      const [existing] = await connection.execute(
        'SELECT admin_id FROM admins WHERE email = ?',
        [admin.email]
      );

      if (existing.length > 0) {
        console.log(`⏭️  Admin ${admin.email} already exists`);
        continue;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(admin.password, 10);

      // Insert admin
      await connection.execute(`
        INSERT INTO admins (
          admin_id, first_name, last_name, email, password,
          phone_number, city, state, zip_code, access_level, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)
      `, [
        admin.admin_id,
        admin.first_name,
        admin.last_name,
        admin.email,
        hashedPassword,
        admin.phone_number,
        admin.city,
        admin.state,
        admin.zip_code,
        admin.access_level
      ]);

      console.log(`✅ Created: ${admin.email} (${admin.access_level})`);
    }

    console.log('\n📋 Demo Credentials:');
    console.log('   superadmin@kayak.com / Admin@123 (Full access)');
    console.log('   admin@kayak.com / Admin@123 (Admin access)');
    console.log('   manager@kayak.com / Admin@123 (Limited access)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
    console.log('\n✅ Done!');
  }
}

seedAdmins();

