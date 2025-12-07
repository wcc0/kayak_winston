const { mysqlPool } = require('../src/config/database');
require('dotenv').config();

async function seedMoreHotels() {
  console.log('🏨 Seeding 30 hotels across multiple cities...\n');

  const hotels = [
    // San Francisco
    { hotel_id: 'HTL003', hotel_name: 'Marriott Union Square', city: 'San Francisco', state: 'CA', star_rating: 4, price_per_night: 220 },
    { hotel_id: 'HTL004', hotel_name: 'Hilton Financial District', city: 'San Francisco', state: 'CA', star_rating: 4, price_per_night: 195 },
    { hotel_id: 'HTL005', hotel_name: 'The Ritz-Carlton SF', city: 'San Francisco', state: 'CA', star_rating: 5, price_per_night: 450 },
    // New York
    { hotel_id: 'HTL006', hotel_name: 'Times Square Marriott', city: 'New York', state: 'NY', star_rating: 4, price_per_night: 320 },
    { hotel_id: 'HTL007', hotel_name: 'The Plaza Hotel', city: 'New York', state: 'NY', star_rating: 5, price_per_night: 550 },
    { hotel_id: 'HTL008', hotel_name: 'Hilton Midtown', city: 'New York', state: 'NY', star_rating: 4, price_per_night: 280 },
    { hotel_id: 'HTL009', hotel_name: 'W Hotel NYC', city: 'New York', state: 'NY', star_rating: 4, price_per_night: 310 },
    // Los Angeles
    { hotel_id: 'HTL010', hotel_name: 'Beverly Hills Hotel', city: 'Los Angeles', state: 'CA', star_rating: 5, price_per_night: 480 },
    { hotel_id: 'HTL011', hotel_name: 'Santa Monica Pier Inn', city: 'Los Angeles', state: 'CA', star_rating: 3, price_per_night: 150 },
    { hotel_id: 'HTL012', hotel_name: 'Hollywood Roosevelt', city: 'Los Angeles', state: 'CA', star_rating: 4, price_per_night: 260 },
    // Chicago
    { hotel_id: 'HTL013', hotel_name: 'Chicago Magnificent Mile', city: 'Chicago', state: 'IL', star_rating: 4, price_per_night: 210 },
    { hotel_id: 'HTL014', hotel_name: 'The Drake Hotel', city: 'Chicago', state: 'IL', star_rating: 5, price_per_night: 380 },
    { hotel_id: 'HTL015', hotel_name: 'Hyatt Regency Chicago', city: 'Chicago', state: 'IL', star_rating: 4, price_per_night: 190 },
    // Miami
    { hotel_id: 'HTL016', hotel_name: 'Fontainebleau Miami', city: 'Miami', state: 'FL', star_rating: 5, price_per_night: 420 },
    { hotel_id: 'HTL017', hotel_name: 'South Beach Resort', city: 'Miami', state: 'FL', star_rating: 4, price_per_night: 280 },
    { hotel_id: 'HTL018', hotel_name: 'Miami Marriott Biscayne', city: 'Miami', state: 'FL', star_rating: 4, price_per_night: 195 },
    // Seattle
    { hotel_id: 'HTL019', hotel_name: 'Four Seasons Seattle', city: 'Seattle', state: 'WA', star_rating: 5, price_per_night: 390 },
    { hotel_id: 'HTL020', hotel_name: 'Hyatt Olive 8', city: 'Seattle', state: 'WA', star_rating: 4, price_per_night: 220 },
    { hotel_id: 'HTL021', hotel_name: 'The Edgewater Hotel', city: 'Seattle', state: 'WA', star_rating: 4, price_per_night: 250 },
    // Boston
    { hotel_id: 'HTL022', hotel_name: 'Boston Harbor Hotel', city: 'Boston', state: 'MA', star_rating: 5, price_per_night: 410 },
    { hotel_id: 'HTL023', hotel_name: 'Marriott Long Wharf', city: 'Boston', state: 'MA', star_rating: 4, price_per_night: 240 },
    { hotel_id: 'HTL024', hotel_name: 'The Liberty Hotel', city: 'Boston', state: 'MA', star_rating: 4, price_per_night: 270 },
    // Las Vegas
    { hotel_id: 'HTL025', hotel_name: 'Bellagio Las Vegas', city: 'Las Vegas', state: 'NV', star_rating: 5, price_per_night: 350 },
    { hotel_id: 'HTL026', hotel_name: 'The Venetian', city: 'Las Vegas', state: 'NV', star_rating: 5, price_per_night: 320 },
    { hotel_id: 'HTL027', hotel_name: 'MGM Grand', city: 'Las Vegas', state: 'NV', star_rating: 4, price_per_night: 180 },
    // Denver
    { hotel_id: 'HTL028', hotel_name: 'The Brown Palace', city: 'Denver', state: 'CO', star_rating: 5, price_per_night: 290 },
    { hotel_id: 'HTL029', hotel_name: 'Four Seasons Denver', city: 'Denver', state: 'CO', star_rating: 5, price_per_night: 380 },
    // Austin
    { hotel_id: 'HTL030', hotel_name: 'The Driskill Austin', city: 'Austin', state: 'TX', star_rating: 4, price_per_night: 250 },
    { hotel_id: 'HTL031', hotel_name: 'W Hotel Austin', city: 'Austin', state: 'TX', star_rating: 4, price_per_night: 280 },
    { hotel_id: 'HTL032', hotel_name: 'JW Marriott Austin', city: 'Austin', state: 'TX', star_rating: 5, price_per_night: 340 },
  ];

  let hotelCount = 0;

  for (const hotel of hotels) {
    try {
      await mysqlPool.query(
        `INSERT INTO hotels (hotel_id, hotel_name, address, city, state, zip_code, star_rating, total_rooms, available_rooms, room_type, price_per_night, amenities)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE hotel_name = VALUES(hotel_name)`,
        [hotel.hotel_id, hotel.hotel_name, `${Math.floor(Math.random() * 999) + 1} Main Street`, 
         hotel.city, hotel.state, '00000', hotel.star_rating, 200, 150, 'Deluxe', 
         hotel.price_per_night, JSON.stringify(['WiFi', 'Breakfast', 'Pool', 'Gym'])]
      );
      hotelCount++;
      console.log(`  ✅ ${hotel.hotel_name} (${hotel.city})`);
    } catch (err) {
      console.log(`  ⚠️ ${hotel.hotel_name}: ${err.message}`);
    }
  }

  console.log(`\n✅ Added ${hotelCount} hotels\n`);
  return hotels.map(h => h.hotel_id);
}

async function seedBillingForHotels(hotelIds) {
  console.log('💳 Generating billing records for all hotels...\n');

  const userIds = ['111-11-1111', '222-22-2222', '333-33-3333', '444-44-4444', '555-55-5555', 
                   '666-66-6666', '777-77-7777', '888-88-8888', '999-99-9999', '101-01-0101'];
  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING'];
  const paymentMethods = ['Credit Card', 'Debit Card', 'PayPal', 'Apple Pay'];
  const currentYear = new Date().getFullYear();

  // Clear existing billing
  await mysqlPool.query('DELETE FROM billing');
  console.log('  🗑️ Cleared existing billing data\n');

  let count = 0;

  // Generate 5-15 bookings per hotel
  for (const hotelId of hotelIds) {
    const numBookings = Math.floor(Math.random() * 11) + 5; // 5-15 bookings
    
    for (let i = 0; i < numBookings; i++) {
      const userId = userIds[Math.floor(Math.random() * userIds.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const payment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const amount = (Math.random() * 500 + 100).toFixed(2);
      
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;
      const dateStr = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 12:00:00`;

      try {
        await mysqlPool.query(
          `INSERT INTO billing (user_id, booking_id, booking_type, total_amount, payment_method, transaction_status, transaction_date)
           VALUES (?, ?, 'HOTEL', ?, ?, ?, ?)`,
          [userId, hotelId, amount, payment, status, dateStr]
        );
        count++;
      } catch (err) {
        // ignore
      }
    }
  }

  // Add some flight bookings too
  const flightIds = ['AA101', 'UA202', 'DL303', 'SW404', 'JB505'];
  
  // Add more flights first
  const flights = [
    { flight_id: 'DL303', airline_name: 'Delta Airlines', departure: 'LAX', arrival: 'JFK', price: 380 },
    { flight_id: 'SW404', airline_name: 'Southwest Airlines', departure: 'DEN', arrival: 'ORD', price: 220 },
    { flight_id: 'JB505', airline_name: 'JetBlue Airways', departure: 'BOS', arrival: 'MIA', price: 290 },
  ];

  for (const flight of flights) {
    try {
      await mysqlPool.query(
        `INSERT INTO flights (flight_id, airline_name, departure_airport, arrival_airport, departure_datetime, arrival_datetime, duration, flight_class, ticket_price, total_seats, available_seats)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE flight_id = flight_id`,
        [flight.flight_id, flight.airline_name, flight.departure, flight.arrival, 
         '2025-12-20 10:00:00', '2025-12-20 14:00:00', 240, 'Economy', flight.price, 180, 120]
      );
    } catch (err) {
      // ignore
    }
  }

  // Generate flight bookings
  for (const flightId of flightIds) {
    const numBookings = Math.floor(Math.random() * 8) + 3;
    
    for (let i = 0; i < numBookings; i++) {
      const userId = userIds[Math.floor(Math.random() * userIds.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const payment = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const amount = (Math.random() * 600 + 150).toFixed(2);
      
      const month = Math.floor(Math.random() * 12) + 1;
      const day = Math.floor(Math.random() * 28) + 1;
      const dateStr = `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} 14:00:00`;

      try {
        await mysqlPool.query(
          `INSERT INTO billing (user_id, booking_id, booking_type, total_amount, payment_method, transaction_status, transaction_date)
           VALUES (?, ?, 'FLIGHT', ?, ?, ?, ?)`,
          [userId, flightId, amount, payment, status, dateStr]
        );
        count++;
      } catch (err) {
        // ignore
      }
    }
  }

  console.log(`  ✅ Generated ${count} billing records\n`);
}

async function showSummary() {
  console.log('📊 Summary:\n');
  
  const [hotels] = await mysqlPool.query('SELECT COUNT(*) as count FROM hotels');
  const [flights] = await mysqlPool.query('SELECT COUNT(*) as count FROM flights');
  const [billing] = await mysqlPool.query('SELECT COUNT(*) as count FROM billing');
  
  const [cityRevenue] = await mysqlPool.query(`
    SELECT h.city, SUM(b.total_amount) as revenue, COUNT(*) as bookings
    FROM billing b
    JOIN hotels h ON b.booking_id = h.hotel_id
    WHERE b.booking_type = 'HOTEL' AND b.transaction_status = 'COMPLETED'
    GROUP BY h.city
    ORDER BY revenue DESC
  `);

  const [topProperties] = await mysqlPool.query(`
    SELECT h.hotel_name, SUM(b.total_amount) as revenue
    FROM billing b
    JOIN hotels h ON b.booking_id = h.hotel_id
    WHERE b.booking_type = 'HOTEL' AND b.transaction_status = 'COMPLETED'
    GROUP BY h.hotel_name
    ORDER BY revenue DESC
    LIMIT 10
  `);

  console.log(`  🏨 Total Hotels: ${hotels[0].count}`);
  console.log(`  ✈️  Total Flights: ${flights[0].count}`);
  console.log(`  💳 Total Billing Records: ${billing[0].count}`);
  
  console.log('\n  📍 Revenue by City:');
  cityRevenue.forEach((c, i) => {
    console.log(`     ${i + 1}. ${c.city}: $${parseFloat(c.revenue).toFixed(2)} (${c.bookings} bookings)`);
  });

  console.log('\n  🏆 Top 10 Properties:');
  topProperties.forEach((p, i) => {
    console.log(`     ${i + 1}. ${p.hotel_name}: $${parseFloat(p.revenue).toFixed(2)}`);
  });
}

async function main() {
  try {
    console.log('🚀 Seeding expanded data...\n');
    console.log('═'.repeat(50) + '\n');
    
    const hotelIds = await seedMoreHotels();
    
    // Include original hotels
    const allHotelIds = ['HTL001', 'HTL002', ...hotelIds];
    
    await seedBillingForHotels(allHotelIds);
    await showSummary();
    
    console.log('\n' + '═'.repeat(50));
    console.log('🎉 Data seeding complete!\n');
    
    // Clear Redis cache
    const redis = require('redis');
    const client = redis.createClient();
    await client.connect();
    await client.flushAll();
    console.log('🔄 Redis cache cleared\n');
    await client.quit();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

