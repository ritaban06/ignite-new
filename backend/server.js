const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = require('./utils/database');
// const { startScheduledTasks, stopScheduledTasks } = require('./utils/scheduler');
const authRoutes = require('./routes/auth');
const pdfRoutes = require('./routes/pdfs');
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const folderRoutes = require('./routes/folders');
const accessTagRoutes = require('./routes/accessTags');

const app = express();

// Trust proxy settings for platforms like Vercel, Heroku, etc.
// This is required for rate limiting and getting real client IPs
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());

// Rate limiting - Commented out to disable rate limiting
/*
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks and CORS preflight
  skip: (req) => {
    return req.method === 'OPTIONS' || 
           req.path === '/api/health' || 
           req.path === '/api/cors-test' ||
           req.path.startsWith('/api/pdfs/proxy/'); // Skip rate limiting for PDF proxy
  },
  handler: (req, res) => {
    console.log(`Global rate limit exceeded for ${req.ip} on ${req.originalUrl}`);
    res.status(429).json({ 
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.round(15 * 60) // 15 minutes in seconds
    });
  }
});
app.use(limiter);
*/

// CORS configuration - Allow specific origins
const allowedOrigins = [
  'https://ignite-client.ritaban.me',
  'https://ignite-admin.ritaban.me', 
  'https://ignite-backend-eight.vercel.app',
  'https://ignite-backend-droplet.ritaban.me',
  'http://localhost:3000',
  'http://localhost:3001',
  // Add Google Drive API domain for CORS
  'https://www.googleapis.com',
  'https://accounts.google.com',
  'https://oauth2.googleapis.com',
  'https://drive.google.com'
];

// Simplified CORS middleware
app.use((req, res, next) => {
  const origin = req.get('Origin');
  
  console.log('Global CORS Debug - Origin:', origin);
  console.log('Global CORS Debug - Method:', req.method);
  console.log('Global CORS Debug - Path:', req.path);
  console.log('Global CORS Debug - Allowed Origins:', allowedOrigins);
  
  // Always set CORS headers for allowed origins
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    console.log('Global CORS: Origin allowed with credentials');
  } else if (!origin) {
    // For requests without origin (Postman, server-to-server)
    res.header('Access-Control-Allow-Origin', '*');
    console.log('Global CORS: No origin, allowing all');
  } else {
    // For client access, we need to be more permissive
    // This is especially important for the /api/folders/gdrive endpoint
    if (origin.includes('ignite-client') || origin.includes('localhost')) {
      console.log('Global CORS: Client origin detected:', origin);
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      console.log('Global CORS: Client origin allowed with credentials');
    } else {
      // Log unknown origins but still allow them for debugging
      console.log('Global CORS: Unknown origin:', origin);
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      console.log('Global CORS: Unknown origin allowed with credentials:', origin);
    }
  }
  
  // Always set these headers regardless of origin
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Request-Method, Access-Control-Request-Headers, Cache-Control');
  res.header('Access-Control-Max-Age', '86400');
  res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Global CORS: Handling preflight request for', req.path);
    return res.status(200).end();
  }
  
  next();
});

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to MongoDB
connectDB();

// Routes
// NOTE: All folder routes (including /folders/search) are mounted under /api/folders
// So, /folders/search is actually available at /api/folders/search
app.use('/api/auth', authRoutes);
app.use('/api/pdfs', pdfRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/access-tags', accessTagRoutes);
// app.use('/api/annotations', annotationRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      origin: req.get('Origin'),
      method: req.method,
      headers: req.headers
    }
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.get('Origin'),
    method: req.method,
    timestamp: new Date().toISOString(),
    corsHeaders: {
      'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials')
    }
  });
});

// CORS debug endpoint
app.get('/api/cors-debug', (req, res) => {
  res.json({ 
    origin: req.get('Origin'),
    corsEnabled: true,
    allowedOrigins: allowedOrigins,
    clientUrl: process.env.CLIENT_URL,
    adminUrl: process.env.ADMIN_URL,
    referer: req.get('Referer'),
    userAgent: req.get('User-Agent'),
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Ignite Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      pdfs: '/api/pdfs',
      users: '/api/users',
      admin: '/api/admin',
      accessTags: '/api/access-tags',
      // annotations: '/api/annotations'
    }
  });
});

// Add /api endpoint to return API info (same as /)
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Ignite Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      pdfs: '/api/pdfs',
      users: '/api/users',
      admin: '/api/admin',
      accessTags: '/api/access-tags',
      // annotations: '/api/annotations'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  // Ensure CORS headers are set even for errors
  const origin = req.get('Origin');
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  // Return JSON error response
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  
  // Check admin environment variables
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  Admin credentials not configured in environment variables');
    console.warn('   Please set ADMIN_USERNAME and ADMIN_PASSWORD in your .env file');
    console.warn('   Admin functionality will not be available until configured');
  } else {
    console.log('✅ Admin authentication configured');
    console.log(`👤 Admin login endpoint: http://localhost:${PORT}/api/auth/admin-login`);
  }
  
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  // console.log('📴 SIGTERM received, shutting down gracefully');
  // stopScheduledTasks();
  
  try {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
  
  server.close(() => {
    console.log('🔚 Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  // console.log('📴 SIGINT received, shutting down gracefully');
  // stopScheduledTasks();
  
  try {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed');
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error);
  }
  
  server.close(() => {
    console.log('🔚 Process terminated');
    process.exit(0);
  });
});

module.exports = app;
