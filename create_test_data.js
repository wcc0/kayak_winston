const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

// Test users to create
const testUsers = [
  {
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    password: 'password123',
    phone: '5551234567'
  },
  {
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.j@example.com',
    password: 'password123',
    phone: '5559876543'
  },
  {
    first_name: 'Michael',
    last_name: 'Brown',
    email: 'michael.b@example.com',
    password: 'password123',
    phone: '5552468135'
  },
  {
    first_name: 'Emily',
    last_name: 'Davis',
    email: 'emily.d@example.com',
    password: 'password123',
    phone: '5553691470'
  },
  {
    first_name: 'David',
    last_name: 'Wilson',
    email: 'david.w@example.com',
    password: 'password123',
    phone: '5558529630'
  },
  {
    first_name: 'Jessica',
    last_name: 'Martinez',
    email: 'jessica.m@example.com',
    password: 'password123',
    phone: '5557418520'
  },
  {
    first_name: 'Robert',
    last_name: 'Garcia',
    email: 'robert.g@example.com',
    password: 'password123',
    phone: '5556543210'
  },
  {
    first_name: 'Lisa',
    last_name: 'Anderson',
    email: 'lisa.a@example.com',
    password: 'password123',
    phone: '5559638520'
  }
];

// Test flights to create
const testFlights = [
  {
    flight_id: 'NYC-LAX-001',
    airline_name: 'Delta Airlines',
    departure_airport: 'JFK',
    arrival_airport: 'LAX',
    departure_city: 'New York',
    arrival_city: 'Los Angeles',
    departure_time: '08:00',
    arrival_time: '11:30',
    flight_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    duration_minutes: 330,
    flight_class: 'Economy',
    price: 299.99,
    total_seats: 180,
    available_seats: 180,
    rating: 4.5
  },
  {
    flight_id: 'BOS-MIA-001',
    airline_name: 'JetBlue',
    departure_airport: 'BOS',
    arrival_airport: 'MIA',
    departure_city: 'Boston',
    arrival_city: 'Miami',
    departure_time: '09:00',
    arrival_time: '12:30',
    flight_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    duration_minutes: 210,
    flight_class: 'Economy',
    price: 249.99,
    total_seats: 150,
    available_seats: 150,
    rating: 4.3
  },
  {
    flight_id: 'ORD-SFO-001',
    airline_name: 'United Airlines',
    departure_airport: 'ORD',
    arrival_airport: 'SFO',
    departure_city: 'Chicago',
    arrival_city: 'San Francisco',
    departure_time: '10:00',
    arrival_time: '12:45',
    flight_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    duration_minutes: 285,
    flight_class: 'Business',
    price: 599.99,
    total_seats: 120,
    available_seats: 120,
    rating: 4.7
  },
  {
    flight_id: 'SEA-DEN-001',
    airline_name: 'Alaska Airlines',
    departure_airport: 'SEA',
    arrival_airport: 'DEN',
    departure_city: 'Seattle',
    arrival_city: 'Denver',
    departure_time: '11:00',
    arrival_time: '14:15',
    flight_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    duration_minutes: 195,
    flight_class: 'Economy',
    price: 199.99,
    total_seats: 140,
    available_seats: 140,
    rating: 4.4
  }
];

// Test hotels
const testHotels = [
  {
    hotel_id: 'HTL-NYC-001',
    hotel_name: 'Grand Plaza Hotel',
    address: '123 Broadway',
    city: 'New York',
    state: 'NY',
    zip_code: '10001',
    star_rating: 4,
    total_rooms: 200,
    available_rooms: 200,
    room_type: 'Deluxe',
    price_per_night: 250.00,
    amenities: JSON.stringify(['WiFi', 'Pool', 'Gym', 'Restaurant']),
    rating: 4.5
  },
  {
    hotel_id: 'HTL-MIA-001',
    hotel_name: 'Ocean View Resort',
    address: '456 Beach Drive',
    city: 'Miami',
    state: 'FL',
    zip_code: '33139',
    star_rating: 5,
    total_rooms: 150,
    available_rooms: 150,
    room_type: 'Suite',
    price_per_night: 350.00,
    amenities: JSON.stringify(['WiFi', 'Beach Access', 'Spa', 'Pool']),
    rating: 4.8
  }
];

async function createTestData() {
  console.log('🚀 Creating test data for Kayak platform...\n');

  // Get admin token first
  console.log('📝 Logging in as admin...');
  const adminLogin = await axios.post(`${API_BASE}/admin/auth/login`, {
    email: 'admin@kayak.com',
    password: 'Admin@123'
  });
  const adminToken = adminLogin.data.token;
  console.log('✅ Admin logged in\n');

  // Create flights
  console.log('✈️  Creating test flights...');
  for (const flight of testFlights) {
    try {
      await axios.post(`${API_BASE}/admin/listings/flight`, flight, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`  ✅ Created flight: ${flight.flight_id} (${flight.departure_city} → ${flight.arrival_city})`);
    } catch (error) {
      console.log(`  ⚠️  Flight ${flight.flight_id} may already exist`);
    }
  }
  console.log('');

  // Create hotels
  console.log('🏨 Creating test hotels...');
  for (const hotel of testHotels) {
    try {
      await axios.post(`${API_BASE}/admin/listings/hotel`, hotel, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`  ✅ Created hotel: ${hotel.hotel_name} in ${hotel.city}`);
    } catch (error) {
      console.log(`  ⚠️  Hotel ${hotel.hotel_id} may already exist`);
    }
  }
  console.log('');

  // Create users
  console.log('👥 Creating test users...');
  const createdUsers = [];
  for (const user of testUsers) {
    try {
      const response = await axios.post(`${API_BASE}/traveler/register`, user);
      createdUsers.push(response.data.data);
      console.log(`  ✅ Created user: ${user.first_name} ${user.last_name} (${response.data.data.user_id})`);
    } catch (error) {
      console.log(`  ⚠️  User ${user.email} may already exist`);
    }
  }
  console.log('');

  // Create bookings for some users
  console.log('📅 Creating test bookings...');
  const bookingsToCreate = [
    { userIndex: 0, flightId: 'NYC-LAX-001', quantity: 2, price: 299.99 },
    { userIndex: 1, flightId: 'BOS-MIA-001', quantity: 1, price: 249.99 },
    { userIndex: 2, flightId: 'ORD-SFO-001', quantity: 1, price: 599.99 },
    { userIndex: 3, flightId: 'SEA-DEN-001', quantity: 3, price: 199.99 },
    { userIndex: 4, flightId: 'NYC-LAX-001', quantity: 1, price: 299.99 },
  ];

  for (const booking of bookingsToCreate) {
    if (createdUsers[booking.userIndex]) {
      try {
        const user = createdUsers[booking.userIndex];
        const bookingData = {
          user_id: user.user_id,
          booking_type: 'FLIGHT',
          reference_id: booking.flightId,
          provider_name: 'Direct',
          start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          end_date: null,
          quantity: booking.quantity,
          unit_price: booking.price,
          total_price: booking.price * booking.quantity,
          traveler_details: [{
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            isPrimary: true
          }],
          special_requests: null
        };

        await axios.post(`${API_BASE}/traveler/bookings`, bookingData);
        console.log(`  ✅ Created booking: ${user.first_name} ${user.last_name} → ${booking.flightId} (${booking.quantity} seats)`);
      } catch (error) {
        console.log(`  ❌ Failed to create booking: ${error.response?.data?.message || error.message}`);
      }
    }
  }
  console.log('');

  console.log('🎉 Test data creation complete!\n');
  console.log('📊 Summary:');
  console.log(`  - ${testFlights.length} flights created`);
  console.log(`  - ${testHotels.length} hotels created`);
  console.log(`  - ${createdUsers.length} users created`);
  console.log(`  - ${bookingsToCreate.length} bookings created`);
  console.log('');
  console.log('🌐 Access the platforms:');
  console.log('  - Admin: http://localhost:3000 (admin@kayak.com / Admin@123)');
  console.log('  - Traveler: http://localhost:3001 (use any created user email / password123)');
  console.log('');
  console.log('✅ Ready for testing and analytics!');
}

createTestData().catch(error => {
  console.error('❌ Error creating test data:', error.message);
  process.exit(1);
});
