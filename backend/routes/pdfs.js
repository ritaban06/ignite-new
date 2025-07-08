const express = require('express');
const multer = require('multer');
const { body, query, validationResult } = require('express-validator');
const PDF = require('../models/PDF');
const AccessLog = require('../models/AccessLog');
const GoogleDriveService = require('../services/googleDriveService');
const googleDriveService = new GoogleDriveService(
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  process.env.GOOGLE_DRIVE_FOLDER_ID
);
const { 
  authenticate, 
  validatePdfAccess, 
  logAccess, 
  pdfViewRateLimit 
} = require('../middleware/auth');
const { 
  pdfSecurityHeaders, 
  disablePdfCaching 
} = require('../middleware/pdfSecurity');

const router = express.Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Get PDFs for authenticated user
router.get('/', [
  authenticate,
  query('department').optional().isIn(['AIML', 'CSE', 'ECE', 'EEE', 'IT']),
  query('year').optional().isInt({ min: 1, max: 4 }),
  query('subject').optional().trim(),
  query('search').optional().trim(),
  query('tags').optional().isArray(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { 
      department, 
      year, 
      subject, 
      search, 
      tags, 
      page = 1, 
      limit = 20 
    } = req.query;

    // Build filters
    const filters = {};
    if (department) filters.department = department;
    if (year) filters.year = parseInt(year);
    if (subject) filters.subject = subject;
    if (search) filters.search = search;
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];

    // Get PDFs with pagination
    const skip = (page - 1) * limit;
    const pdfsQuery = PDF.findForUser(req.user, filters);
    
    const [pdfs, totalCount] = await Promise.all([
      pdfsQuery.skip(skip).limit(limit),
      PDF.countDocuments(pdfsQuery.getQuery())
    ]);

    res.json({
      pdfs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      filters: {
        department: req.user.role === 'admin' ? department : req.user.department,
        year: req.user.role === 'admin' ? year : req.user.year,
        subject,
        search,
        tags
      }
    });
  } catch (error) {
    console.error('Get PDFs error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch PDFs', 
      message: error.message 
    });
  }
});

// Get single PDF details
router.get('/:pdfId', [
  authenticate,
  validatePdfAccess
], async (req, res) => {
  try {
    const pdf = req.pdf;
    
    res.json({
      pdf: {
        ...pdf.toJSON(),
        canAccess: true
      }
    });
  } catch (error) {
    console.error('Get PDF details error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch PDF details', 
      message: error.message 
    });
  }
});

// Get signed URL for viewing PDF (Google Drive version)
router.post('/:pdfId/view', [
  authenticate,
  validatePdfAccess,
  pdfViewRateLimit,
  logAccess('view')
], async (req, res) => {
  try {
    const pdf = req.pdf;
    await pdf.incrementViewCount();
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      {
        fileId: pdf.googleDriveFileId,
        userId: req.user._id,
        role: req.user.role,
        exp: Math.floor(Date.now() / 1000) + (5 * 60) // 5 min
      },
      process.env.JWT_SECRET
    );
    const proxyUrl = `/api/pdfs/proxy/${pdf.googleDriveFileId}?token=${token}`;
    res.json({
      proxyUrl,
      pdf: {
        id: pdf._id,
        title: pdf.title,
        subject: pdf.subject,
        department: pdf.department,
        year: pdf.year
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate proxy URL', message: error.message });
  }
});

// Search PDFs
router.get('/search/query', [
  authenticate,
  query('q').trim().isLength({ min: 1 }),
  query('department').optional().isIn(['AIML', 'CSE', 'ECE', 'EEE', 'IT']),
  query('year').optional().isInt({ min: 1, max: 4 }),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 50 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { q, department, year, page = 1, limit = 20 } = req.query;

    // Build search query
    const searchQuery = {
      $text: { $search: q },
      isActive: true
    };

    // Apply user restrictions
    if (req.user.role !== 'admin') {
      searchQuery.department = req.user.department;
      searchQuery.year = req.user.year;
    } else {
      if (department) searchQuery.department = department;
      if (year) searchQuery.year = parseInt(year);
    }

    const skip = (page - 1) * limit;

    const [pdfs, totalCount] = await Promise.all([
      PDF.find(searchQuery)
        .populate('uploadedBy', 'name email')
        .sort({ score: { $meta: 'textScore' }, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      PDF.countDocuments(searchQuery)
    ]);

    res.json({
      query: q,
      pdfs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Search PDFs error:', error);
    res.status(500).json({ 
      error: 'Search failed', 
      message: error.message 
    });
  }
});

// Get PDF statistics (for admins and analytics)
router.get('/:pdfId/stats', [
  authenticate,
  validatePdfAccess
], async (req, res) => {
  try {
    const pdf = req.pdf;
    
    // Only allow stats access for admins or PDF uploader
    if (req.user.role !== 'admin' && !pdf.uploadedBy.equals(req.user._id)) {
      return res.status(403).json({ 
        error: 'You do not have permission to view these statistics' 
      });
    }

    const stats = await AccessLog.getPdfStats(pdf._id, 30); // Last 30 days
    
    res.json({
      pdf: {
        id: pdf._id,
        title: pdf.title,
        viewCount: pdf.viewCount,
        lastAccessed: pdf.lastAccessed
      },
      stats
    });
  } catch (error) {
    console.error('Get PDF stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch PDF statistics', 
      message: error.message 
    });
  }
});

// Get user's recent PDFs
router.get('/user/recent', [
  authenticate,
  query('limit').optional().isInt({ min: 1, max: 20 }).toInt()
], async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get recent access logs for this user
    const recentLogs = await AccessLog.find({
      user: req.user._id,
      action: 'view'
    })
    .populate('pdf')
    .sort({ createdAt: -1 })
    .limit(limit);

    const recentPdfs = recentLogs
      .filter(log => log.pdf && log.pdf.isActive)
      .map(log => ({
        ...log.pdf.toJSON(),
        lastViewed: log.createdAt
      }));

    res.json({
      recentPdfs
    });
  } catch (error) {
    console.error('Get recent PDFs error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent PDFs', 
      message: error.message 
    });
  }
});

// Log suspicious activity (download/share/print attempts)
router.post('/:pdfId/report-attempt', [
  authenticate,
  validatePdfAccess,
  body('action').isIn(['download_attempt', 'share_attempt', 'print_attempt']),
  body('details').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { action, details } = req.body;
    
    // Log the suspicious attempt
    await AccessLog.logAccess({
      userId: req.user._id,
      pdfId: req.pdf._id,
      action,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId: req.deviceId,
      success: false,
      errorMessage: `Attempted ${action}`,
      metadata: { details }
    });

    // Check for repeated suspicious activity
    const suspiciousActivity = await AccessLog.detectSuspiciousActivity(req.user._id);
    
    if (suspiciousActivity.length > 0) {
      // Could trigger additional security measures here
      console.warn(`Suspicious activity detected for user ${req.user._id}:`, suspiciousActivity);
    }

    res.json({ 
      message: 'Activity logged',
      warning: suspiciousActivity.length > 0 ? 'Multiple suspicious attempts detected' : null
    });
  } catch (error) {
    console.error('Report attempt error:', error);
    res.status(500).json({ 
      error: 'Failed to log activity', 
      message: error.message 
    });
  }
});

// Get all PDFs from R2 bucket
router.get('/r2/list', [
  authenticate
], async (req, res) => {
  try {
    // List all files in the R2 bucket
    const r2Result = await googleDriveService.listFiles();
    
    if (!r2Result.success) {
      return res.status(500).json({
        error: 'Failed to list files from R2',
        message: r2Result.error
      });
    }

    // Get corresponding PDF documents from database with user access control
    const r2Files = r2Result.files || [];
    const pdfsWithDetails = [];

    for (const fileKey of r2Files) {
      try {
        // Find PDF in database by cloudflareKey
        const pdf = await PDF.findOne({ cloudflareKey: fileKey });
        
        if (pdf) {
          // Check if user can access this PDF (year and department filtering)
          if (pdf.canUserAccess(req.user)) {
            pdfsWithDetails.push({
              id: pdf._id,
              title: pdf.title,
              subject: pdf.subject,
              department: pdf.department,
              year: pdf.year,
              fileKey: fileKey,
              viewUrl: googleDriveService.getViewUrl(fileKey).url,
              createdAt: pdf.createdAt,
              fileSize: pdf.fileSize,
              viewCount: pdf.viewCount
            });
          }
        } else {
          // For orphaned files, only show to admin users
          if (req.user.role === 'admin') {
            pdfsWithDetails.push({
              id: null,
              title: 'Unknown',
              subject: 'Unknown',
              department: 'Unknown',
              year: 'Unknown',
              fileKey: fileKey,
              viewUrl: googleDriveService.getViewUrl(fileKey).url,
              createdAt: null,
              fileSize: null,
              viewCount: 0,
              isOrphaned: true
            });
          }
        }
      } catch (error) {
        console.error(`Error processing file ${fileKey}:`, error);
      }
    }

    res.json({
      message: 'R2 files retrieved successfully',
      totalFiles: r2Files.length,
      accessibleFiles: pdfsWithDetails.length,
      userAccess: {
        department: req.user.department,
        year: req.user.year,
        role: req.user.role
      },
      pdfs: pdfsWithDetails
    });

  } catch (error) {
    console.error('List R2 files error:', error);
    res.status(500).json({
      error: 'Failed to list R2 files',
      message: error.message
    });
  }
});

// Proxy route to serve PDFs from Google Drive with token validation
router.get('/proxy/:fileId', [
  pdfSecurityHeaders,
  disablePdfCaching,
  async (req, res, next) => {
    // Token validation (JWT in query)
    const token = req.query.token;
    if (!token) {
      return res.status(401).json({ error: 'Token required' });
    }
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.fileId !== req.params.fileId) {
        return res.status(403).json({ error: 'Invalid token for this file' });
      }
      req.user = decoded; // Attach user info if needed
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
], async (req, res) => {
  try {
    // Stream PDF from Google Drive
    const fileId = req.params.fileId;
    const driveResult = await googleDriveService.downloadPdf(fileId);
    if (!driveResult.success) {
      return res.status(500).json({ error: 'Failed to fetch PDF from Google Drive', message: driveResult.error });
    }
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="secured.pdf"',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Download-Options': 'noopen',
      'Content-Security-Policy': "default-src 'none'; object-src 'none'; script-src 'none';"
    });
    driveResult.stream.pipe(res);
    driveResult.stream.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming PDF' });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to serve PDF', message: error.message });
  }
});

// Proxy route to serve PDFs with proper CORS headers
router.get('/proxy/:fileKey', [
  pdfSecurityHeaders,
  disablePdfCaching,
  (req, res, next) => {
    // For PDF proxy, try multiple authentication methods
    // 1. Check for Authorization header (for API calls)
    // 2. Check for token in query parameters (for direct PDF access)
    
    const authHeader = req.header('Authorization');
    const tokenFromQuery = req.query.token;
    const userIdFromQuery = req.query.userId;
    
    console.log('PDF Proxy Debug:', {
      authHeader: !!authHeader,
      tokenFromQuery: !!tokenFromQuery,
      userIdFromQuery: !!userIdFromQuery,
      fileKey: req.params.fileKey
    });
    
    // If we have an auth header, use normal authentication
    if (authHeader) {
      return authenticate(req, res, next);
    }
    
    // If we have a token in query, verify it
    if (tokenFromQuery) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(tokenFromQuery, process.env.JWT_SECRET);
        
        // Verify the token is for this specific file and user
        if (decoded.fileKey === decodeURIComponent(req.params.fileKey) && 
            decoded.userId === userIdFromQuery) {
          // Create complete user object from token data
          req.user = { 
            _id: decoded.userId,
            role: decoded.userRole,
            department: decoded.userDepartment,
            year: decoded.userYear
          };
          req.tokenData = decoded;
          return next();
        } else {
          console.log('Token validation failed:', {
            tokenFileKey: decoded.fileKey,
            requestFileKey: decodeURIComponent(req.params.fileKey),
            tokenUserId: decoded.userId,
            requestUserId: userIdFromQuery
          });
          return res.status(403).json({ error: 'Invalid access token for this resource' });
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ error: 'Invalid or expired access token' });
      }
    }
    
    // No valid authentication method
    return res.status(401).json({ error: 'Authentication required' });
  }
], async (req, res) => {
  try {
    // Set CORS headers early
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Cache-Control',
    });
    
    const fileKey = decodeURIComponent(req.params.fileKey);
    const userId = req.query.userId || req.user._id;
    
    // Find the PDF in database to validate access
    const pdf = await PDF.findOne({ cloudflareKey: fileKey });
    
    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found' });
    }
    
    // Check if user can access this PDF
    console.log('PDF Access Check:', {
      pdfId: pdf._id,
      pdfDepartment: pdf.department,
      pdfYear: pdf.year,
      pdfActive: pdf.isActive,
      userId: req.user._id,
      userRole: req.user.role,
      userDepartment: req.user.department,
      userYear: req.user.year
    });
    
    if (!pdf.canUserAccess(req.user)) {
      console.log('Access denied for user:', {
        reason: 'canUserAccess returned false',
        userRole: req.user.role,
        userDept: req.user.department,
        userYear: req.user.year,
        pdfDept: pdf.department,
        pdfYear: pdf.year,
        pdfActive: pdf.isActive
      });
      return res.status(403).json({ 
        error: 'You do not have access to this PDF' 
      });
    }
    
    console.log('Access granted for PDF:', pdf.title);
    
    // Use the R2 service to get PDF stream or signed URL
    const pdfResult = await googleDriveService.getPdfStream(fileKey);
    
    if (!pdfResult.success) {
      console.error('Failed to get PDF from R2:', pdfResult.error);
      return res.status(500).json({ error: 'Failed to retrieve PDF file' });
    }
    
    // If R2 service returned a signed URL due to SSL issues, fetch and proxy the content
    if (pdfResult.useSignedUrl) {
      console.log('Using signed URL fallback due to SSL issues, fetching content to proxy');
      
      try {
        // Fetch the PDF content from the signed URL and proxy it using https module
        const https = require('https');
        const url = require('url');
        
        const signedUrlObj = new url.URL(pdfResult.signedUrl);
        
        const options = {
          hostname: signedUrlObj.hostname,
          port: signedUrlObj.port || 443,
          path: signedUrlObj.pathname + signedUrlObj.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Ignite-PDF-Proxy/1.0'
          }
        };
        
        // Set proper headers for PDF viewing (inline display)
        res.set({
          'Content-Type': 'application/pdf',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
          'Cache-Control': 'private, no-cache',
          'Content-Disposition': 'inline', // This ensures inline viewing, not download
          'X-Content-Type-Options': 'nosniff'
        });
        
        const req = https.request(options, (response) => {
          if (response.statusCode !== 200) {
            console.error('Signed URL fetch failed:', response.statusCode, response.statusMessage);
            if (!res.headersSent) {
              return res.status(500).json({ error: 'Failed to fetch PDF from signed URL' });
            }
            return;
          }
          
          // Set content length if available
          if (response.headers['content-length']) {
            res.set('Content-Length', response.headers['content-length']);
          }
          
          // Pipe the response directly to our response
          response.pipe(res);
        });
        
        req.on('error', (error) => {
          console.error('HTTPS request error:', error);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error fetching PDF from signed URL' });
          }
        });
        
        req.end();
        
      } catch (fetchError) {
        console.error('Failed to fetch from signed URL:', fetchError);
        return res.status(500).json({ error: 'Failed to fetch PDF content' });
      }
    } else {
      // Direct streaming from R2
      // Set proper headers for PDF streaming (inline display)
      res.set({
        'Content-Type': pdfResult.contentType || 'application/pdf',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Content-Disposition': 'inline; filename="secured.pdf"', // Force inline viewing
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-Download-Options': 'noopen',
        'Content-Security-Policy': "default-src 'none'; object-src 'none'; script-src 'none';"
      });
      
      if (pdfResult.contentLength) {
        res.set('Content-Length', pdfResult.contentLength);
      }
      
      // Stream the PDF to the client
      pdfResult.stream.pipe(res);
      
      // Handle stream errors
      pdfResult.stream.on('error', (streamError) => {
        console.error('Direct stream error:', streamError);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming PDF' });
        }
      });
    }
    
    // Log access
    try {
      await AccessLog.logAccess({
        userId: req.user._id,
        pdfId: pdf._id,
        action: 'view', // Use 'view' instead of 'proxy_view' to match enum
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceId: req.deviceId
      });
    } catch (logError) {
      console.error('Failed to log access:', logError);
      // Don't fail the response for logging errors
    }

  } catch (error) {
    console.error('PDF proxy error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to serve PDF', 
        message: error.message 
      });
    }
  }
});

// Handle CORS preflight requests for PDF proxy
router.options('/proxy/:fileKey', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control',
    'Access-Control-Max-Age': '86400' // 24 hours
  });
  res.status(200).end();
});

// Test R2 connectivity endpoint (admin only)
router.get('/test-r2-connection', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('Testing R2 connection...');
    
    // Test basic R2 configuration
    const configTest = {
      hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
      hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
      hasBucketName: !!process.env.R2_BUCKET_NAME
    };

    console.log('R2 Config:', configTest);

    // Test listing files
    const listResult = await googleDriveService.listFiles();
    
    let testResults = {
      config: configTest,
      listFiles: {
        success: listResult.success,
        fileCount: listResult.files ? listResult.files.length : 0,
        error: listResult.error
      }
    };

    // If list works, test signed URL generation
    if (listResult.success && listResult.files.length > 0) {
      const firstFile = listResult.files[0];
      console.log('Testing signed URL for:', firstFile);
      
      const signedUrlResult = await googleDriveService.getSignedViewUrl(firstFile, 60);
      testResults.signedUrl = {
        success: signedUrlResult.success,
        hasUrl: !!signedUrlResult.url,
        error: signedUrlResult.error
      };

      // Test PDF stream
      console.log('Testing PDF stream for:', firstFile);
      const streamResult = await googleDriveService.getPdfStream(firstFile);
      testResults.pdfStream = {
        success: streamResult.success,
        useSignedUrl: streamResult.useSignedUrl,
        hasStream: !!streamResult.stream,
        error: streamResult.error
      };
    }

    res.json({
      message: 'R2 connection test completed',
      results: testResults,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('R2 connection test error:', error);
    res.status(500).json({
      error: 'R2 connection test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Alternative endpoint to get PDF as base64 data (for cases where direct fetch is blocked)
router.post('/:pdfId/view-base64', [
  pdfSecurityHeaders,
  disablePdfCaching,
  authenticate,
  validatePdfAccess,
  pdfViewRateLimit,
  logAccess('view')
], async (req, res) => {
  try {
    const pdf = req.pdf;
    
    // Increment view count
    await pdf.incrementViewCount();
    
    console.log('Getting PDF as base64 for:', pdf.title);
    
    // Get PDF stream from R2
    const pdfResult = await googleDriveService.getPdfStream(pdf.cloudflareKey);
    
    if (!pdfResult.success) {
      console.error('Failed to get PDF from R2:', pdfResult.error);
      return res.status(500).json({ error: 'Failed to retrieve PDF file' });
    }
    
    try {
      let pdfBuffer;
      
      if (pdfResult.useSignedUrl) {
        console.log('Using signed URL to fetch PDF content for base64 conversion');
        // Fetch from signed URL using Node.js fetch or https
        const https = require('https');
        const url = require('url');
        
        const signedUrlObj = new url.URL(pdfResult.signedUrl);
        
        pdfBuffer = await new Promise((resolve, reject) => {
          const options = {
            hostname: signedUrlObj.hostname,
            port: signedUrlObj.port || 443,
            path: signedUrlObj.pathname + signedUrlObj.search,
            method: 'GET',
            headers: {
              'User-Agent': 'Ignite-PDF-Base64/1.0'
            }
          };
          
          const req = https.request(options, (response) => {
            if (response.statusCode !== 200) {
              return reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
            }
            
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks)));
          });
          
          req.on('error', reject);
          req.end();
        });
      } else {
        // Direct stream from R2
        const chunks = [];
        for await (const chunk of pdfResult.stream) {
          chunks.push(chunk);
        }
        pdfBuffer = Buffer.concat(chunks);
      }
      
      // Convert to base64
      const base64Data = pdfBuffer.toString('base64');
      
      console.log('PDF converted to base64, size:', base64Data.length);
      
      res.json({
        base64Data: base64Data,
        contentType: 'application/pdf',
        filename: `${pdf.title}.pdf`,
        pdf: {
          id: pdf._id,
          title: pdf.title,
          subject: pdf.subject,
          department: pdf.department,
          year: pdf.year
        }
      });
      
    } catch (conversionError) {
      console.error('Failed to convert PDF to base64:', conversionError);
      return res.status(500).json({ error: 'Failed to process PDF file' });
    }
    
  } catch (error) {
    console.error('Get PDF base64 error:', error);
    res.status(500).json({ 
      error: 'Failed to get PDF as base64', 
      message: error.message 
    });
  }
});

// PDF upload route (new, using Google Drive)
router.post('/upload', [
  authenticate,
  upload.single('pdf'),
  body('title').notEmpty(),
  body('department').isIn(['AIML', 'CSE', 'ECE', 'EEE', 'IT']),
  body('year').isInt({ min: 1, max: 4 }),
  body('subject').notEmpty(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    const { title, department, year, subject, tags, description } = req.body;
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }
    // Upload to Google Drive
    const uploadResult = await googleDriveService.uploadPdf(
      file.buffer,
      file.originalname,
      department,
      year,
      subject,
      file.mimetype
    );
    if (!uploadResult.success) {
      return res.status(500).json({ error: 'Failed to upload PDF', message: uploadResult.error });
    }
    // Save PDF metadata to DB
    const pdf = await PDF.create({
      title,
      description,
      fileName: file.filename || file.originalname,
      originalName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      department,
      year,
      subject,
      tags: tags || [],
      uploadedBy: req.user._id,
      googleDriveFileId: uploadResult.fileId,
    });
    res.status(201).json({ success: true, pdf });
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: 'Failed to upload PDF', message: error.message });
  }
});

module.exports = router;
