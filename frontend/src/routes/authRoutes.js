const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateLogin, validateAdminRegistration } = require('../middleware/validation');

// Public routes
router.post('/login', validateLogin, authController.login);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.get('/verify', authenticate, authController.verifyToken);

// Super admin only
router.post('/register', authenticate, authorize('super_admin'), validateAdminRegistration, authController.register);

module.exports = router;
