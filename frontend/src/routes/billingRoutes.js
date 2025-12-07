const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all billing records
router.get('/', billingController.getAllBilling);

// Get billing statistics
router.get('/stats', billingController.getBillingStats);

// Search billing by date
router.get('/search', billingController.searchBillingByDate);

// Get billing by ID
router.get('/:id', billingController.getBillingById);

module.exports = router;
