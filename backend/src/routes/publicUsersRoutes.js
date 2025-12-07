const express = require('express');
const router = express.Router();
const usersPublicController = require('../controllers/usersPublicController');

// Public registration and login
router.post('/', usersPublicController.register);
router.post('/login', usersPublicController.login);

// Optionally expose a public profile read (uses existing usersController if needed)
module.exports = router;
