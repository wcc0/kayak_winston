const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { validateBilling, validatePayment } = require('../middleware/validation');
const auth = require('../middleware/auth');

// Public routes (require authentication in production)
router.post('/billing', validateBilling, billingController.createBilling);
router.get('/billing/:billing_id', billingController.getBillingById);
router.get('/user/:user_id/billings', billingController.getUserBillings);
router.put('/billing/:billing_id', billingController.updateBilling);
router.delete('/billing/:billing_id', billingController.deleteBilling);

// Payment routes
router.post('/payment/process', validatePayment, billingController.processPayment);

// Invoice routes
router.get('/invoice/:billing_id', billingController.getInvoice);
router.post('/invoice/:billing_id', billingController.createInvoice);

// Admin routes (require admin authentication in production)
router.get('/admin/billings/search', billingController.searchBillings);
router.get('/admin/billings/stats', billingController.getBillingStats);

module.exports = router;