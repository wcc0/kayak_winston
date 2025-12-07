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

async function seed() {
  try {
    await seedAdmins();
    await seedUsers();
    await seedFlights();
    await seedHotels();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Login credentials:');
    console.log('   Super Admin: superadmin@kayak.com / Admin@123');
    console.log('   Regular Admin: admin@kayak.com / Admin@123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
