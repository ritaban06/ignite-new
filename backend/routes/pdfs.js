const express = require('express');
const multer = require('multer');
const { body, query, validationResult } = require('express-validator');
const PDF = require('../models/PDF');
const AccessLog = require('../models/AccessLog');
const r2Service = require('../services/r2Service');
const { 
  authenticate, 
  validatePdfAccess, 
  logAccess, 
  pdfViewRateLimit 
} = require('../middleware/auth');

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
  query('department').optional().isIn(['AIML', 'CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'CHEMICAL']),
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

// Get signed URL for viewing PDF
router.post('/:pdfId/view', [
  authenticate,
  validatePdfAccess,
  pdfViewRateLimit,
  logAccess('view')
], async (req, res) => {
  try {
    const pdf = req.pdf;
    
    // Increment view count
    await pdf.incrementViewCount();
    
    // Generate public URL (since bucket is public)
    const urlResult = r2Service.getViewUrl(
      pdf.cloudflareKey,
      req.user._id,
      300 // 5 minutes (not used for public URLs)
    );
    
    if (!urlResult.success) {
      return res.status(500).json({ 
        error: 'Failed to generate view URL' 
      });
    }

    res.json({
      viewUrl: urlResult.url,
      expiresIn: urlResult.expiresIn,
      pdf: {
        id: pdf._id,
        title: pdf.title,
        subject: pdf.subject,
        department: pdf.department,
        year: pdf.year
      }
    });
  } catch (error) {
    console.error('Generate view URL error:', error);
    res.status(500).json({ 
      error: 'Failed to generate view URL', 
      message: error.message 
    });
  }
});

// Search PDFs
router.get('/search/query', [
  authenticate,
  query('q').trim().isLength({ min: 1 }),
  query('department').optional().isIn(['AIML', 'CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'CHEMICAL']),
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
    const r2Result = await r2Service.listFiles();
    
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
              viewUrl: r2Service.getViewUrl(fileKey).url,
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
              viewUrl: r2Service.getViewUrl(fileKey).url,
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

module.exports = router;
