const Billing = require('../models/Billing');
const Invoice = require('../models/Invoice');
const redisClient = require('../config/redis');
const { Sequelize } = require('sequelize');
const { sendMessage } = require('../kafka/producer');
const { v4: uuidv4 } = require('uuid');

class BillingService {
  // Create billing record
  async createBilling(billingData) {
    try {
      // Create billing in MySQL
      const billing = await Billing.create(billingData);
      
      // Invalidate cache
      await this.invalidateCache(billing.user_id);
      
      // Send event to Kafka
      await sendMessage('billing.created', {
        value: {
          billing_id: billing.billing_id,
          user_id: billing.user_id,
          booking_type: billing.booking_type,
          total_amount: billing.total_amount,
          status: billing.transaction_status
        }
      });

      
      return billing;
    } catch (error) {
      console.error('Error creating billing:', error);
      throw error;
    }
  }
  
  // Create billing from booking event (Kafka consumer)
  async createBillingFromBooking(bookingData) {
    const billingData = {
      user_id: bookingData.user_id,
      booking_type: bookingData.booking_type,
      booking_id: bookingData.booking_id,
      total_amount: bookingData.total_amount,
      payment_method: bookingData.payment_method,
      transaction_status: 'pending'
    };
    
    return await this.createBilling(billingData);
  }
  
  // Get billing by ID (with caching)
async getBillingById(billing_id) {
  try {
      // Check cache first
    const cacheKey = `billing:${billing_id}`;
    const cached = await redisClient.get(cacheKey);
      
    if (cached) {
        console.log('✅ Cache HIT for billing:', billing_id);
        return JSON.parse(cached);
      }
      
      console.log('❌ Cache MISS for billing:', billing_id);
      
      // Fetch from database
      const billing = await Billing.findByPk(billing_id);
      
      if (!billing) {
        throw new Error('Billing not found');
      }
      
      // Cache for 1 hour
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(billing));
      
      return billing;
    } catch (error) {
      console.error('Error getting billing:', error);
      throw error;
    }
  }
  
  // Get all billings for a user (with caching)
  async getUserBillings(user_id) {
    try {
      const cacheKey = `user:${user_id}:billings`;
      const cached = await redisClient.get(cacheKey);
      
      if (cached) {
        console.log('✅ Cache HIT for user billings:', user_id);
        return JSON.parse(cached);
      }
      
      console.log('❌ Cache MISS for user billings:', user_id);
      
      const billings = await Billing.findAll({
        where: { user_id },
        order: [['transaction_date', 'DESC']]
      });
      
      // Cache for 30 minutes
      await redisClient.setEx(cacheKey, 1800, JSON.stringify(billings));
      
      return billings;
    } catch (error) {
      console.error('Error getting user billings:', error);
      throw error;
    }
  }
  
  // Search billings by date
  async searchBillings(filters) {
    try {
      const { start_date, end_date, booking_type, status } = filters;
      
      const where = {};
      
      if (start_date && end_date) {
        where.transaction_date = {
          [Sequelize.Op.between]: [start_date, end_date]
        };
      }
      
      if (booking_type) {
        where.booking_type = booking_type;
      }
      
      if (status) {
        where.transaction_status = status;
      }
      
      const billings = await Billing.findAll({
        where,
        order: [['transaction_date', 'DESC']]
      });
      
      return billings;
    } catch (error) {
      console.error('Error searching billings:', error);
      throw error;
    }
  }
  
  // Update billing status
  async updateBillingStatus(billing_id, status, payment_reference = null) {
    try {
      const billing = await Billing.findByPk(billing_id);
      
      if (!billing) {
        throw new Error('Billing not found');
      }
      
      billing.transaction_status = status;
      if (payment_reference) {
        billing.payment_reference = payment_reference;
      }
      
      await billing.save();
      
      // Invalidate cache
      await this.invalidateCache(billing.user_id);
      await redisClient.del(`billing:${billing_id}`);
      
      // Send event to Kafka
      await sendMessage('billing.updated', {
       value: {
        billing_id: billing.billing_id,
        status: status,
        updated_at: new Date()
      }
    });
      
      return billing;
    } catch (error) {
      console.error('Error updating billing status:', error);
      throw error;
    }
  }
  
  // Invalidate user cache
  async invalidateCache(user_id) {
    await redisClient.del(`user:${user_id}:billings`);
  }
  // UPDATE BILLING
  async updateBilling(billing_id, updateData) {
  const billing = await Billing.findByPk(billing_id);
  if (!billing) throw new Error("Billing not found");

  await billing.update(updateData);

  // Invalidate cache
  await redisClient.del(`billing:${billing_id}`);
  await this.invalidateCache(billing.user_id);

  // Kafka event
  await sendMessage("billing.updated", {
    value: {
      billing_id,
      updated_fields: updateData,
      updated_at: new Date()
  }
});
  return billing;
}

  // DELETE BILLING (New)
  async deleteBilling(billing_id) {
    const billing = await Billing.findByPk(billing_id);
    if (!billing) throw new Error("Billing not found");

    const userId = billing.user_id;

    await billing.destroy();

    // Invalidate caches
    await redisClient.del(`billing:${billing_id}`);
    await this.invalidateCache(userId);

    // Kafka event
    await sendMessage("billing.deleted", {
  value: {
    billing_id,
    deleted_at: new Date()
  }
});
    return true;
  }

  // Get billing statistics (for admin)
  async getBillingStats(filters = {}) {
    try {
      const { start_date, end_date } = filters;
      
      const where = {};
      if (start_date && end_date) {
        where.transaction_date = {
          [Sequelize.Op.between]: [start_date, end_date]
        };
      }
      
      const stats = await Billing.findAll({
        where,
        attributes: [
          'booking_type',
          [Sequelize.fn('COUNT', Sequelize.col('billing_id')), 'total_bookings'],
          [Sequelize.fn('SUM', Sequelize.col('total_amount')), 'total_revenue']
        ],
        group: ['booking_type']
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting billing stats:', error);
      throw error;
    }
  }
}

module.exports = new BillingService();