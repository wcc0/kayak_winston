const { mysqlPool } = require('../config/database');
const Analytics = require('../models/Analytics');
const { cacheHelper } = require('../config/redis');

const analyticsController = {
  // Top 10 properties by revenue
  getTopPropertiesByRevenue: async (req, res) => {
    try {
      const { year = new Date().getFullYear() } = req.query;

      const cacheKey = `analytics:top-properties:${year}`;
      const cached = await cacheHelper.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          message: 'Top properties retrieved from cache',
          data: cached,
          cached: true
        });
      }

      const query = `
        SELECT 
          h.hotel_id as property_id,
          h.hotel_name as property_name,
          h.city,
          h.state,
          'HOTEL' as type,
          SUM(b.total_amount) as total_revenue,
          COUNT(b.billing_id) as total_bookings
        FROM billing b
        JOIN hotels h ON b.booking_id = h.hotel_id
        WHERE YEAR(b.transaction_date) = ? 
          AND b.booking_type = 'HOTEL'
          AND b.transaction_status = 'COMPLETED'
        GROUP BY h.hotel_id, h.hotel_name, h.city, h.state
        ORDER BY total_revenue DESC
        LIMIT 10
      `;

      const [results] = await mysqlPool.execute(query, [year]);

      // Cache results
      await cacheHelper.set(cacheKey, results);

      res.json({
        success: true,
        message: 'Top properties retrieved successfully',
        data: results
      });
    } catch (error) {
      console.error('Get top properties error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve top properties',
        error: error.message
      });
    }
  },

  // City-wise revenue
  getCityWiseRevenue: async (req, res) => {
    try {
      const { year = new Date().getFullYear() } = req.query;

      const cacheKey = `analytics:city-revenue:${year}`;
      const cached = await cacheHelper.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          message: 'City-wise revenue retrieved from cache',
          data: cached,
          cached: true
        });
      }

      const query = `
        SELECT 
          h.city,
          h.state,
          SUM(b.total_amount) as total_revenue,
          COUNT(b.billing_id) as total_bookings,
          AVG(b.total_amount) as avg_booking_value
        FROM billing b
        JOIN hotels h ON b.booking_id = h.hotel_id
        WHERE YEAR(b.transaction_date) = ? 
          AND b.booking_type = 'HOTEL'
          AND b.transaction_status = 'COMPLETED'
        GROUP BY h.city, h.state
        ORDER BY total_revenue DESC
      `;

      const [results] = await mysqlPool.execute(query, [year]);

      // Cache results
      await cacheHelper.set(cacheKey, results);

      res.json({
        success: true,
        message: 'City-wise revenue retrieved successfully',
        data: results
      });
    } catch (error) {
      console.error('Get city-wise revenue error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve city-wise revenue',
        error: error.message
      });
    }
  },

  // Top providers
  getTopProviders: async (req, res) => {
    try {
      const { month, year = new Date().getFullYear() } = req.query;

      const cacheKey = `analytics:top-providers:${year}:${month}`;
      const cached = await cacheHelper.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          message: 'Top providers retrieved from cache',
          data: cached,
          cached: true
        });
      }

      let dateFilter = 'YEAR(b.transaction_date) = ?';
      const params = [year];

      if (month) {
        dateFilter += ' AND MONTH(b.transaction_date) = ?';
        params.push(month);
      }

      const query = `
        SELECT 
          provider_name,
          provider_type,
          total_bookings,
          total_revenue
        FROM (
          SELECT 
            h.hotel_name as provider_name,
            'HOTEL' as provider_type,
            COUNT(b.billing_id) as total_bookings,
            SUM(b.total_amount) as total_revenue
          FROM billing b
          JOIN hotels h ON b.booking_id = h.hotel_id
          WHERE ${dateFilter} AND b.booking_type = 'HOTEL' AND b.transaction_status = 'COMPLETED'
          GROUP BY h.hotel_name
          
          UNION ALL
          
          SELECT 
            f.airline_name as provider_name,
            'AIRLINE' as provider_type,
            COUNT(b.billing_id) as total_bookings,
            SUM(b.total_amount) as total_revenue
          FROM billing b
          JOIN flights f ON b.booking_id = f.flight_id
          WHERE ${dateFilter} AND b.booking_type = 'FLIGHT' AND b.transaction_status = 'COMPLETED'
          GROUP BY f.airline_name
          
          UNION ALL
          
          SELECT 
            c.company_name as provider_name,
            'CAR_RENTAL' as provider_type,
            COUNT(b.billing_id) as total_bookings,
            SUM(b.total_amount) as total_revenue
          FROM billing b
          JOIN cars c ON b.booking_id = c.car_id
          WHERE ${dateFilter} AND b.booking_type = 'CAR' AND b.transaction_status = 'COMPLETED'
          GROUP BY c.company_name
        ) AS combined
        ORDER BY total_revenue DESC
        LIMIT 10
      `;

      const [results] = await mysqlPool.execute(query, [...params, ...params, ...params]);

      // Cache results
      await cacheHelper.set(cacheKey, results);

      res.json({
        success: true,
        message: 'Top providers retrieved successfully',
        data: results
      });
    } catch (error) {
      console.error('Get top providers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve top providers',
        error: error.message
      });
    }
  },

  // Page clicks analytics
  getPageClicks: async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const filter = {};
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      filter.type = 'PAGE_VIEW';

      const results = await Analytics.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$page_name',
            total_clicks: { $sum: 1 },
            unique_users: { $addToSet: '$user_id' }
          }
        },
        {
          $project: {
            page_name: '$_id',
            total_clicks: 1,
            unique_users: { $size: '$unique_users' }
          }
        },
        { $sort: { total_clicks: -1 } }
      ]);

      res.json({
        success: true,
        message: 'Page clicks retrieved successfully',
        data: results
      });
    } catch (error) {
      console.error('Get page clicks error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve page clicks',
        error: error.message
      });
    }
  },

  // Listing clicks analytics
  getListingClicks: async (req, res) => {
    try {
      const { type, startDate, endDate } = req.query;

      const filter = { type: 'LISTING_CLICK' };
      
      if (type) {
        filter.listing_type = type.toUpperCase();
      }

      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      const results = await Analytics.aggregate([
        { $match: filter },
        {
          $group: {
            _id: {
              listing_type: '$listing_type',
              listing_id: '$listing_id'
            },
            total_clicks: { $sum: 1 },
            unique_users: { $addToSet: '$user_id' }
          }
        },
        {
          $project: {
            listing_type: '$_id.listing_type',
            listing_id: '$_id.listing_id',
            total_clicks: 1,
            unique_users: { $size: '$unique_users' }
          }
        },
        { $sort: { total_clicks: -1 } },
        { $limit: 50 }
      ]);

      res.json({
        success: true,
        message: 'Listing clicks retrieved successfully',
        data: results
      });
    } catch (error) {
      console.error('Get listing clicks error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve listing clicks',
        error: error.message
      });
    }
  },

  // User tracking
  getUserTracking: async (req, res) => {
    try {
      const { userId, city, state, startDate, endDate } = req.query;

      const filter = {};
      
      if (userId) {
        filter.user_id = userId;
      }

      if (city || state) {
        filter.$or = [];
        if (city) filter.$or.push({ 'location.city': city });
        if (state) filter.$or.push({ 'location.state': state });
      }

      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(endDate);
      }

      const results = await Analytics.find(filter)
        .sort({ date: -1 })
        .limit(100);

      res.json({
        success: true,
        message: 'User tracking data retrieved successfully',
        data: results,
        count: results.length
      });
    } catch (error) {
      console.error('Get user tracking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user tracking data',
        error: error.message
      });
    }
  }
};

module.exports = analyticsController;
