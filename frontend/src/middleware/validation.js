const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// US States validation
const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

// SSN format validator
const isValidSSN = (value) => {
  const ssnRegex = /^[0-9]{3}-[0-9]{2}-[0-9]{4}$/;
  return ssnRegex.test(value);
};

// ZIP code validator
const isValidZipCode = (value) => {
  const zipRegex = /^[0-9]{5}(-[0-9]{4})?$/;
  return zipRegex.test(value);
};

// Admin validation rules
const validateAdminRegistration = [
  body('admin_id')
    .trim()
    .custom(isValidSSN)
    .withMessage('Admin ID must be in SSN format (XXX-XX-XXXX)'),
  body('first_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters'),
  body('last_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('phone_number')
    .optional()
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Phone number must be 10-15 digits'),
  body('state')
    .optional()
    .custom((value) => US_STATES.includes(value.toUpperCase()))
    .withMessage('Invalid US state abbreviation'),
  body('zip_code')
    .optional()
    .custom(isValidZipCode)
    .withMessage('Invalid ZIP code format'),
  handleValidationErrors
];

// Login validation
const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

// Listing validation
const validateListing = [
  body('listing_type')
    .isIn(['FLIGHT', 'HOTEL', 'CAR'])
    .withMessage('Listing type must be FLIGHT, HOTEL, or CAR'),
  handleValidationErrors
];

// User ID validation
const validateUserId = [
  param('id')
    .custom(isValidSSN)
    .withMessage('User ID must be in SSN format (XXX-XX-XXXX)'),
  handleValidationErrors
];

module.exports = {
  validateAdminRegistration,
  validateLogin,
  validateListing,
  validateUserId,
  handleValidationErrors
};
