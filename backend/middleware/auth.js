const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Handle environment-based admin authentication
    if (decoded.isEnvAdmin && decoded.role === 'admin') {
      const adminUsername = process.env.ADMIN_USERNAME;
      
      if (!adminUsername || decoded.username !== adminUsername) {
        return res.status(401).json({ error: 'Invalid admin token.' });
      }
      
      // Create a virtual admin user object
      req.user = {
        _id: 'admin',
        username: decoded.username,
        name: 'System Administrator',
        role: 'admin',
        isActive: true,
        isLocked: false,
        isEnvAdmin: true
      };
      req.deviceId = decoded.deviceId;
      return next();
    }
    
    // Handle regular user authentication
    const user = await User.findById(decoded.userId).select('+deviceId');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated.' });
    }
    
    if (user.isLocked) {
      return res.status(423).json({ 
        error: 'Account is temporarily locked due to multiple failed login attempts.' 
      });
    }
    
    // Check device restriction for clients
    if (user.role === 'client' && user.deviceId && user.deviceId !== decoded.deviceId) {
      return res.status(403).json({ 
        error: 'This account is already logged in on another device.' 
      });
    }
    
    req.user = user;
    req.deviceId = decoded.deviceId;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

// Check if user has admin role
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  
  // For environment-based admin, verify credentials are still valid
  if (req.user.isEnvAdmin) {
    const adminUsername = process.env.ADMIN_USERNAME;
    if (!adminUsername || req.user.username !== adminUsername) {
      return res.status(403).json({ error: 'Invalid admin session.' });
    }
  }
  
  next();
};

// Check if user has client role
const requireClient = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  
  if (req.user.role !== 'client') {
    return res.status(403).json({ error: 'Client access required.' });
  }
  
  next();
};

// Log user access activity
const logAccess = (action) => {
  return async (req, res, next) => {
    try {
      const logData = {
        userId: req.user?._id,
        pdfId: req.params.pdfId || req.body.pdfId,
        action: action,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        deviceId: req.deviceId,
        metadata: {
          route: req.route?.path,
          method: req.method,
          query: req.query,
          timestamp: new Date()
        }
      };
      
      // Log in background, don't wait
      AccessLog.logAccess(logData).catch(error => {
        console.error('Failed to log access:', error);
      });
      
      next();
    } catch (error) {
      console.error('Access logging middleware error:', error);
      next(); // Continue even if logging fails
    }
  };
};

// Validate PDF access permissions
const validatePdfAccess = async (req, res, next) => {
  try {
    const PDF = require('../models/PDF');
    const pdfId = req.params.pdfId || req.params.id;
    
    if (!pdfId) {
      return res.status(400).json({ error: 'PDF ID is required.' });
    }
    
    const pdf = await PDF.findById(pdfId);
    
    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found.' });
    }
    
    if (!pdf.isActive) {
      return res.status(403).json({ error: 'PDF is not available.' });
    }
    
    // Check if user can access this PDF
    if (!pdf.canUserAccess(req.user)) {
      // Log unauthorized access attempt
      AccessLog.logAccess({
        userId: req.user._id,
        pdfId: pdf._id,
        action: 'unauthorized_access_attempt',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceId: req.deviceId,
        success: false,
        errorMessage: 'User does not have access to this PDF'
      }).catch(console.error);
      
      return res.status(403).json({ 
        error: 'You do not have access to this PDF.' 
      });
    }
    
    req.pdf = pdf;
    next();
  } catch (error) {
    console.error('PDF access validation error:', error);
    res.status(500).json({ error: 'Failed to validate PDF access.' });
  }
};

// Rate limiting for sensitive operations
const createRateLimit = (windowMs, max, message) => {
  const rateLimit = require('express-rate-limit');
  
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user ? `user_${req.user._id}` : `ip_${req.ip}`;
    }
  });
};

// Specific rate limits for different operations
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again later.'
);

const pdfViewRateLimit = createRateLimit(
  60 * 1000, // 1 minute
  10, // 10 views
  'Too many PDF view requests, please slow down.'
);

const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  20, // 20 uploads
  'Upload limit reached, please try again later.'
);

module.exports = {
  authenticate,
  requireAdmin,
  requireClient,
  logAccess,
  validatePdfAccess,
  authRateLimit,
  pdfViewRateLimit,
  uploadRateLimit
};
