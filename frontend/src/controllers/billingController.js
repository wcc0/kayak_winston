const { mysqlPool } = require('../config/database');
const ActivityLog = require('../models/ActivityLog');
const { cacheHelper } = require('../config/redis');

const billingController = {
  // Get all billing records
  getAllBilling: async (req, res) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const offset = (page - 1) * limit;

      const cacheKey = `billing:all:${page}:${limit}`;
      const cached = await cacheHelper.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          message: 'Billing records retrieved from cache',
          data: cached,
          cached: true
        });
      }

      const [billing] = await mysqlPool.execute(
        `SELECT * FROM billing 
         ORDER BY transaction_date DESC 
         LIMIT ? OFFSET ?`,
        [parseInt(limit), parseInt(offset)]
      );

      const [countResult] = await mysqlPool.execute('SELECT COUNT(*) as total FROM billing');
      const total = countResult[0].total;

      const result = {
        billing,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      // Cache results
      await cacheHelper.set(cacheKey, result);

      res.json({
        success: true,
        message: 'Billing records retrieved successfully',
        data: result
      });
    } catch (error) {
      console.error('Get all billing error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve billing records',
        error: error.message
      });
    }
  },

  // Get billing by ID
  getBillingById: async (req, res) => {
    try {
      const { id } = req.params;

      const cacheKey = `billing:${id}`;
      const cached = await cacheHelper.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          message: 'Billing record retrieved from cache',
          data: cached,
          cached: true
        });
      }

      const [billing] = await mysqlPool.execute(
        'SELECT * FROM billing WHERE billing_id = ?',
        [id]
      );

      if (billing.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Billing record not found'
        });
      }

      // Cache result
      await cacheHelper.set(cacheKey, billing[0]);

      // Log activity
      await ActivityLog.create({
        admin_id: req.admin.admin_id,
        action: 'VIEW_BILLING',
        entity_type: 'BILLING',
        entity_id: id,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
        status: 'SUCCESS'
      });

      res.json({
        success: true,
        message: 'Billing record retrieved successfully',
        data: billing[0]
      });
    } catch (error) {
      console.error('Get billing error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve billing record',
        error: error.message
      });
    }
  },

  // Search billing by date
  searchBillingByDate: async (req, res) => {
    try {
      const { startDate, endDate, month, year } = req.query;

      let query = 'SELECT * FROM billing WHERE 1=1';
      const params = [];

      if (month && year) {
        query += ' AND MONTH(transaction_date) = ? AND YEAR(transaction_date) = ?';
        params.push(parseInt(month), parseInt(year));
      } else if (startDate && endDate) {
        query += ' AND transaction_date BETWEEN ? AND ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        query += ' AND transaction_date >= ?';
        params.push(startDate);
      } else if (endDate) {
        query += ' AND transaction_date <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY transaction_date DESC LIMIT 100';

      const cacheKey = `billing:search:${JSON.stringify(req.query)}`;
      const cached = await cacheHelper.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          message: 'Billing records retrieved from cache',
          data: cached,
          cached: true
        });
      }

      const [results] = await mysqlPool.execute(query, params);

      // Cache results
      await cacheHelper.set(cacheKey, results);

      res.json({
        success: true,
        message: 'Billing records retrieved successfully',
        data: results,
        count: results.length
      });
    } catch (error) {
      console.error('Search billing error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search billing records',
        error: error.message
      });
    }
  },

  // Get billing statistics
  getBillingStats: async (req, res) => {
    try {
      const { year = new Date().getFullYear() } = req.query;

      const cacheKey = `billing:stats:${year}`;
      const cached = await cacheHelper.get(cacheKey);
      
      if (cached) {
        return res.json({
          success: true,
          message: 'Billing statistics retrieved from cache',
          data: cached,
          cached: true
        });
      }

      // Total revenue
      const [totalRevenue] = await mysqlPool.execute(
        `SELECT SUM(total_amount) as total FROM billing 
         WHERE YEAR(transaction_date) = ? AND transaction_status = 'COMPLETED'`,
        [year]
      );

      // Revenue by booking type
      const [revenueByType] = await mysqlPool.execute(
        `SELECT booking_type, SUM(total_amount) as total, COUNT(*) as count 
         FROM billing 
         WHERE YEAR(transaction_date) = ? AND transaction_status = 'COMPLETED'
         GROUP BY booking_type`,
        [year]
      );

      // Monthly revenue
      const [monthlyRevenue] = await mysqlPool.execute(
        `SELECT MONTH(transaction_date) as month, SUM(total_amount) as total 
         FROM billing 
         WHERE YEAR(transaction_date) = ? AND transaction_status = 'COMPLETED'
         GROUP BY MONTH(transaction_date)
         ORDER BY month`,
        [year]
      );

      const stats = {
        year: parseInt(year),
        totalRevenue: totalRevenue[0].total || 0,
        revenueByType,
        monthlyRevenue
      };

      // Cache results
      await cacheHelper.set(cacheKey, stats);

      res.json({
        success: true,
        message: 'Billing statistics retrieved successfully',
        data: stats
      });
    } catch (error) {
      console.error('Get billing stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve billing statistics',
        error: error.message
      });
    }
  }
};

module.exports = billingController;
