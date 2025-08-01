const express = require('express');
const multer = require('multer');
const { body, query, validationResult } = require('express-validator');
const PDF = require('../models/PDF');
const AccessLog = require('../models/AccessLog');
const GoogleDriveService = require('../services/googleDriveService');
const googleDriveService = new GoogleDriveService(
  JSON.parse(process.env.GDRIVE_CREDENTIALS),
  process.env.GDRIVE_BASE_FOLDER_ID
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
  query('departments').optional().isArray(),
  query('years').optional().isArray(),
  query('semesters').optional().isArray(),
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
      departments, 
      years, 
      semesters, 
      subject, 
      search, 
      tags, 
      page = 1, 
      limit = 20 
    } = req.query;

    // Build filters
    const filters = {};
    if (req.user.role === 'admin') {
      // Admin: ignore departments/years/semesters filters unless explicitly set
      if (departments && Array.isArray(departments) && departments.length > 0) filters.departments = { $in: departments };
      if (years && Array.isArray(years) && years.length > 0) filters.years = { $in: years.map(y => parseInt(y)) };
      if (semesters && Array.isArray(semesters) && semesters.length > 0) filters.semesters = { $in: semesters.map(s => parseInt(s)) };
    } else {
      if (departments && Array.isArray(departments) && departments.length > 0) filters.departments = { $in: departments };
      if (years && Array.isArray(years) && years.length > 0) filters.years = { $in: years.map(y => parseInt(y)) };
      if (semesters && Array.isArray(semesters) && semesters.length > 0) filters.semesters = { $in: semesters.map(s => parseInt(s)) };
    }
    if (subject) filters.subject = subject;
    if (search) filters.search = search;
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];

    // For admin, show all PDFs (unless filters are set)
    let pdfsQuery;
    if (req.user.role === 'admin' && (!departments || departments.length === 0) && !year) {
      // Use the new static method to fetch all PDFs for admin
      pdfsQuery = PDF.findAllForAdmin({ subject, search, tags });
    } else {
      pdfsQuery = PDF.findForUser(req.user, filters);
    }

    // Get PDFs with pagination
    const skip = (page - 1) * limit;
    const [pdfs, totalCount] = await Promise.all([
      pdfsQuery.skip(skip).limit(limit),
      PDF.countDocuments(pdfsQuery.getQuery ? pdfsQuery.getQuery() : pdfsQuery.getFilter ? pdfsQuery.getFilter() : {})
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
        departments: req.user.role === 'admin' ? departments : [req.user.department],
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
    const viewUrl = `/api/pdfs/proxy/${pdf.googleDriveFileId}?token=${token}`;
    res.json({
      viewUrl,
      pdf: {
        id: pdf._id,
        title: pdf.title,
        subject: pdf.subject,
        departments: pdf.departments,
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
  query('departments').optional().isArray(),
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

    const { q, departments, year, page = 1, limit = 20 } = req.query;

    // Build search query
    const searchQuery = {
      $text: { $search: q },
      isActive: true
    };

    // Apply user restrictions
    if (req.user.role !== 'admin') {
      searchQuery.departments = req.user.department;
      searchQuery.year = req.user.year;
    } else {
      if (departments && Array.isArray(departments) && departments.length > 0) searchQuery.departments = { $in: departments };
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

// Get all PDFs from Google Drive
router.get('/gdrive/list', [
  authenticate
], async (req, res) => {
  try {
    // List all files in the R2 bucket
    const r2Result = await googleDriveService.listFiles();
    
    if (!r2Result.success) {
      return res.status(500).json({
        error: 'Failed to list files from Google Drive',
        message: r2Result.error
      });
    }

    // Get corresponding PDF documents from database with user access control
    const gdriveFiles = r2Result.files || [];
    const pdfsWithDetails = [];

    for (const file of gdriveFiles) {
      try {
        // Find PDF in database by googleDriveFileId
        const pdf = await PDF.findOne({ googleDriveFileId: file.id });
        
        if (pdf) {
          // For admin users, show all PDFs regardless of department/year
          if (req.user.role === 'admin' || pdf.canUserAccess(req.user)) {
            pdfsWithDetails.push({
              id: pdf._id,
              title: pdf.title,
              subject: pdf.subject,
              department: pdf.department,
              year: pdf.year,
              googleDriveFileId: file.id,
              viewUrl: googleDriveService.getViewUrl(file.id),
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
              title: file.name,
              subject: 'Unknown',
              department: 'Unknown',
              year: 'Unknown',
              googleDriveFileId: file.id,
              viewUrl: googleDriveService.getViewUrl(file.id),
              createdAt: null,
              fileSize: null,
              viewCount: 0,
              isOrphaned: true
            });
          }
        }
      } catch (error) {
        console.error(`Error processing file ${file.id}:`, error);
      }
    }

    res.json({
      message: 'Google Drive files retrieved successfully',
      totalFiles: gdriveFiles.length,
      accessibleFiles: pdfsWithDetails.length,
      userAccess: {
        department: req.user.department,
        year: req.user.year,
        role: req.user.role
      },
      pdfs: pdfsWithDetails
    });

  } catch (error) {
    console.error('List Google Drive files error:', error);
    res.status(500).json({
      error: 'Failed to list Google Drive files',
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
      console.error('[PDF Proxy] No token provided');
      return res.status(401).json({ error: 'Token required' });
    }
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[PDF Proxy] Decoded JWT:', decoded);
      if (decoded.fileId !== req.params.fileId) {
        console.error('[PDF Proxy] Token fileId mismatch:', decoded.fileId, req.params.fileId);
        return res.status(403).json({ error: 'Invalid token for this file' });
      }
      req.user = decoded; // Attach user info if needed
      next();
    } catch (err) {
      console.error('[PDF Proxy] Invalid or expired token:', err);
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }
], async (req, res) => {
  try {
    // Stream PDF from Google Drive
    const fileId = req.params.fileId;
    console.log('[PDF Proxy] Incoming fileId:', fileId);
    const driveResult = await googleDriveService.downloadPdf(fileId);
    console.log('[PDF Proxy] googleDriveService.downloadPdf result:', driveResult);
    if (!driveResult.success) {
      console.error('[PDF Proxy] Failed to fetch PDF from Google Drive:', driveResult.error);
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
      console.error('[PDF Proxy] Error streaming PDF:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming PDF' });
      }
    });
  } catch (error) {
    console.error('[PDF Proxy] Failed to serve PDF:', error);
    res.status(500).json({ error: 'Failed to serve PDF', message: error.message });
  }
});

// Handle CORS preflight requests for PDF proxy
router.options('/proxy/:fileId', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control',
    'Access-Control-Max-Age': '86400' // 24 hours
  });
  res.status(200).end();
});

// Test R2 connectivity endpoint (admin only) (Now deprecated, using Google Drive service directly)
// router.get('/test-r2-connection', authenticate, async (req, res) => {
//   try {
//     if (req.user.role !== 'admin') {
//       return res.status(403).json({ error: 'Admin access required' });
//     }

//     console.log('Testing R2 connection...');
    
//     // Test basic R2 configuration
//     const configTest = {
//       hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
//       hasAccessKey: !!process.env.R2_ACCESS_KEY_ID,
//       hasSecretKey: !!process.env.R2_SECRET_ACCESS_KEY,
//       hasBucketName: !!process.env.R2_BUCKET_NAME
//     };

//     console.log('R2 Config:', configTest);

//     // Test listing files
//     const listResult = await googleDriveService.listFiles();
    
//     let testResults = {
//       config: configTest,
//       listFiles: {
//         success: listResult.success,
//         fileCount: listResult.files ? listResult.files.length : 0,
//         error: listResult.error
//       }
//     };

//     // If list works, test signed URL generation
//     if (listResult.success && listResult.files.length > 0) {
//       const firstFile = listResult.files[0];
//       console.log('Testing signed URL for:', firstFile);
      
//       const signedUrlResult = await googleDriveService.getSignedViewUrl(firstFile, 60);
//       testResults.signedUrl = {
//         success: signedUrlResult.success,
//         hasUrl: !!signedUrlResult.url,
//         error: signedUrlResult.error
//       };

//       // Test PDF stream
//       console.log('Testing PDF stream for:', firstFile);
//       const streamResult = await googleDriveService.getPdfStream(firstFile);
//       testResults.pdfStream = {
//         success: streamResult.success,
//         useSignedUrl: streamResult.useSignedUrl,
//         hasStream: !!streamResult.stream,
//         error: streamResult.error
//       };
//     }

//     res.json({
//       message: 'R2 connection test completed',
//       results: testResults,
//       timestamp: new Date().toISOString()
//     });

//   } catch (error) {
//     console.error('R2 connection test error:', error);
//     res.status(500).json({
//       error: 'R2 connection test failed',
//       message: error.message,
//       timestamp: new Date().toISOString()
//     });
//   }
// });

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
    const pdfResult = await googleDriveService.downloadPdf(pdf.googleDriveFileId);
    
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
        departments: pdf.departments,
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
    // Fetch parent folder ID from Google Drive
    let googleDriveFolderId = null;
    let uploadedByName = null;
    let uploadedAt = null;
    const fullMeta = await googleDriveService.getFileFullMetadata(uploadResult.fileId);
    if (fullMeta) {
      googleDriveFolderId = fullMeta.parents && fullMeta.parents.length > 0 ? fullMeta.parents[0] : null;
      uploadedByName = fullMeta.owners && fullMeta.owners.length > 0 ? fullMeta.owners[0].displayName || fullMeta.owners[0].emailAddress : null;
      uploadedAt = fullMeta.createdTime ? new Date(fullMeta.createdTime) : null;
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
      googleDriveFolderId,
      uploadedByName,
      uploadedAt,
    });
    res.status(201).json({ success: true, pdf });
  } catch (error) {
    console.error('PDF upload error:', error);
    res.status(500).json({ error: 'Failed to upload PDF', message: error.message });
  }
});

// Utility route: Sync/caches all PDFs from Google Drive folder into MongoDB
router.post('/gdrive/cache', authenticate, async (req, res) => {
  try {
    // Only allow admin to trigger cache
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    // Recursively list all PDFs in the base folder and subfolders
    const allFiles = await googleDriveService.listFilesRecursive();
    const allDriveIds = new Set(allFiles.map(f => f.id));
    let added = 0, updated = 0, removed = 0;

    // Find all PDFs in DB that have a googleDriveFileId
    const dbPdfs = await PDF.find({ googleDriveFileId: { $exists: true } });
    // Remove PDFs that no longer exist in Drive
    for (const pdf of dbPdfs) {
      if (!allDriveIds.has(pdf.googleDriveFileId)) {
        await PDF.deleteOne({ _id: pdf._id });
        removed++;
      }
    }

    // Add or update PDFs from Drive
    for (const file of allFiles) {
      let googleDriveFolderId = file.parents && file.parents.length > 0 ? file.parents[0] : null;
      let uploadedByName = null;
      let uploadedAt = null;
      if (file.id) {
        const fullMeta = await googleDriveService.getFileFullMetadata(file.id);
        if (fullMeta) {
          uploadedByName = fullMeta.owners && fullMeta.owners.length > 0 ? fullMeta.owners[0].displayName || fullMeta.owners[0].emailAddress : null;
          uploadedAt = fullMeta.createdTime ? new Date(fullMeta.createdTime) : null;
        }
      }
      const existingPdf = await PDF.findOne({ googleDriveFileId: file.id });
      if (!existingPdf) {
        await PDF.create({
          title: file.name,
          fileName: file.name,
          originalName: file.name,
          fileSize: file.size ? parseInt(file.size) : 0,
          mimeType: 'application/pdf',
          departments: ['IT'], // Use a valid department array
          year: null, // null to indicate unknown year
          subject: 'Unknown',
          tags: [],
          uploadedBy: req.user._id, // Admin user
          isActive: true,
          googleDriveFileId: file.id,
          googleDriveFolderId,
          uploadedByName,
          uploadedAt,
        });
        added++;
      } else {
        // Update metadata if changed
        let needsUpdate = false;
        if (existingPdf.title !== file.name) { existingPdf.title = file.name; needsUpdate = true; }
        if (existingPdf.fileName !== file.name) { existingPdf.fileName = file.name; needsUpdate = true; }
        if (existingPdf.originalName !== file.name) { existingPdf.originalName = file.name; needsUpdate = true; }
        if (existingPdf.fileSize !== (file.size ? parseInt(file.size) : 0)) { existingPdf.fileSize = file.size ? parseInt(file.size) : 0; needsUpdate = true; }
        if (existingPdf.googleDriveFolderId !== googleDriveFolderId) { existingPdf.googleDriveFolderId = googleDriveFolderId; needsUpdate = true; }
        if (existingPdf.uploadedByName !== uploadedByName) { existingPdf.uploadedByName = uploadedByName; needsUpdate = true; }
        if (existingPdf.uploadedAt?.toISOString() !== uploadedAt?.toISOString()) { existingPdf.uploadedAt = uploadedAt; needsUpdate = true; }
        if (needsUpdate) {
          await existingPdf.save();
          updated++;
        }
      }
    }
    res.json({ 
      message: `Sync complete: ${added} added, ${updated} updated, ${removed} removed. Total scanned: ${allFiles.length}.`,
      total: allFiles.length, 
      added, 
      updated, 
      removed 
    });
  } catch (error) {
    console.error('Sync PDFs from Google Drive error:', error);
    res.status(500).json({ error: 'Failed to sync PDFs', message: error.message });
  }
});

// console.log('GDRIVE_CREDENTIALS:', process.env.GDRIVE_CREDENTIALS);

module.exports = router;
