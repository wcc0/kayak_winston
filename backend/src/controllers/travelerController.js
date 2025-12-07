const { mysqlPool } = require('../config/database');
const bcrypt = require('bcryptjs');
const Booking = require('../models/Booking');

const travelerController = {
  // Register new traveler user
  registerUser: async (req, res) => {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      const { 
        first_name, 
        last_name, 
        email, 
        password, 
        phone,
        ssn,
        profile_picture_url
      } = req.body;

      // Validate required fields
      if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({
          success: false,
          message: 'First name, last_name, email, and password are required'
        });
      }

      // Check if email already exists
      const [existing] = await connection.execute(
        'SELECT user_id FROM users WHERE email = ?',
        [email]
      );

      if (existing.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Use provided SSN or generate one
      let userId;
      if (ssn && /^\d{3}-\d{2}-\d{4}$/.test(ssn)) {
        // Validate provided SSN is unique
        const [check] = await connection.execute(
          'SELECT user_id FROM users WHERE user_id = ?',
          [ssn]
        );
        if (check.length > 0) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'SSN already registered'
          });
        }
        userId = ssn;
      } else {
        // Generate SSN-format user_id (XXX-XX-XXXX)
        const generateSSN = () => {
          const part1 = Math.floor(100 + Math.random() * 900); // 100-999
          const part2 = Math.floor(10 + Math.random() * 90);   // 10-99
          const part3 = Math.floor(1000 + Math.random() * 9000); // 1000-9999
          return `${part1}-${part2}-${part3}`;
        };

        userId = generateSSN();
        
        // Ensure unique SSN
        let attempts = 0;
        while (attempts < 10) {
          const [check] = await connection.execute(
            'SELECT user_id FROM users WHERE user_id = ?',
            [userId]
          );
          if (check.length === 0) break;
          userId = generateSSN();
          attempts++;
        }
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user
      await connection.execute(
        `INSERT INTO users (user_id, first_name, last_name, email, password, phone_number, is_active, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
        [userId, first_name, last_name, email, hashedPassword, phone || null]
      );

      await connection.commit();

      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { user_id: userId, email },
        process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production',
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            user_id: userId,
            email,
            first_name,
            last_name,
            phone: phone || null
          },
          token
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Register user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register user',
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  // Login traveler user
  loginUser: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user by email
      const [users] = await mysqlPool.execute(
        'SELECT user_id, first_name, last_name, email, password, phone_number FROM users WHERE email = ? AND is_active = 1',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const user = users[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Return user data (without password)
      // Generate JWT token
      const jwt = require('jsonwebtoken');
      const token = jwt.sign(
        { user_id: user.user_id, email: user.email },
        process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production',
        { expiresIn: process.env.JWT_EXPIRE || '24h' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            user_id: user.user_id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            phone: user.phone_number
          },
          token
        }
      });
    } catch (error) {
      console.error('Login user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to login',
        error: error.message
      });
    }
  },

  // Create booking
  createBooking: async (req, res) => {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        user_id,
        booking_type, // 'FLIGHT', 'HOTEL', 'CAR'
        reference_id, // flight_id, hotel_id, car_id
        provider_name,
        start_date,
        end_date,
        quantity,
        unit_price,
        total_price,
        traveler_details,
        special_requests
      } = req.body;

      // Validate required fields
      if (!user_id || !booking_type || !reference_id || !start_date || !unit_price || !total_price) {
        return res.status(400).json({
          success: false,
          message: 'Missing required booking fields'
        });
      }

      // Verify user exists
      const [users] = await connection.execute(
        'SELECT user_id FROM users WHERE user_id = ?',
        [user_id]
      );

      if (users.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check availability and reduce inventory
      const bookingTypeUpper = booking_type.toUpperCase();
      
      if (bookingTypeUpper === 'FLIGHT') {
        const [flights] = await connection.execute(
          'SELECT available_seats FROM flights WHERE flight_id = ? FOR UPDATE',
          [reference_id]
        );
        
        if (flights.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: 'Flight not found'
          });
        }
        
        if (flights[0].available_seats < (quantity || 1)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'Not enough seats available'
          });
        }
        
        // Reduce available seats
        await connection.execute(
          'UPDATE flights SET available_seats = available_seats - ? WHERE flight_id = ?',
          [quantity || 1, reference_id]
        );
      } else if (bookingTypeUpper === 'HOTEL') {
        const [hotels] = await connection.execute(
          'SELECT available_rooms FROM hotels WHERE hotel_id = ? FOR UPDATE',
          [reference_id]
        );
        
        if (hotels.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: 'Hotel not found'
          });
        }
        
        if (hotels[0].available_rooms < (quantity || 1)) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'Not enough rooms available'
          });
        }
        
        await connection.execute(
          'UPDATE hotels SET available_rooms = available_rooms - ? WHERE hotel_id = ?',
          [quantity || 1, reference_id]
        );
      } else if (bookingTypeUpper === 'CAR') {
        const [cars] = await connection.execute(
          'SELECT availability_status FROM cars WHERE car_id = ? FOR UPDATE',
          [reference_id]
        );
        
        if (cars.length === 0) {
          await connection.rollback();
          return res.status(404).json({
            success: false,
            message: 'Car not found'
          });
        }
        
        if (cars[0].availability_status !== 'AVAILABLE') {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'Car not available'
          });
        }
        
        await connection.execute(
          'UPDATE cars SET availability_status = "RENTED" WHERE car_id = ?',
          [reference_id]
        );
      }

      // Create booking
      const bookingId = 'BK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();

      await connection.execute(
        `INSERT INTO bookings (
          booking_id, user_id, booking_type, booking_ref,
          start_date, end_date, status, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, 'CONFIRMED', ?)`,
        [
          bookingId,
          user_id,
          bookingTypeUpper,
          reference_id,
          start_date,
          end_date || null,
          total_price
        ]
      );

      // Create billing record
      const billingId = 'BIL-' + Date.now();
      await connection.execute(
        `INSERT INTO billing (
          billing_id, user_id, booking_type, booking_id, 
          transaction_date, total_amount, payment_method, transaction_status
        ) VALUES (?, ?, ?, ?, NOW(), ?, 'Credit Card', 'COMPLETED')`,
        [billingId, user_id, bookingTypeUpper, bookingId, total_price]
      );

      await connection.commit();

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: {
          booking_id: bookingId,
          confirmation_number: bookingId,
          billing_id: billingId
        }
      });
    } catch (error) {
      await connection.rollback();
      console.error('Create booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: error.message
      });
    } finally {
      connection.release();
    }
  },

  // Get user bookings
  getUserBookings: async (req, res) => {
    try {
      const { userId } = req.params;

      const [bookings] = await mysqlPool.execute(
        `SELECT 
          b.*,
          CASE 
            WHEN b.booking_type = 'FLIGHT' THEN f.airline_name
            WHEN b.booking_type = 'HOTEL' THEN h.hotel_name
            WHEN b.booking_type = 'CAR' THEN c.company_name
          END as name,
          CASE 
            WHEN b.booking_type = 'FLIGHT' THEN f.departure_airport
          END as departure_airport,
          CASE 
            WHEN b.booking_type = 'FLIGHT' THEN f.arrival_airport
          END as arrival_airport,
          CASE 
            WHEN b.booking_type = 'HOTEL' THEN h.city
          END as location,
          CASE 
            WHEN b.booking_type = 'CAR' THEN c.model
          END as model
        FROM bookings b
        LEFT JOIN flights f ON b.booking_type = 'FLIGHT' AND b.reference_id = f.flight_id
        LEFT JOIN hotels h ON b.booking_type = 'HOTEL' AND b.reference_id = h.hotel_id
        LEFT JOIN cars c ON b.booking_type = 'CAR' AND b.reference_id = c.car_id
        WHERE b.user_id = ?
        ORDER BY b.created_at DESC`,
        [userId]
      );

      // Parse traveler_details JSON
      const parsedBookings = bookings.map(b => ({
        ...b,
        traveler_details: typeof b.traveler_details === 'string' 
          ? JSON.parse(b.traveler_details) 
          : b.traveler_details
      }));

      res.json({
        success: true,
        message: 'Bookings retrieved successfully',
        data: parsedBookings
      });
    } catch (error) {
      console.error('Get user bookings error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve bookings',
        error: error.message
      });
    }
  },

  // Cancel booking
  cancelBooking: async (req, res) => {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      const { bookingId } = req.params;

      // Get booking details
      const [bookings] = await connection.execute(
        'SELECT * FROM bookings WHERE booking_id = ? FOR UPDATE',
        [bookingId]
      );

      if (bookings.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      const booking = bookings[0];

      if (booking.status === 'CANCELLED') {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Booking already cancelled'
        });
      }

      // Update booking status
      await connection.execute(
        'UPDATE bookings SET status = "CANCELLED" WHERE booking_id = ?',
        [bookingId]
      );

      // Restore inventory
      if (booking.booking_type === 'FLIGHT') {
        await connection.execute(
          'UPDATE flights SET available_seats = available_seats + ? WHERE flight_id = ?',
          [booking.quantity, booking.reference_id]
        );
      } else if (booking.booking_type === 'HOTEL') {
        await connection.execute(
          'UPDATE hotels SET available_rooms = available_rooms + ? WHERE hotel_id = ?',
          [booking.quantity, booking.reference_id]
        );
      } else if (booking.booking_type === 'CAR') {
        await connection.execute(
          'UPDATE cars SET availability_status = "AVAILABLE" WHERE car_id = ?',
          [booking.reference_id]
        );
      }

      // Update billing status
      await connection.execute(
        'UPDATE billing SET transaction_status = "REFUNDED" WHERE booking_id = ?',
        [bookingId]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Booking cancelled successfully'
      });
    } catch (error) {
      await connection.rollback();
      console.error('Cancel booking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel booking',
        error: error.message
      });
    } finally {
      connection.release();
    }
  }
};

module.exports = travelerController;
