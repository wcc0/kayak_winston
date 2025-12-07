const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

const usersPublicController = {
  register: async (req, res) => {
    try {
      const payload = req.body;
      if (!payload.email || !payload.password) {
        return res.status(400).json({ success: false, message: 'Email and password required' });
      }

      // Check for existing
      const existing = await User.findByEmail(payload.email);
      if (existing) {
        return res.status(409).json({ success: false, message: 'User already exists' });
      }

      const created = await User.create(payload);

      // Log activity (if model exists)
      try { await ActivityLog.create({ admin_id: null, action: 'REGISTER_USER', entity_type: 'USER', entity_id: created.user_id, status: 'SUCCESS', ip_address: req.ip }); } catch (e) {}

      res.status(201).json({ success: true, message: 'User registered', data: { user_id: created.user_id } });
    } catch (error) {
      console.error('User register error:', error);
      res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
    }
  },

  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required' });

      const user = await User.findByEmail(email);
      if (!user) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      const valid = await User.comparePassword(password, user.password);
      if (!valid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      const token = jwt.sign({ user_id: user.user_id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: process.env.JWT_EXPIRE || '24h' });

      // Log activity
      try { await ActivityLog.create({ admin_id: null, action: 'USER_LOGIN', entity_type: 'USER', entity_id: user.user_id, status: 'SUCCESS', ip_address: req.ip }); } catch (e) {}

      const { password: _, ...userSafe } = user;
      res.json({ success: true, message: 'Login successful', data: { token, user: userSafe } });
    } catch (error) {
      console.error('User login error:', error);
      res.status(500).json({ success: false, message: 'Login failed', error: error.message });
    }
  }
};

module.exports = usersPublicController;
