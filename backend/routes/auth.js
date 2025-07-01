const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');
const { authRateLimit } = require('../middleware/auth');

const router = express.Router();

// Generate device ID from user agent and other factors
const generateDeviceId = (req) => {
  const userAgent = req.get('User-Agent') || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  const acceptEncoding = req.get('Accept-Encoding') || '';
  
  const deviceString = `${userAgent}-${acceptLanguage}-${acceptEncoding}`;
  return crypto.createHash('sha256').update(deviceString).digest('hex');
};

// Register new user (client only)
router.post('/register', [
  authRateLimit,
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('department').isIn(['AIML', 'CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'CHEMICAL']),
  body('year').isInt({ min: 1, max: 4 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password, name, department, year } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ 
        error: 'User already exists with this email address' 
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      department,
      year,
      role: 'client'
    });

    await user.save();

    // Generate device ID and JWT token
    const deviceId = generateDeviceId(req);
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        deviceId 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update user with device ID
    user.deviceId = deviceId;
    user.lastLogin = new Date();
    await user.save();

    // Log registration
    await AccessLog.logAccess({
      userId: user._id,
      action: 'register',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        department: user.department,
        year: user.year,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed', 
      message: error.message 
    });
  }
});

// Login user
router.post('/login', [
  authRateLimit,
  body('email').isEmail().normalizeEmail(),
  body('password').exists()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password +deviceId');
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({ 
        error: 'Account is temporarily locked due to multiple failed login attempts' 
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ 
        error: 'Account is deactivated' 
      });
    }

    // Verify password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      await user.incLoginAttempts();
      return res.status(401).json({ 
        error: 'Invalid email or password' 
      });
    }

    // Generate device ID
    const deviceId = generateDeviceId(req);

    // For clients, check device restriction
    if (user.role === 'client' && user.deviceId && user.deviceId !== deviceId) {
      return res.status(403).json({ 
        error: 'This account is already logged in on another device. Please logout from the other device first.' 
      });
    }

    // Reset failed login attempts
    await user.resetLoginAttempts();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        role: user.role,
        deviceId 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Update user login info
    user.deviceId = deviceId;
    user.lastLogin = new Date();
    await user.save();

    // Log successful login
    await AccessLog.logAccess({
      userId: user._id,
      action: 'login',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        department: user.department,
        year: user.year,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed', 
      message: error.message 
    });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (user) {
          // Clear device ID to allow login from other devices
          user.deviceId = null;
          await user.save();

          // Log logout
          await AccessLog.logAccess({
            userId: user._id,
            action: 'logout',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            deviceId: decoded.deviceId
          });
        }
      } catch (error) {
        // Token might be invalid, but that's okay for logout
        console.log('Token validation failed during logout:', error.message);
      }
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: 'Logout failed', 
      message: error.message 
    });
  }
});

// Verify token and get user info
router.get('/me', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token or user not found' });
    }

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        department: user.department,
        year: user.year,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Token verification error:', error);
    res.status(500).json({ 
      error: 'Token verification failed', 
      message: error.message 
    });
  }
});

// Force logout from all devices (admin only)
router.post('/force-logout/:userId', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminUser = await User.findById(decoded.userId);

    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clear device ID to force re-login
    targetUser.deviceId = null;
    await targetUser.save();

    // Log admin action
    await AccessLog.logAccess({
      userId: adminUser._id,
      action: 'force_logout',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId: decoded.deviceId,
      metadata: { targetUserId: targetUser._id }
    });

    res.json({ 
      message: 'User has been logged out from all devices',
      targetUser: {
        id: targetUser._id,
        email: targetUser.email,
        name: targetUser.name
      }
    });
  } catch (error) {
    console.error('Force logout error:', error);
    res.status(500).json({ 
      error: 'Force logout failed', 
      message: error.message 
    });
  }
});

module.exports = router;
