const { mysqlPool } = require('../config/database');

const Booking = {
  create: async (data) => {
    const bookingId = data.booking_id || `bk_${Date.now()}`;
    await mysqlPool.execute(
      `INSERT INTO bookings (booking_id, user_id, booking_type, booking_ref, start_date, end_date, status, total_amount, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [bookingId, data.user_id, data.booking_type || null, data.booking_ref || null, data.start_date || null, data.end_date || null, data.status || 'CONFIRMED', data.total_amount || 0]
    );
    return { booking_id: bookingId };
  },

  findByUser: async (userId, limit = 50, offset = 0) => {
    const [rows] = await mysqlPool.execute('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [userId, Number(limit), Number(offset)]);
    return rows;
  }
};

module.exports = Booking;
