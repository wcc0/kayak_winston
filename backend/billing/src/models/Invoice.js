const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  billing_id: {
    type: String,
    required: true,
    unique: true
  },
  invoice_number: {
    type: String,
    required: true,
    unique: true
  },
  user_details: {
    name: String,
    email: String,
    address: String
  },
  booking_details: {
    type: Object,
    required: true
  },
  line_items: [{
    description: String,
    quantity: Number,
    unit_price: Number,
    total: Number
  }],
  subtotal: Number,
  tax: Number,
  discount: Number,
  total_amount: Number,
  payment_details: {
    method: String,
    last_four_digits: String,
    transaction_id: String
  },
  invoice_pdf_url: String,
  notes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Invoice', invoiceSchema);