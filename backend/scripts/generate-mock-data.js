/**
 * Mock Data Generator for Testing
 * 
 * Generates realistic test data without requiring Kaggle dataset downloads.
 * Useful for:
 * - Testing the import pipeline
 * - Verifying caching and performance
 * - Local development and demo
 * 
 * Usage:
 *   node scripts/generate-mock-data.js
 */

const fs = require('fs');
const path = require('path');

const DATA_RAW = path.join(__dirname, '../data/raw');

// Mock data generators
function generateHotels(count = 500) {
  const cities = ['New York City', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'];
  const roomTypes = ['Entire home/apt', 'Private room', 'Shared room', 'Hotel room'];
  const neighborhoods = ['Downtown', 'Midtown', 'Upper East Side', 'Brooklyn', 'Queens'];
  const amenities = [
    'WiFi', 'Kitchen', 'Air conditioning', 'Heating', 'TV', 'Washer', 'Dryer',
    'Parking', 'Gym', 'Pool', 'Hot tub', 'Barbecue grill', 'Pets allowed'
  ];

  const hotels = [];
  for (let i = 0; i < count; i++) {
    const price = Math.floor(Math.random() * 400) + 50;
    const randomAmenities = [];
    for (let j = 0; j < Math.floor(Math.random() * 8) + 2; j++) {
      randomAmenities.push(amenities[Math.floor(Math.random() * amenities.length)]);
    }
    
    hotels.push({
      id: `listing_${100000 + i}`,
      name: `${cities[Math.floor(Math.random() * cities.length)]} Apartment ${i}`,
      neighbourhood_cleansed: neighborhoods[Math.floor(Math.random() * neighborhoods.length)],
      room_type: roomTypes[Math.floor(Math.random() * roomTypes.length)],
      price: `$${price}`,
      availability_365: Math.floor(Math.random() * 365),
      number_of_reviews: Math.floor(Math.random() * 200),
      review_scores_rating: Math.floor(Math.random() * 50) / 10 + 4,
      latitude: 40.7128 + (Math.random() - 0.5) * 0.5,
      longitude: -74.0060 + (Math.random() - 0.5) * 0.5,
      amenities: randomAmenities.join(', ')
    });
  }
  return hotels;
}

function generateHotelBookings(count = 1000) {
  const hotels = ['City Hotel', 'Resort Hotel'];
  const meals = ['BB', 'HB', 'FB'];
  const countries = ['USA', 'Canada', 'UK', 'France', 'Germany'];
  const segments = ['Aviation', 'Complementary', 'Corporate', 'Online TA'];

  const bookings = [];
  for (let i = 0; i < count; i++) {
    bookings.push({
      hotel: hotels[Math.floor(Math.random() * hotels.length)],
      lead_time: Math.floor(Math.random() * 500),
      arrival_date_month: Math.floor(Math.random() * 12) + 1,
      stays_in_weekend_nights: Math.floor(Math.random() * 5),
      stays_in_week_nights: Math.floor(Math.random() * 10),
      adults: Math.floor(Math.random() * 4) + 1,
      children: Math.floor(Math.random() * 3),
      babies: Math.floor(Math.random() * 2),
      meal: meals[Math.floor(Math.random() * meals.length)],
      country: countries[Math.floor(Math.random() * countries.length)],
      market_segment: segments[Math.floor(Math.random() * segments.length)],
      adr: Math.floor(Math.random() * 300) + 20,
      customer_type: 'Transient',
      previous_cancellations: Math.floor(Math.random() * 3),
      booking_changes: Math.floor(Math.random() * 3),
      agent: Math.random() > 0.8 ? Math.floor(Math.random() * 500) : 0,
      company: Math.random() > 0.9 ? Math.floor(Math.random() * 100) : 0,
      days_in_waiting_list: Math.floor(Math.random() * 50),
      required_car_parking_spaces: Math.floor(Math.random() * 2),
      total_of_special_requests: Math.floor(Math.random() * 5),
      reservation_status: Math.random() > 0.1 ? 'Check-Out' : 'Cancelled'
    });
  }
  return bookings;
}

function generateFlights(count = 1000) {
  const airports = ['NYC', 'LAX', 'ORD', 'DFW', 'DEN', 'ATL', 'SFO', 'LAS', 'MIA'];
  const airlines = ['AA', 'DL', 'UA', 'SW', 'B6', 'NK', 'F9'];

  const flights = [];
  for (let i = 0; i < count; i++) {
    const depIdx = Math.floor(Math.random() * airports.length);
    let arrIdx = Math.floor(Math.random() * airports.length);
    while (arrIdx === depIdx) {
      arrIdx = Math.floor(Math.random() * airports.length);
    }

    const date = new Date(2025, Math.floor(Math.random() * 3), Math.floor(Math.random() * 28) + 1);
    
    flights.push({
      startingAirport: airports[depIdx],
      destinationAirport: airports[arrIdx],
      airline: airlines[Math.floor(Math.random() * airlines.length)],
      startDate: date.toISOString().split('T')[0],
      returnDate: new Date(date.getTime() + Math.floor(Math.random() * 14) * 86400000).toISOString().split('T')[0],
      farePrimaryLeg: Math.floor(Math.random() * 400) + 50,
      fareSeatUpgrade: Math.random() > 0.8 ? Math.floor(Math.random() * 100) + 10 : 0,
      travelDuration: Math.floor(Math.random() * 600) + 60
    });
  }
  return flights;
}

function generateAirports(count = 100) {
  const realAirports = [
    { iata: 'NYC', icao: 'KNYC', name: 'New York', city: 'New York', country: 'USA', tz: 'EST' },
    { iata: 'LAX', icao: 'KLAX', name: 'Los Angeles', city: 'Los Angeles', country: 'USA', tz: 'PST' },
    { iata: 'ORD', icao: 'KORD', name: 'Chicago', city: 'Chicago', country: 'USA', tz: 'CST' },
    { iata: 'DFW', icao: 'KDFW', name: 'Dallas/Fort Worth', city: 'Dallas', country: 'USA', tz: 'CST' },
    { iata: 'DEN', icao: 'KDEN', name: 'Denver', city: 'Denver', country: 'USA', tz: 'MST' },
    { iata: 'ATL', icao: 'KATL', name: 'Atlanta', city: 'Atlanta', country: 'USA', tz: 'EST' },
    { iata: 'SFO', icao: 'KSFO', name: 'San Francisco', city: 'San Francisco', country: 'USA', tz: 'PST' },
    { iata: 'LAS', icao: 'KLAS', name: 'Las Vegas', city: 'Las Vegas', country: 'USA', tz: 'PST' },
    { iata: 'MIA', icao: 'KMIA', name: 'Miami', city: 'Miami', country: 'USA', tz: 'EST' },
  ];

  const airports = [...realAirports];
  
  // Add some synthetic ones
  for (let i = realAirports.length; i < count; i++) {
    const iata = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                  String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
                  String.fromCharCode(65 + Math.floor(Math.random() * 26));
    
    if (!airports.find(a => a.iata === iata)) {
      airports.push({
        IATA: iata,
        ICAO: `K${iata}`,
        'Airport Name': `Airport ${iata}`,
        City: `City ${i}`,
        Country: 'USA',
        Latitude: 40 + Math.random() * 20 - 10,
        Longitude: -100 + Math.random() * 30 - 15,
        Timezone: 'UTC'
      });
    }
  }
  
  return airports;
}

function writeCSV(filename, data, headers) {
  if (data.length === 0) return;
  
  // Guess headers if not provided
  if (!headers) {
    headers = Object.keys(data[0]);
  }
  
  let csv = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      let value = row[header];
      if (value === undefined || value === null) {
        return '';
      }
      // Escape quotes and wrap if contains comma
      if (typeof value === 'string') {
        if (value.includes(',') || value.includes('"')) {
          value = '"' + value.replace(/"/g, '""') + '"';
        }
      }
      return value;
    });
    csv += values.join(',') + '\n';
  });
  
  fs.writeFileSync(filename, csv);
}

// Main
async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🛠️  Generating Mock Kaggle Datasets');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Create directories
  fs.mkdirSync(path.join(DATA_RAW, 'inside-airbnb-nyc', 'data', 'new york city'), { recursive: true });
  fs.mkdirSync(path.join(DATA_RAW, 'hotel-booking'), { recursive: true });
  fs.mkdirSync(path.join(DATA_RAW, 'flightprices'), { recursive: true });
  fs.mkdirSync(path.join(DATA_RAW, 'global-airports'), { recursive: true });
  
  // Generate and write files
  console.log('Generating Airbnb data...');
  const hotels = generateHotels(500);
  writeCSV(
    path.join(DATA_RAW, 'inside-airbnb-nyc', 'data', 'new york city', 'listings.csv'),
    hotels
  );
  console.log(`✓ Generated ${hotels.length} hotel listings`);
  
  console.log('Generating hotel booking demand...');
  const bookings = generateHotelBookings(1000);
  writeCSV(
    path.join(DATA_RAW, 'hotel-booking', 'hotel_bookings.csv'),
    bookings
  );
  console.log(`✓ Generated ${bookings.length} hotel bookings`);
  
  console.log('Generating flight prices...');
  const flights = generateFlights(1000);
  writeCSV(
    path.join(DATA_RAW, 'flightprices', 'flightprices.csv'),
    flights
  );
  console.log(`✓ Generated ${flights.length} flight records`);
  
  console.log('Generating airports...');
  const airports = generateAirports(50);
  writeCSV(
    path.join(DATA_RAW, 'global-airports', 'airports.csv'),
    airports
  );
  console.log(`✓ Generated ${airports.length} airport records`);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('✅ Mock datasets generated successfully!');
  console.log(`📁 Data location: ${DATA_RAW}`);
  console.log('\nNext: node scripts/import-kaggle-data.js');
  console.log('═══════════════════════════════════════════════════════════\n');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateHotels, generateFlights, generateAirports };
