const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Billing = sequelize.define('Billing', {
  billing_id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.STRING(11), // SSN format: XXX-XX-XXXX
    allowNull: false,
    validate: {
      is: /^[0-9]{3}-[0-9]{2}-[0-9]{4}$/
    }
  },
  booking_type: {
    type: DataTypes.ENUM('flight', 'hotel', 'car'),
    allowNull: false
  },
  booking_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  transaction_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  payment_method: {
    type: DataTypes.ENUM('credit_card', 'debit_card', 'paypal', 'stripe'),
    allowNull: false
  },
  transaction_status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending'
  },
  payment_reference: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'USD'
  }
}, {
  tableName: 'billings',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Billing;