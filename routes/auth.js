const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { AdminUser, AuditLog } = require('../models');
const { auth } = require('../middleware/auth');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }

    const user = await AdminUser.findOne({
      username,
      active: true
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        error: 'Invalid credentials'
      });
    }

    user.last_login = new Date();
    await user.save();

    await AuditLog.create({
      username: user.username,
      action: 'Login',
      ip_address: req.ip
    });

    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d'
      }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await AdminUser.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json(user);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Change password
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await AdminUser.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);

    if (!valid) {
      return res.status(400).json({
        error: 'Current password is incorrect'
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    await AuditLog.create({
      username: user.username,
      action: 'Changed password'
    });

    res.json({
      message: 'Password updated successfully'
    });

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Get all users
router.get('/users', auth, async (req, res) => {
  try {
    const users = await AdminUser.find({})
      .select('-password')
      .sort({ createdAt: -1 });

    res.json(users);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Create user (No auth for first admin)
router.post('/users', async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      role
    } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({
        error: 'Username, email, password and role are required'
      });
    }

    const existingUser = await AdminUser.findOne({
      $or: [
        { username },
        { email }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Username or email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await AdminUser.create({
      username,
      email,
      password: hashedPassword,
      role,
      active: true
    });

    // Safe audit log
    await AuditLog.create({
      username: user.username,
      action: `Created admin user: ${user.username}`
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {

    if (err.code === 11000) {
      return res.status(400).json({
        error: 'Username or email already exists'
      });
    }

    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;