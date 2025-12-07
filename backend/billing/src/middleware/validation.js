const Joi = require('joi');

// SSN validation pattern
const ssnPattern = /^[0-9]{3}-[0-9]{2}-[0-9]{4}$/;

// Billing validation schema
const billingSchema = Joi.object({
  user_id: Joi.string().pattern(ssnPattern).required()
    .messages({
      'string.pattern.base': 'User ID must be in SSN format (XXX-XX-XXXX)'
    }),
  booking_type: Joi.string().valid('flight', 'hotel', 'car').required(),
  booking_id: Joi.string().uuid().required(),
  total_amount: Joi.number().positive().required(),
  payment_method: Joi.string().valid('credit_card', 'debit_card', 'paypal', 'stripe').required(),
  transaction_status: Joi.string().valid('pending', 'completed', 'failed', 'refunded').default('pending'),
  currency: Joi.string().length(3).default('USD')
});

// Payment validation schema
const paymentSchema = Joi.object({
  billing_id: Joi.string().uuid().required(),
  payment_details: Joi.object({
    amount: Joi.number().positive().required(),
    payment_method: Joi.string().required(),
    card_details: Joi.object({
      number: Joi.string().min(13).max(19).required(),
      expiry: Joi.string().pattern(/^\d{2}\/\d{2}$/).required(),
      cvv: Joi.string().min(3).max(4).required(),
      holder_name: Joi.string().required()
    }).required()
  }).required()
});

// Validate billing
const validateBilling = (req, res, next) => {
  const { error } = billingSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: error.details[0].message
    });
  }
  
  next();
};

// Validate payment
const validatePayment = (req, res, next) => {
  const { error } = paymentSchema.validate(req.body);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      error: error.details[0].message
    });
  }
  
  next();
};

module.exports = { validateBilling, validatePayment };