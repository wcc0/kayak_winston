const { mysqlPool } = require('../src/config/database');
require('dotenv').config();

async function seedBillingData() {
  console.log('🔄 Seeding billing data...\n');
  
  const userIds = ['111-11-1111', '222-22-2222', '333-33-3333', '444-44-4444', '555-55-5555'];
  const hotelIds = ['HTL001', 'HTL002'];
  const flightIds = ['AA101', 'UA202'];
  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING'];
  const paymentMethods = ['Credit Card', 'Debit Card', 'PayPal', 'Apple Pay'];
  
  let hotelCount = 0;
  let flightCount = 0;
  
  try {
    // First, check if we can connect
    const [test] = await mysqlPool.query('SELECT 1 as test');
    console.log('✅ Database connection OK\n');
    
    // Drop and recreate billing table with proper AUTO_INCREMENT
    await mysqlPool.query(`DROP TABLE IF EXISTS billing`);
    await mysqlPool.query(`
      CREATE TABLE billing (
        billing_id INT NOT NULL AUTO_INCREMENT,
        user_id VARCHAR(20) NOT NULL,
        booking_id VARCHAR(50),
        booking_type ENUM('FLIGHT', 'HOTEL', 'CAR') NOT NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50),
        transaction_status ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
        transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (billing_id),
        INDEX idx_billing_user (user_id),
        INDEX idx_billing_date (transaction_date),
        INDEX idx_billing_status (transaction_status),
        INDEX idx_billing_type (booking_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ Billing table recreated with AUTO_INCREMENT\n');
    
    // Clear existing billing data
    await mysqlPool.query('DELETE FROM billing');
    console.log('🗑️  Cleared existing billing data\n');
    
    // Insert hotel bookings
    console.log('📝 Inserting hotel bookings...');
    for (let i = 0; i < 50; i++) {
      const userId = userIds[Math.floor(Math.random() * userIds.length)];
      const hotelId = hotelIds[Math.floor(Math.random() * hotelIds.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const payment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const amount = (Math.random() * 400 + 100).toFixed(2);
      
      // Random date in current year
      const currentYear = new Date().getFullYear();
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;
      const dateStr = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 12:00:00`;
      
      try {
        await mysqlPool.query(
          `INSERT INTO billing (user_id, booking_id, booking_type, total_amount, payment_method, transaction_status, transaction_date)
           VALUES (?, ?, 'HOTEL', ?, ?, ?, ?)`,
          [userId, hotelId, amount, payment, status, dateStr]
        );
        hotelCount++;
      } catch (err) {
        console.log(`  Error inserting hotel booking: ${err.message}`);
      }
    }
    console.log(`  ✅ Inserted ${hotelCount} hotel bookings\n`);
    
    // Insert flight bookings
    console.log('📝 Inserting flight bookings...');
    for (let i = 0; i < 40; i++) {
      const userId = userIds[Math.floor(Math.random() * userIds.length)];
      const flightId = flightIds[Math.floor(Math.random() * flightIds.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const payment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const amount = (Math.random() * 600 + 150).toFixed(2);
      
      // Random date in current year
      const currentYear2 = new Date().getFullYear();
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;
      const dateStr = `${currentYear2}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 14:00:00`;
      
      try {
        await mysqlPool.query(
          `INSERT INTO billing (user_id, booking_id, booking_type, total_amount, payment_method, transaction_status, transaction_date)
           VALUES (?, ?, 'FLIGHT', ?, ?, ?, ?)`,
          [userId, flightId, amount, payment, status, dateStr]
        );
        flightCount++;
      } catch (err) {
        console.log(`  Error inserting flight booking: ${err.message}`);
      }
    }
    console.log(`  ✅ Inserted ${flightCount} flight bookings\n`);
    
    // Show summary
    const [summary] = await mysqlPool.query(`
      SELECT 
        booking_type,
        COUNT(*) as count,
        SUM(total_amount) as total_revenue
      FROM billing
      GROUP BY booking_type
    `);
    
    console.log('📊 Billing Summary:');
    console.log('─'.repeat(50));
    summary.forEach(row => {
      console.log(`  ${row.booking_type}: ${row.count} bookings, $${parseFloat(row.total_revenue).toFixed(2)} revenue`);
    });
    
    const [total] = await mysqlPool.query('SELECT COUNT(*) as total FROM billing');
    console.log('─'.repeat(50));
    console.log(`  TOTAL: ${total[0].total} billing records\n`);
    
    console.log('🎉 Billing data seeded successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedBillingData();

