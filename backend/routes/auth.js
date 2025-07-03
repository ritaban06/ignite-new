const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');
const { authRateLimit, authenticate, requireAdmin } = require('../middleware/auth');
const googleSheetsService = require('../services/googleSheetsService');

const router = express.Router();

// Handle preflight requests for all auth routes
router.options('*', (req, res) => {
  const origin = req.get('Origin');
  res.header('Access-Control-Allow-Origin', origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  res.sendStatus(200);
});

// Initialize Google OAuth2 client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
  body('department').isIn(['AIML', 'CSE', 'ECE', 'EEE', 'IT']),
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

    // Prevent admin users from logging in through regular login
    // Admin access should only be through admin-login endpoint with env credentials
    if (user.role === 'admin') {
      return res.status(403).json({ 
        error: 'Admin users must use the admin login endpoint' 
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

// Admin login using environment variables
router.post('/admin-login', [
  authRateLimit,
  body('username').trim().isLength({ min: 1 }),
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

    const { username, password } = req.body;

    // Check against environment variables
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error('Admin credentials not configured in environment variables');
      return res.status(500).json({ 
        error: 'Admin authentication not configured' 
      });
    }

    // Verify admin credentials
    if (username !== adminUsername || password !== adminPassword) {
      // Log failed admin login attempt to console for security monitoring
      console.warn(`Failed admin login attempt - Username: ${username}, IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);

      return res.status(401).json({ 
        error: 'Invalid admin credentials' 
      });
    }

    // Generate device ID for admin session
    const deviceId = generateDeviceId(req);

    // Generate JWT token for admin
    const token = jwt.sign(
      { 
        userId: 'admin',
        username: adminUsername,
        role: 'admin',
        deviceId,
        isEnvAdmin: true // Flag to indicate this is env-based admin
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Shorter expiry for admin sessions
    );

    // Log successful admin login to console for security monitoring
    console.log(`Successful admin login - Username: ${adminUsername}, IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);

    res.json({
      message: 'Admin login successful',
      token,
      user: {
        id: 'admin',
        username: adminUsername,
        name: 'System Administrator',
        role: 'admin',
        isEnvAdmin: true
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      error: 'Admin login failed', 
      message: error.message 
    });
  }
});

// Admin logout
router.post('/admin-logout', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Log admin logout to console for security monitoring
      console.log(`Admin logout - Username: ${decoded.username || decoded.email}, IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
    }

    res.json({ message: 'Admin logout successful' });
  } catch (error) {
    console.error('Admin logout error:', error);
    res.status(500).json({ 
      error: 'Admin logout failed', 
      message: error.message 
    });
  }
});

// Get current admin user info
router.get('/admin/me', authenticate, requireAdmin, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username || req.user.email, // Support both for compatibility
        name: req.user.name,
        role: req.user.role,
        isEnvAdmin: req.user.isEnvAdmin || false
      }
    });
  } catch (error) {
    console.error('Get admin info error:', error);
    res.status(500).json({ 
      error: 'Failed to get admin info', 
      message: error.message 
    });
  }
});

// Google OAuth verification endpoint
router.post('/google-verify', [
  authRateLimit,
  body('credential').notEmpty().withMessage('Google credential token is required')
], async (req, res) => {
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', req.get('Origin') || 'https://ignite-client.ritaban.me');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { credential } = req.body;

    // Verify the Google token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
      });
    } catch (error) {
      console.error('Google token verification failed:', error);
      return res.status(401).json({
        error: 'Invalid Google token',
        message: 'Failed to verify Google authentication token'
      });
    }

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture, email_verified } = payload;

    // Check if email is verified
    if (!email_verified) {
      return res.status(400).json({
        error: 'Email not verified',
        message: 'Please verify your email address with Google before signing in'
      });
    }

    // Check if user is in approved list
    const approvalResult = await googleSheetsService.isUserApproved(email);
    
    if (!approvalResult.approved) {
      return res.status(403).json({
        error: 'Access denied',
        message: `Sorry, your email (${email}) is not in the approved users list. Please contact an administrator to get approval.`
      });
    }

    // Generate device ID for this login
    const deviceId = generateDeviceId(req);

    // Create or update user with Google OAuth data and approved user data
    const userData = {
      email,
      name: approvalResult.userData.name || name, // Prefer name from approved list
      department: approvalResult.userData.department,
      year: parseInt(approvalResult.userData.year),
      googleId,
      picture,
      loginMethod: 'google',
      lastLogin: new Date(),
      isActive: true
    };

    let user = await User.findOne({ email }).select('+deviceId');
    
    if (user) {
      // Check device restriction for existing users
      if (user.role === 'client' && user.deviceId && user.deviceId !== deviceId) {
        return res.status(403).json({ 
          error: 'This account is already logged in on another device. Please logout from the other device first.' 
        });
      }
      
      // Update existing user
      Object.assign(user, userData);
      user.deviceId = deviceId;
      await user.save();
    } else {
      // Create new user
      user = new User({ ...userData, deviceId });
      await user.save();
    }

    // Generate JWT token with deviceId
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role,
        deviceId
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Log access
    try {
      await AccessLog.create({
        userId: user._id,
        action: 'google_login',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceId: deviceId,
        timestamp: new Date()
      });
    } catch (logError) {
      console.error('Access log error:', logError);
    }

    res.json({
      message: 'Google OAuth verification successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        department: user.department,
        year: user.year,
        picture: user.picture,
        role: user.role,
        loginMethod: user.loginMethod
      }
    });

  } catch (error) {
    console.error('Google OAuth verification error:', error);
    
    if (error.message.includes('approved users')) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'Unable to verify approval status. Please try again later.'
      });
    }
    
    res.status(500).json({ 
      error: 'Google OAuth verification failed', 
      message: error.message 
    });
  }
});

// Test endpoint to verify auth routes are working
router.get('/test', (req, res) => {
  res.json({
    message: 'Auth routes are working!',
    availableRoutes: [
      'POST /api/auth/register',
      'POST /api/auth/login',
      'POST /api/auth/logout',
      'POST /api/auth/google-verify',
      'POST /api/auth/admin-login',
      'GET /api/auth/admin/me',
      'GET /api/auth/test'
    ],
    googleClientConfigured: !!process.env.GOOGLE_CLIENT_ID
  });
});

module.exports = router;
