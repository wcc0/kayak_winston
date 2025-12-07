const { mysqlPool } = require('../config/database');
const ActivityLog = require('../models/ActivityLog');
const { cacheHelper } = require('../config/redis');
const { producer } = require('../config/kafka');

const listingsController = {
  // Add Flight
  addFlight: async (req, res) => {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      const flightData = req.body;
      const query = `
        INSERT INTO flights (
          flight_id, airline_name, departure_airport, arrival_airport,
          departure_datetime, arrival_datetime, duration, flight_class,
          ticket_price, total_seats, available_seats
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(query, [
        flightData.flight_id,
        flightData.airline_name,
        flightData.departure_airport,
        flightData.arrival_airport,
        flightData.departure_datetime,
        flightData.arrival_datetime,
        flightData.duration,
        flightData.flight_class,
        flightData.ticket_price,
        flightData.total_seats,
        flightData.available_seats || flightData.total_seats
      ]);

      await connection.commit();

      // Invalidate cache
      await cacheHelper.delPattern('flights:*');

      // Send Kafka event
      await producer.send({
        topic: 'admin-listings-create',
        messages: [{
          key: flightData.flight_id,
          value: JSON.stringify({
            type: 'FLIGHT',
            action: 'CREATE',
            data: flightData,
            admin_id: req.admin.admin_id,
            timestamp: new Date().toISOString()
          })
        }]
      });

      // Log activity
      await ActivityLog.create({
        admin_id: req.admin.admin_id,
        action: 'CREATE_LISTING',
        entity_type: 'FLIGHT',
        entity_id: flightData.flight_id,
        details: flightData,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        status: 'SUCCESS'
      });

      res.status(201).json({
        success: true,
        message: 'Flight added successfully',
        data: { flight_id: flightData.flight_id }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Add flight error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add flight',
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  // Add Hotel
  addHotel: async (req, res) => {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      const hotelData = req.body;
      const query = `
        INSERT INTO hotels (
          hotel_id, hotel_name, address, city, state, zip_code,
          star_rating, total_rooms, available_rooms, room_type,
          price_per_night, amenities
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(query, [
        hotelData.hotel_id,
        hotelData.hotel_name,
        hotelData.address,
        hotelData.city,
        hotelData.state,
        hotelData.zip_code,
        hotelData.star_rating,
        hotelData.total_rooms,
        hotelData.available_rooms || hotelData.total_rooms,
        hotelData.room_type,
        hotelData.price_per_night,
        JSON.stringify(hotelData.amenities || [])
      ]);

      await connection.commit();

      // Invalidate cache
      await cacheHelper.delPattern('hotels:*');

      // Send Kafka event
      await producer.send({
        topic: 'admin-listings-create',
        messages: [{
          key: hotelData.hotel_id,
          value: JSON.stringify({
            type: 'HOTEL',
            action: 'CREATE',
            data: hotelData,
            admin_id: req.admin.admin_id,
            timestamp: new Date().toISOString()
          })
        }]
      });

      // Log activity
      await ActivityLog.create({
        admin_id: req.admin.admin_id,
        action: 'CREATE_LISTING',
        entity_type: 'HOTEL',
        entity_id: hotelData.hotel_id,
        details: hotelData,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        status: 'SUCCESS'
      });

      res.status(201).json({
        success: true,
        message: 'Hotel added successfully',
        data: { hotel_id: hotelData.hotel_id }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Add hotel error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add hotel',
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  // Add Car
  addCar: async (req, res) => {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      const carData = req.body;
      const query = `
        INSERT INTO cars (
          car_id, car_type, company_name, model, year,
          transmission_type, seats, daily_rental_price, availability_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(query, [
        carData.car_id,
        carData.car_type,
        carData.company_name,
        carData.model,
        carData.year,
        carData.transmission_type,
        carData.seats,
        carData.daily_rental_price,
        carData.availability_status || 'AVAILABLE'
      ]);

      await connection.commit();

      // Invalidate cache
      await cacheHelper.delPattern('cars:*');

      // Send Kafka event
      await producer.send({
        topic: 'admin-listings-create',
        messages: [{
          key: carData.car_id,
          value: JSON.stringify({
            type: 'CAR',
            action: 'CREATE',
            data: carData,
            admin_id: req.admin.admin_id,
            timestamp: new Date().toISOString()
          })
        }]
      });

      // Log activity
      await ActivityLog.create({
        admin_id: req.admin.admin_id,
        action: 'CREATE_LISTING',
        entity_type: 'CAR',
        entity_id: carData.car_id,
        details: carData,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        status: 'SUCCESS'
      });

      res.status(201).json({
        success: true,
        message: 'Car added successfully',
        data: { car_id: carData.car_id }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Add car error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add car',
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  // Search Listings
  searchListings: async (req, res) => {
    try {
      const { type, keyword } = req.query;
      
      if (!type || !['flight', 'hotel', 'car'].includes(type.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid listing type. Must be flight, hotel, or car'
        });
      }

      const cacheKey = `listings:search:${type}:${keyword}`;
      const cached = await cacheHelper.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          message: 'Listings retrieved from cache',
          data: cached,
          cached: true
        });
      }

      let query;
      let params = [`%${keyword}%`];

      if (type === 'flight') {
        query = `
          SELECT * FROM flights 
          WHERE airline_name LIKE ? OR departure_airport LIKE ? OR arrival_airport LIKE ?
          LIMIT 50
        `;
        params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`];
      } else if (type === 'hotel') {
        query = `
          SELECT * FROM hotels 
          WHERE hotel_name LIKE ? OR city LIKE ? OR state LIKE ?
          LIMIT 50
        `;
        params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`];
      } else if (type === 'car') {
        query = `
          SELECT * FROM cars 
          WHERE company_name LIKE ? OR model LIKE ? OR car_type LIKE ?
          LIMIT 50
        `;
        params = [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`];
      }

      const [results] = await mysqlPool.execute(query, params);

      // Cache results
      await cacheHelper.set(cacheKey, results);

      res.json({
        success: true,
        message: 'Listings retrieved successfully',
        data: results,
        count: results.length
      });
    } catch (error) {
      console.error('Search listings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search listings',
        error: error.message
      });
    }
  }
};

module.exports = listingsController;
