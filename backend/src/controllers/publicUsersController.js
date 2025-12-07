const { mysqlPool } = require('../config/database');
const { cacheHelper } = require('../config/redis');
const { producer } = require('../config/kafka');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const publicUsersController = {
  // Register a new user
  register: async (req, res) => {
    try {
      const userData = req.body;

      // Ensure user doesn't already exist
      const existing = await User.findByEmail(userData.email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      // Create user (password will be hashed in model if provided). If user_id
      // wasn't provided it will be generated in SSN format by the model.
      const created = await User.create(userData);

      // Invalidate user list cache
      await cacheHelper.delPattern('users:all:*');

      res.status(201).json({ success: true, message: 'User registered successfully', data: { user_id: created.user_id } });
    } catch (error) {
      console.error('Register user error:', error);
      res.status(500).json({ success: false, message: 'Failed to register user', error: error.message });
    }
  },

  // User login (email + password)
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findByEmail(email);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      const passwordMatches = await User.comparePassword(password, user.password);
      if (!passwordMatches) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      // Optionally update last_login if you store it
      // Generate token
      const token = jwt.sign({ user_id: user.user_id || user.id || null, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '24h' });

      // Log activity (no admin context)
      await ActivityLog.create({
        admin_id: null,
        action: 'USER_LOGIN',
        entity_type: 'USER',
        entity_id: user.user_id || null,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        status: 'SUCCESS'
      }).catch(() => {});

      // Remove password from response
      const { password: _, ...userSafe } = user;

      res.json({ success: true, message: 'Login successful', data: { user: userSafe, token } });
    } catch (error) {
      console.error('User login error:', error);
      res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
  },

  // Get user profile
  getProfile: async (req, res) => {
    try {
      const { id } = req.params;

      const cacheKey = `user:${id}`;
      const cached = await cacheHelper.get(cacheKey);
      if (cached) return res.json({ success: true, message: 'User from cache', data: cached, cached: true });

      const user = await User.findById(id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      await cacheHelper.set(cacheKey, user);
      res.json({ success: true, message: 'User retrieved', data: user });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve user', error: error.message });
    }
  },

  // Update profile
  updateProfile: async (req, res) => {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();
      const { id } = req.params;
      const updates = req.body;

      const existing = await User.findById(id);
      if (!existing) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      await User.update(id, updates);
      await connection.commit();

      // Invalidate caches
      await cacheHelper.del(`user:${id}`);
      await cacheHelper.delPattern('users:all:*');

      // Log activity if request carried admin
      if (req.admin) {
        await ActivityLog.create({
          admin_id: req.admin.admin_id,
          action: 'UPDATE_USER',
          entity_type: 'USER',
          entity_id: id,
          details: updates,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
          status: 'SUCCESS'
        });
      }

      res.json({ success: true, message: 'User updated successfully' });
    } catch (error) {
      await connection.rollback();
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Failed to update user', error: error.message });
    } finally {
      connection.release();
    }
  },

  // Delete (soft) user
  deleteProfile: async (req, res) => {
    try {
      const { id } = req.params;
      const existing = await User.findById(id);
      if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

      await User.softDelete(id);

      await cacheHelper.del(`user:${id}`);
      await cacheHelper.delPattern('users:all:*');

      res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete user', error: error.message });
    }
  },

  // Create booking (simple flow: insert booking + billing record)
  createBooking: async (req, res) => {
    const connection = await mysqlPool.getConnection();
    try {
      await connection.beginTransaction();

      const { id } = req.params; // user id
      const booking = req.body; // booking_type, booking_ref, start_date, end_date, total_amount

      // verify user
      const user = await User.findById(id);
      if (!user) {
        await connection.rollback();
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const bookingId = booking.booking_id || `bk_${Date.now()}`;

      await connection.execute(
        `INSERT INTO bookings (booking_id, user_id, booking_type, booking_ref, start_date, end_date, status, total_amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          bookingId,
          id,
          booking.booking_type || null,
          booking.booking_ref || null,
          booking.start_date || null,
          booking.end_date || null,
          booking.status || 'CONFIRMED',
          booking.total_amount == null ? 0 : booking.total_amount
        ]
      );

      // Create billing entry
      const billingId = `bill_${Date.now()}`;
      await connection.execute(
        `INSERT INTO billing (billing_id, user_id, booking_type, booking_id, transaction_date, total_amount, payment_method, transaction_status, created_at)
         VALUES (?, ?, ?, ?, NOW(), ?, ?, ?, NOW())`,
        [
          billingId,
          id,
          booking.booking_type || null,
          bookingId,
          booking.total_amount == null ? 0 : booking.total_amount,
          booking.payment_method || 'CARD',
          booking.transaction_status || 'COMPLETED'
        ]
      );

      await connection.commit();

      // Invalidate caches
      await cacheHelper.del(`user:${id}`);
      await cacheHelper.delPattern(`user:${id}:bookings`);

      // Emit Kafka event
      try {
        await producer.send({
          topic: 'bookings.created',
          messages: [{ key: bookingId, value: JSON.stringify({ booking_id: bookingId, user_id: id, booking_type: booking.booking_type, total_amount: booking.total_amount }) }]
        });
      } catch (kErr) {
        console.warn('Kafka send failed for booking:', kErr.message);
      }

      res.status(201).json({ success: true, message: 'Booking created', data: { booking_id: bookingId, billing_id: billingId } });
    } catch (error) {
      await connection.rollback();
      console.error('Create booking error:', error);
      res.status(500).json({ success: false, message: 'Failed to create booking', error: error.message });
    } finally {
      connection.release();
    }
  },

  // Get bookings for user
  getBookings: async (req, res) => {
    try {
      const { id } = req.params;

      const cacheKey = `user:${id}:bookings`;
      const cached = await cacheHelper.get(cacheKey);
      if (cached) return res.json({ success: true, message: 'Bookings from cache', data: cached, cached: true });

      const [rows] = await mysqlPool.execute('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC', [id]);

      await cacheHelper.set(cacheKey, rows);
      res.json({ success: true, message: 'Bookings retrieved', data: rows });
    } catch (error) {
      console.error('Get bookings error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve bookings', error: error.message });
    }
  }
};

module.exports = publicUsersController;
