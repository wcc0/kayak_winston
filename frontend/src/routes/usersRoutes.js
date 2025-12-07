const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateUserId } = require('../middleware/validation');

// All routes require authentication
router.use(authenticate);

// Get all users
router.get('/', usersController.getAllUsers);

// Get user by ID
router.get('/:id', validateUserId, usersController.getUserById);

// Update user (admin and above)
router.put('/:id', authorize('super_admin', 'admin'), validateUserId, usersController.updateUser);

// Delete user (admin and above)
router.delete('/:id', authorize('super_admin', 'admin'), validateUserId, usersController.deleteUser);

module.exports = router;
