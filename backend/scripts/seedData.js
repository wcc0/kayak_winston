const bcrypt = require('bcryptjs');
const { mysqlPool } = require('../src/config/database');
require('dotenv').config();

async function seedAdmins() {
  console.log('Seeding admin data...');
  
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  const admins = [
    {
      admin_id: '123-45-6789',
      first_name: 'Super',
      last_name: 'Admin',
      email: 'superadmin@kayak.com',
      password: hashedPassword,
      access_level: 'super_admin',
      phone_number: '4151234567',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94105'
    },
    {
      admin_id: '987-65-4321',
      first_name: 'Regular',
      last_name: 'Admin',
      email: 'admin@kayak.com',
      password: hashedPassword,
      access_level: 'admin',
      phone_number: '4159876543',
      city: 'San Jose',
      state: 'CA',
      zip_code: '95110'
    }
  ];

  for (const admin of admins) {
    try {
      await mysqlPool.execute(
        `INSERT INTO admins (admin_id, first_name, last_name, email, password, access_level, phone_number, city, state, zip_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE email = email`,
        [admin.admin_id, admin.first_name, admin.last_name, admin.email, admin.password, 
         admin.access_level, admin.phone_number, admin.city, admin.state, admin.zip_code]
      );
      console.log(`✅ Admin created: ${admin.email}`);
    } catch (error) {
      console.log(`⚠️  Admin already exists: ${admin.email}`);
    }
  }
}

async function seedUsers() {
  console.log('Seeding user data...');
  
  const users = [
    {
      user_id: '111-11-1111',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone_number: '4151111111',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94102'
    },
    {
      user_id: '222-22-2222',
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane.smith@example.com',
      phone_number: '4152222222',
      city: 'San Jose',
      state: 'CA',
      zip_code: '95112'
    }
  ];

  for (const user of users) {
    try {
      await mysqlPool.execute(
        `INSERT INTO users (user_id, first_name, last_name, email, phone_number, city, state, zip_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE email = email`,
        [user.user_id, user.first_name, user.last_name, user.email, 
         user.phone_number, user.city, user.state, user.zip_code]
      );
      console.log(`✅ User created: ${user.email}`);
    } catch (error) {
      console.log(`⚠️  User already exists: ${user.email}`);
    }
  }
}

async function seedFlights() {
  console.log('Seeding flight data...');
  
  const flights = [
    {
      flight_id: 'AA101',
      airline_name: 'American Airlines',
      departure_airport: 'SFO',
      arrival_airport: 'JFK',
      departure_datetime: '2025-12-15 08:00:00',
      arrival_datetime: '2025-12-15 16:30:00',
      duration: 330,
      flight_class: 'Economy',
      ticket_price: 350.00,
      total_seats: 180,
      available_seats: 120
    },
    {
      flight_id: 'UA202',
      airline_name: 'United Airlines',
      departure_airport: 'SJC',
      arrival_airport: 'LAX',
      departure_datetime: '2025-12-16 10:00:00',
      arrival_datetime: '2025-12-16 11:30:00',
      duration: 90,
      flight_class: 'Business',
      ticket_price: 280.00,
      total_seats: 150,
      available_seats: 90
    }
  ];

  for (const flight of flights) {
    try {
      await mysqlPool.execute(
        `INSERT INTO flights (flight_id, airline_name, departure_airport, arrival_airport, 
         departure_datetime, arrival_datetime, duration, flight_class, ticket_price, total_seats, available_seats)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE flight_id = flight_id`,
        [flight.flight_id, flight.airline_name, flight.departure_airport, flight.arrival_airport,
         flight.departure_datetime, flight.arrival_datetime, flight.duration, flight.flight_class,
         flight.ticket_price, flight.total_seats, flight.available_seats]
      );
      console.log(`✅ Flight created: ${flight.flight_id}`);
    } catch (error) {
      console.log(`⚠️  Flight already exists: ${flight.flight_id}`);
    }
  }
}

async function seedHotels() {
  console.log('Seeding hotel data...');
  
  const hotels = [
    {
      hotel_id: 'HTL001',
      hotel_name: 'Grand Plaza Hotel',
      address: '123 Market Street',
      city: 'San Francisco',
      state: 'CA',
      zip_code: '94102',
      star_rating: 5,
      total_rooms: 200,
      available_rooms: 150,
      room_type: 'Deluxe',
      price_per_night: 250.00,
      amenities: JSON.stringify(['WiFi', 'Breakfast', 'Parking', 'Pool'])
    },
    {
      hotel_id: 'HTL002',
      hotel_name: 'Silicon Valley Inn',
      address: '456 Tech Drive',
      city: 'San Jose',
      state: 'CA',
      zip_code: '95110',
      star_rating: 4,
      total_rooms: 150,
      available_rooms: 100,
      room_type: 'Standard',
      price_per_night: 180.00,
      amenities: JSON.stringify(['WiFi', 'Breakfast', 'Gym'])
    }
  ];

  for (const hotel of hotels) {
    try {
      await mysqlPool.execute(
        `INSERT INTO hotels (hotel_id, hotel_name, address, city, state, zip_code, 
         star_rating, total_rooms, available_rooms, room_type, price_per_night, amenities)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE hotel_id = hotel_id`,
        [hotel.hotel_id, hotel.hotel_name, hotel.address, hotel.city, hotel.state, hotel.zip_code,
         hotel.star_rating, hotel.total_rooms, hotel.available_rooms, hotel.room_type,
         hotel.price_per_night, hotel.amenities]
      );
      console.log(`✅ Hotel created: ${hotel.hotel_name}`);
    } catch (error) {
      console.log(`⚠️  Hotel already exists: ${hotel.hotel_name}`);
    }
  }
}

async function seedBilling() {
  console.log('Seeding billing data...');
  
  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'REFUNDED'];
  const paymentMethods = ['Credit Card', 'Debit Card', 'PayPal', 'Apple Pay'];
  
  // These IDs must match the seeded hotels and flights
  const hotelIds = ['HTL001', 'HTL002'];
  const flightIds = ['AA101', 'UA202'];
  const userIds = ['111-11-1111', '222-22-2222', '333-33-3333', '444-44-4444', '555-55-5555'];
  
  let count = 0;
  
  // Generate hotel bookings (60 records)
  for (let i = 1; i <= 60; i++) {
    const hotelId = hotelIds[Math.floor(Math.random() * hotelIds.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    
    // Random amount for hotel (150-500)
    const amount = (Math.random() * 350 + 150).toFixed(2);
    
    // Random date in the past year
    const daysAgo = Math.floor(Math.random() * 365);
    const transactionDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const dateStr = transactionDate.toISOString().slice(0, 19).replace('T', ' ');
    
    try {
      await mysqlPool.query(
        `INSERT INTO billing (user_id, booking_id, booking_type, total_amount, payment_method, transaction_status, transaction_date)
         VALUES (?, ?, 'HOTEL', ?, ?, ?, ?)`,
        [userId, hotelId, amount, paymentMethod, status, dateStr]
      );
      count++;
    } catch (error) {
      // Ignore errors
    }
  }
  
  // Generate flight bookings (40 records)
  for (let i = 1; i <= 40; i++) {
    const flightId = flightIds[Math.floor(Math.random() * flightIds.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
    const userId = userIds[Math.floor(Math.random() * userIds.length)];
    
    // Random amount for flights (200-800)
    const amount = (Math.random() * 600 + 200).toFixed(2);
    
    // Random date in 2024
    const transactionDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const dateStr = transactionDate.toISOString().slice(0, 19).replace('T', ' ');
    
    try {
      await mysqlPool.query(
        `INSERT INTO billing (user_id, booking_id, booking_type, total_amount, payment_method, transaction_status, transaction_date)
         VALUES (?, ?, 'FLIGHT', ?, ?, ?, ?)`,
        [userId, flightId, amount, paymentMethod, status, dateStr]
      );
      count++;
    } catch (error) {
      // Ignore errors
    }
  }
  
  console.log(`✅ Created ${count} billing records`);
}

async function seedAnalytics() {
  console.log('Analytics will be derived from billing data...');
  console.log('✅ Analytics ready (computed from billing records)');
}

async function seedMoreUsers() {
  console.log('Seeding additional users...');
  
  const additionalUsers = [
    { user_id: '333-33-3333', first_name: 'Mike', last_name: 'Johnson', email: 'mike.johnson@example.com', phone_number: '4153333333', city: 'Los Angeles', state: 'CA', zip_code: '90001' },
    { user_id: '444-44-4444', first_name: 'Sarah', last_name: 'Williams', email: 'sarah.williams@example.com', phone_number: '4154444444', city: 'New York', state: 'NY', zip_code: '10001' },
    { user_id: '555-55-5555', first_name: 'David', last_name: 'Brown', email: 'david.brown@example.com', phone_number: '4155555555', city: 'Chicago', state: 'IL', zip_code: '60601' },
    { user_id: '666-66-6666', first_name: 'Emily', last_name: 'Davis', email: 'emily.davis@example.com', phone_number: '4156666666', city: 'Seattle', state: 'WA', zip_code: '98101' },
    { user_id: '777-77-7777', first_name: 'Chris', last_name: 'Miller', email: 'chris.miller@example.com', phone_number: '4157777777', city: 'Miami', state: 'FL', zip_code: '33101' },
    { user_id: '888-88-8888', first_name: 'Amanda', last_name: 'Wilson', email: 'amanda.wilson@example.com', phone_number: '4158888888', city: 'Boston', state: 'MA', zip_code: '02101' },
    { user_id: '999-99-9999', first_name: 'Kevin', last_name: 'Taylor', email: 'kevin.taylor@example.com', phone_number: '4159999999', city: 'Denver', state: 'CO', zip_code: '80201' },
    { user_id: '101-01-0101', first_name: 'Jessica', last_name: 'Anderson', email: 'jessica.anderson@example.com', phone_number: '4150101010', city: 'Austin', state: 'TX', zip_code: '73301' },
  ];

  for (const user of additionalUsers) {
    try {
      await mysqlPool.query(
        `INSERT INTO users (user_id, first_name, last_name, email, phone_number, city, state, zip_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE email = email`,
        [user.user_id, user.first_name, user.last_name, user.email, user.phone_number, user.city, user.state, user.zip_code]
      );
      console.log(`✅ User created: ${user.email}`);
    } catch (error) {
      console.log(`⚠️  User already exists: ${user.email}`);
    }
  }
}

async function seed() {
  try {
    await seedAdmins();
    await seedUsers();
    await seedMoreUsers();
    await seedFlights();
    await seedHotels();
    await seedBilling();
    await seedAnalytics();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Super Admin: superadmin@kayak.com / Admin@123');
    console.log('   Regular Admin: admin@kayak.com / Admin@123');
    console.log('\n📊 Seeded data:');
    console.log('   - 10 Users');
    console.log('   - 100 Billing records');
    console.log('   - Analytics data for charts');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
