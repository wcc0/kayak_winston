/**
 * Kaggle Data Import Script
 * 
 * Loads and normalizes data from downloaded Kaggle datasets:
 * 1. Inside Airbnb NYC (hotels/listings)
 * 2. Hotel Booking Demand (behavioral data)
 * 3. Flight Prices (Expedia)
 * 4. Global Airports (reference data)
 * 5. US Flight Delays (optional context)
 * 
 * Usage:
 *   node scripts/import-kaggle-data.js
 * 
 * Requires:
 *   - MySQL running with kayak_admin database
 *   - MongoDB running
 *   - Redis running
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const redis = require('redis');
require('dotenv').config();

// Configuration
const MYSQL_CONFIG = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '1234',
  database: process.env.MYSQL_DATABASE || 'kayak_admin',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kayak_admin';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATA_ROOT = path.join(__dirname, '../data/raw');

// ============================================================================
// SCHEMAS & MODELS
// ============================================================================

// MongoDB Schemas
const hotelSchema = new mongoose.Schema({
  source: String,
  listing_id: { type: String, unique: true, sparse: true },
  name: String,
  city: String,
  country: String,
  room_type: String,
  price: Number,
  price_currency: { type: String, default: 'USD' },
  amenities: [String],
  availability_days: Number,
  reviews_count: Number,
  rating: Number,
  latitude: Number,
  longitude: Number,
  neighbourhood: String,
  updated_at: { type: Date, default: Date.now },
  raw_data: mongoose.Schema.Types.Mixed
});

const flightSchema = new mongoose.Schema({
  source: String,
  flight_id: { type: String, unique: true, sparse: true },
  airline: String,
  departure_airport: String,
  arrival_airport: String,
  departure_time: Date,
  arrival_time: Date,
  price: Number,
  price_currency: { type: String, default: 'USD' },
  distance_km: Number,
  duration_minutes: Number,
  seats_available: Number,
  class: { type: String, default: 'economy' },
  updated_at: { type: Date, default: Date.now },
  raw_data: mongoose.Schema.Types.Mixed
});

const airportSchema = new mongoose.Schema({
  iata: { type: String, unique: true },
  icao: String,
  name: String,
  city: String,
  country: String,
  latitude: Number,
  longitude: Number,
  timezone: String,
  altitude: Number,
  updated_at: { type: Date, default: Date.now }
});

const Hotel = mongoose.model('Hotel', hotelSchema);
const Flight = mongoose.model('Flight', flightSchema);
const Airport = mongoose.model('Airport', airportSchema);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

function normalizePrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = String(priceStr).replace(/[$,]/g, '').trim();
  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
}

function parseAmenities(amenitiesStr) {
  if (!amenitiesStr) return [];
  // Handle both quoted JSON arrays and pipe-separated strings
  try {
    if (amenitiesStr.startsWith('[')) {
      return JSON.parse(amenitiesStr);
    }
  } catch (e) {
    // Fallback to pipe-separated parsing
  }
  return String(amenitiesStr)
    .split('|')
    .map(a => a.trim())
    .filter(a => a);
}

// ============================================================================
// DATA LOADING FUNCTIONS
// ============================================================================

async function loadAirbnbNYC() {
  console.log('📥 Loading Inside Airbnb NYC...');
  
  const possiblePaths = [
    path.join(DATA_ROOT, 'inside-airbnb-nyc', 'data', 'new york city', 'listings.csv'),
    path.join(DATA_ROOT, 'inside-airbnb-nyc', 'data', 'New York City', 'listings.csv'),
    path.join(DATA_ROOT, 'dominoweir_inside-airbnb-nyc', 'data', 'new york city', 'listings.csv'),
    path.join(DATA_ROOT, 'dominoweir_inside-airbnb-nyc', 'listings.csv'),
  ];
  
  let filePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }
  
  if (!filePath) {
    console.warn('⚠️  Inside Airbnb NYC not found. Skipping...');
    return [];
  }
  
  const rows = await readCSV(filePath);
  console.log(`✅ Loaded ${rows.length} Airbnb listings`);
  
  return rows.map(row => ({
    source: 'inside_airbnb_nyc',
    listing_id: row.id || row.listing_id,
    name: row.name,
    city: 'New York City',
    country: 'USA',
    room_type: row.room_type,
    price: normalizePrice(row.price),
    amenities: parseAmenities(row.amenities),
    availability_days: parseInt(row.availability_365 || 0),
    reviews_count: parseInt(row.number_of_reviews || 0),
    rating: parseFloat(row.review_scores_rating || 0) || null,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    neighbourhood: row.neighbourhood || row.neighbourhood_cleansed,
    raw_data: row
  }));
}

async function loadHotelBookingDemand() {
  console.log('📥 Loading Hotel Booking Demand...');
  
  const possiblePaths = [
    path.join(DATA_ROOT, 'hotel-booking', 'hotel_bookings.csv'),
    path.join(DATA_ROOT, 'hotel-booking', 'data', 'hotel_bookings.csv'),
  ];
  
  let filePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }
  
  if (!filePath) {
    console.warn('⚠️  Hotel Booking Demand not found. Skipping...');
    return [];
  }
  
  const rows = await readCSV(filePath);
  console.log(`✅ Loaded ${rows.length} hotel booking records`);
  
  // Aggregate by hotel to create synthetic hotel records
  const hotelMap = {};
  rows.forEach(row => {
    const hotelKey = row.hotel || 'general_hotel';
    if (!hotelMap[hotelKey]) {
      hotelMap[hotelKey] = {
        source: 'hotel_booking_demand',
        name: `${hotelKey} Hotel`,
        city: row.country || 'Unknown',
        country: 'USA',
        room_type: hotelKey === 'City Hotel' ? 'city' : 'resort',
        total_bookings: 0,
        avg_adr: 0,
        lead_times: [],
        raw_data: []
      };
    }
    
    hotelMap[hotelKey].total_bookings += 1;
    hotelMap[hotelKey].avg_adr += (parseFloat(row.adr) || 0);
    hotelMap[hotelKey].lead_times.push(parseInt(row.lead_time || 0));
    hotelMap[hotelKey].raw_data.push(row);
  });
  
  return Object.entries(hotelMap).map(([key, hotel], idx) => ({
    ...hotel,
    listing_id: `hbd_${idx}`,
    price: hotel.total_bookings > 0 ? Math.round(hotel.avg_adr / hotel.total_bookings) : 0,
    availability_days: 365,
    reviews_count: hotel.total_bookings
  }));
}

async function loadFlightPrices() {
  console.log('📥 Loading Flight Prices...');
  
  const possiblePaths = [
    path.join(DATA_ROOT, 'flightprices', 'flightprices.csv'),
    path.join(DATA_ROOT, 'flightprices', 'data', 'flightprices.csv'),
  ];
  
  let filePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }
  
  if (!filePath) {
    console.warn('⚠️  Flight Prices not found. Skipping...');
    return [];
  }
  
  const rows = await readCSV(filePath);
  console.log(`✅ Loaded ${rows.length} flight price records`);
  
  return rows.slice(0, 5000).map((row, idx) => ({
    source: 'flight_prices',
    flight_id: `fp_${idx}`,
    airline: row.airline || 'Unknown',
    departure_airport: row.startingAirport,
    arrival_airport: row.destinationAirport,
    departure_time: new Date(row.startDate),
    price: normalizePrice(row.farePrimaryLeg),
    distance_km: null,
    duration_minutes: parseInt(row.travelDuration) || null,
    seats_available: Math.floor(Math.random() * 100) + 10,
    class: 'economy',
    raw_data: row
  }));
}

async function loadAirports() {
  console.log('📥 Loading Global Airports...');
  
  const possiblePaths = [
    path.join(DATA_ROOT, 'global-airports', 'airports.csv'),
    path.join(DATA_ROOT, 'samvelkoch_global-airports', 'airports.csv'),
  ];
  
  let filePath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      filePath = p;
      break;
    }
  }
  
  if (!filePath) {
    console.warn('⚠️  Global Airports not found. Skipping...');
    return [];
  }
  
  const rows = await readCSV(filePath);
  console.log(`✅ Loaded ${rows.length} airports`);
  
  return rows
    .filter(row => row.IATA && row.IATA.length === 3)
    .map(row => ({
      iata: row.IATA,
      icao: row.ICAO,
      name: row['Airport Name'] || row.name,
      city: row.City || row.city,
      country: row.Country || row.country,
      latitude: parseFloat(row.Latitude),
      longitude: parseFloat(row.Longitude),
      timezone: row.Timezone || row.timezone
    }));
}

// ============================================================================
// DATABASE OPERATIONS
// ============================================================================

async function insertHotels(hotels) {
  console.log(`💾 Inserting ${hotels.length} hotels into MongoDB...`);
  
  if (hotels.length === 0) {
    console.log('⏭️  No hotels to insert');
    return;
  }
  
  try {
    const result = await Hotel.insertMany(hotels, { ordered: false });
    console.log(`✅ Inserted ${result.length} hotel records`);
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error - expected if re-running
      console.log('⚠️  Some hotels already exist (duplicate IDs skipped)');
    } else {
      throw err;
    }
  }
}

async function insertFlights(flights) {
  console.log(`💾 Inserting ${flights.length} flights into MongoDB...`);
  
  if (flights.length === 0) {
    console.log('⏭️  No flights to insert');
    return;
  }
  
  try {
    const result = await Flight.insertMany(flights, { ordered: false });
    console.log(`✅ Inserted ${result.length} flight records`);
  } catch (err) {
    if (err.code === 11000) {
      console.log('⚠️  Some flights already exist (duplicate IDs skipped)');
    } else {
      throw err;
    }
  }
}

async function insertAirports(airports) {
  console.log(`💾 Inserting ${airports.length} airports into MongoDB...`);
  
  if (airports.length === 0) {
    console.log('⏭️  No airports to insert');
    return;
  }
  
  try {
    const result = await Airport.insertMany(airports, { ordered: false });
    console.log(`✅ Inserted ${result.length} airport records`);
  } catch (err) {
    if (err.code === 11000) {
      console.log('⚠️  Some airports already exist (duplicate IATA codes skipped)');
    } else {
      throw err;
    }
  }
}

async function createMySQLTables(connection) {
  console.log('🛠️  Creating MySQL tables...');
  
  const createHotelsTable = `
    CREATE TABLE IF NOT EXISTS hotels (
      id INT AUTO_INCREMENT PRIMARY KEY,
      source VARCHAR(50),
      listing_id VARCHAR(100) UNIQUE,
      name VARCHAR(255),
      city VARCHAR(100),
      country VARCHAR(100),
      room_type VARCHAR(50),
      price DECIMAL(10, 2),
      price_currency VARCHAR(10),
      availability_days INT,
      reviews_count INT,
      rating DECIMAL(3, 2),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      neighbourhood VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_city (city),
      INDEX idx_price (price),
      INDEX idx_source (source)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  
  const createFlightsTable = `
    CREATE TABLE IF NOT EXISTS flights (
      id INT AUTO_INCREMENT PRIMARY KEY,
      source VARCHAR(50),
      flight_id VARCHAR(100) UNIQUE,
      airline VARCHAR(100),
      departure_airport VARCHAR(10),
      arrival_airport VARCHAR(10),
      departure_time DATETIME,
      arrival_time DATETIME,
      price DECIMAL(10, 2),
      price_currency VARCHAR(10),
      distance_km INT,
      duration_minutes INT,
      seats_available INT,
      class VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_route (departure_airport, arrival_airport),
      INDEX idx_price (price),
      INDEX idx_departure (departure_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  
  const createAirportsTable = `
    CREATE TABLE IF NOT EXISTS airports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      iata VARCHAR(10) UNIQUE,
      icao VARCHAR(10),
      name VARCHAR(255),
      city VARCHAR(100),
      country VARCHAR(100),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      timezone VARCHAR(50),
      altitude INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_iata (iata),
      INDEX idx_city (city),
      INDEX idx_country (country)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `;
  
  try {
    await connection.execute(createHotelsTable);
    console.log('✅ Hotels table created');
    
    await connection.execute(createFlightsTable);
    console.log('✅ Flights table created');
    
    await connection.execute(createAirportsTable);
    console.log('✅ Airports table created');
  } catch (err) {
    console.warn('⚠️  Tables may already exist:', err.message);
  }
}

async function insertIntoMySQL(connection, hotels, flights, airports) {
  console.log('💾 Inserting data into MySQL...');
  
  try {
    // Insert hotels
    if (hotels.length > 0) {
      const hotelValues = hotels.map(h => [
        h.source, h.listing_id, h.name, h.city, h.country, h.room_type,
        h.price, 'USD', h.availability_days, h.reviews_count || 0,
        h.rating || null, h.latitude || null, h.longitude || null, h.neighbourhood
      ]);
      
      await connection.query(
        `INSERT INTO hotels (source, listing_id, name, city, country, room_type, price, price_currency, availability_days, reviews_count, rating, latitude, longitude, neighbourhood) VALUES ?`,
        [hotelValues]
      );
      console.log(`✅ Inserted ${hotels.length} hotels into MySQL`);
    }
    
    // Insert flights
    if (flights.length > 0) {
      const flightValues = flights.map(f => [
        f.source, f.flight_id, f.airline, f.departure_airport, f.arrival_airport,
        f.departure_time, f.arrival_time, f.price, 'USD', f.distance_km,
        f.duration_minutes, f.seats_available, f.class
      ]);
      
      await connection.query(
        `INSERT INTO flights (source, flight_id, airline, departure_airport, arrival_airport, departure_time, arrival_time, price, price_currency, distance_km, duration_minutes, seats_available, class) VALUES ?`,
        [flightValues]
      );
      console.log(`✅ Inserted ${flights.length} flights into MySQL`);
    }
    
    // Insert airports
    if (airports.length > 0) {
      const airportValues = airports.map(a => [
        a.iata, a.icao, a.name, a.city, a.country, a.latitude, a.longitude, a.timezone, a.altitude || null
      ]);
      
      await connection.query(
        `INSERT INTO airports (iata, icao, name, city, country, latitude, longitude, timezone, altitude) VALUES ?`,
        [airportValues]
      );
      console.log(`✅ Inserted ${airports.length} airports into MySQL`);
    }
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.warn('⚠️  Some records already exist in MySQL (duplicates skipped)');
    } else {
      throw err;
    }
  }
}

// ============================================================================
// MAIN ORCHESTRATION
// ============================================================================

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🚀 Starting Kaggle Data Import for Kayak Platform');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  let mongoConnection = null;
  let mysqlConnection = null;
  let redisClient = null;
  
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected\n');
    
    // Connect to MySQL
    console.log('🔌 Connecting to MySQL...');
    const pool = mysql.createPool(MYSQL_CONFIG);
    mysqlConnection = await pool.getConnection();
    console.log('✅ MySQL connected\n');
    
    // Create MySQL tables
    await createMySQLTables(mysqlConnection);
    console.log();
    
    // Load all datasets
    const [hotels, flights, airports] = await Promise.all([
      loadAirbnbNYC(),
      loadFlightPrices(),
      loadAirports()
    ]);
    
    // Also load hotel booking demand
    const bookingHotels = await loadHotelBookingDemand();
    const allHotels = [...hotels, ...bookingHotels];
    
    console.log();
    
    // Insert into MongoDB
    await Promise.all([
      insertHotels(allHotels),
      insertFlights(flights),
      insertAirports(airports)
    ]);
    
    console.log();
    
    // Insert into MySQL
    await insertIntoMySQL(mysqlConnection, allHotels, flights, airports);
    
    console.log();
    
    // Display summary
    const hotelCount = await Hotel.countDocuments();
    const flightCount = await Flight.countDocuments();
    const airportCount = await Airport.countDocuments();
    
    const [hotelRows] = await mysqlConnection.execute('SELECT COUNT(*) as count FROM hotels');
    const [flightRows] = await mysqlConnection.execute('SELECT COUNT(*) as count FROM flights');
    const [airportRows] = await mysqlConnection.execute('SELECT COUNT(*) as count FROM airports');
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Data Import Summary');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`MongoDB Hotels:  ${hotelCount}`);
    console.log(`MongoDB Flights: ${flightCount}`);
    console.log(`MongoDB Airports: ${airportCount}`);
    console.log();
    console.log(`MySQL Hotels:    ${hotelRows[0].count}`);
    console.log(`MySQL Flights:   ${flightRows[0].count}`);
    console.log(`MySQL Airports:  ${airportRows[0].count}`);
    console.log('═══════════════════════════════════════════════════════════\n');
    
    console.log('✅ Data import completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Backend is configured with caching middleware');
    console.log('2. Restart backend pod to start serving data');
    console.log('3. Test endpoints: GET /api/admin/listings/hotels');
    console.log('4. Monitor cache hits: GET /metrics/cache\n');
    
  } catch (error) {
    console.error('❌ Error during data import:', error);
    process.exit(1);
  } finally {
    // Cleanup
    if (mysqlConnection) await mysqlConnection.release();
    if (mongoConnection) await mongoose.disconnect();
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { readCSV, normalizePrice, parseAmenities };
