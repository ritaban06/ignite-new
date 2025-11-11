const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');

// Special ObjectId for system admin
const ADMIN_OBJECT_ID = new mongoose.Types.ObjectId('000000000000000000000001');
const CLIENT_URL = process.env.CLIENT_URL;
const ADMIN_URL = process.env.ADMIN_URL;
const BACKEND_URL = process.env.BACKEND_VERCEL_URL || process.env.BACKEND_DROPLET_URL;

// Helper function to ensure CORS headers are set
const ensureCORS = (req, res) => {
  const origin = req.get('Origin');
  const allowedOrigins = [
    CLIENT_URL,
    ADMIN_URL,
    BACKEND_URL,
    'http://localhost:3000',
    'http://localhost:3001'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
  } else {
    // Be more permissive for debugging
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  
  // Always set these essential headers
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
};

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    let token = authHeader?.replace('Bearer ', '');
    if (!token && (req.query.authToken || req.query.token)) {
      token = req.query.authToken || req.query.token;
    }
    
    console.log('Auth Debug - Path:', req.path);
    console.log('Auth Debug - Method:', req.method);
    console.log('Auth Debug - Auth Header Present:', !!authHeader);
    console.log('Auth Debug - Token Present:', !!token);
    console.log('Auth Debug - Origin:', req.get('Origin'));
    
    if (!token) {
      console.log('Auth Debug - No token provided');
      // Ensure CORS headers are preserved even on auth failure
      ensureCORS(req, res);
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Handle environment-based admin authentication
    if (decoded.isEnvAdmin && decoded.role === 'admin') {
      const adminUsername = process.env.ADMIN_USERNAME;
      
      if (!adminUsername || decoded.username !== adminUsername) {
        ensureCORS(req, res);
        return res.status(401).json({ error: 'Invalid admin token.' });
      }
      
      // Create a virtual admin user object
      req.user = {
        _id: ADMIN_OBJECT_ID,
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
      ensureCORS(req, res);
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }
    
    if (!user.isActive) {
      ensureCORS(req, res);
      return res.status(401).json({ error: 'Account is deactivated.' });
    }
    
    if (user.isLocked) {
      ensureCORS(req, res);
      return res.status(423).json({ 
        error: 'Account is temporarily locked due to multiple failed login attempts.' 
      });
    }
    
    // Device restriction removed - allow multiple device logins
    // JWT token expiration (7 days) will handle session management
    
    req.user = user;
    req.deviceId = decoded.deviceId;
    next();
  } catch (error) {
    ensureCORS(req, res);
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
    ensureCORS(req, res);
    return res.status(401).json({ error: 'Authentication required.' });
  }
  
  if (req.user.role !== 'admin') {
    ensureCORS(req, res);
    return res.status(403).json({ error: 'Admin access required.' });
  }
  
  // For environment-based admin, verify credentials are still valid
  if (req.user.isEnvAdmin) {
    const adminUsername = process.env.ADMIN_USERNAME;
    if (!adminUsername || req.user.username !== adminUsername) {
      ensureCORS(req, res);
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
    const GoogleDriveService = require('../services/googleDriveService');
    const { getPrimaryBaseFolderId } = require('../utils/gdriveConfig');
    const pdfId = req.params.pdfId || req.params.id;
    
    if (!pdfId) {
      return res.status(400).json({ error: 'PDF ID is required.' });
    }
    
    let pdf;
    
    // Try to find PDF by MongoDB ObjectId first
    if (/^[a-fA-F0-9]{24}$/.test(pdfId)) {
      pdf = await PDF.findById(pdfId);
    }
    
    // If not found and looks like Google Drive file ID, create a virtual PDF object
    if (!pdf && pdfId.length > 24) {
      try {
        const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);
      const googleDriveService = new GoogleDriveService(
        credentials,
        getPrimaryBaseFolderId()
      );
        
        // Get file metadata from Google Drive to verify it exists
        const fileMetadata = await googleDriveService.drive.files.get({
          fileId: pdfId,
          fields: 'id, name, size, createdTime, mimeType'
        });
        
        if (fileMetadata.data && fileMetadata.data.mimeType === 'application/pdf') {
          // Create a virtual PDF object for Google Drive files
          pdf = {
            _id: pdfId,
            googleDriveFileId: pdfId,
            title: fileMetadata.data.name,
            fileName: fileMetadata.data.name,
            isActive: true,
            canUserAccess: () => true, // Allow access for authenticated users
            incrementViewCount: async () => {}, // No-op for Google Drive files
            viewCount: 0
          };
        }
      } catch (driveError) {
        console.error('Google Drive file validation error:', driveError);
        return res.status(404).json({ error: 'PDF not found.' });
      }
    }
    
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
    // Skip rate limiting in development if needed
    skip: (req) => {
      return process.env.NODE_ENV === 'development' && req.headers['x-skip-rate-limit'];
    },
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      return req.user ? `user_${req.user._id}` : `ip_${req.ip}`;
    },
    // Handler for when rate limit is exceeded
    handler: (req, res) => {
      console.log(`Rate limit exceeded for ${req.ip} on ${req.originalUrl}`);
      res.status(429).json({ 
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Specific rate limits for different operations
const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  14, // 14 attempts
  'Too many authentication attempts, please try again later.'
);

const pdfViewRateLimit = createRateLimit(
  1800 * 1000, // 30 minutes
  100, // 100 views
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
