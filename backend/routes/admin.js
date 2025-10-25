const express = require('express');
const multer = require('multer');
const { body, query, validationResult } = require('express-validator');
const PDF = require('../models/PDF');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');
const Folder = require('../models/Folder');
const googleSheetsService = require('../services/googleSheetsService');
const googleDriveService = require('../services/googleDriveService');
const { 
  authenticate, 
  requireAdmin, 
  logAccess, 
  uploadRateLimit 
} = require('../middleware/auth');

const router = express.Router();

// Debug middleware to log all requests to admin routes
router.use('*', (req, res, next) => {
  console.log(`Admin route accessed: ${req.method} ${req.originalUrl}`);
  console.log('Headers:', Object.keys(req.headers));
  console.log('Authorization header present:', !!req.headers.authorization);
  console.log('Content-Type:', req.headers['content-type']);
  console.log('Origin:', req.headers.origin);
  next();
});

// Configure multer for admin uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for admin uploads (Vercel limit)
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Simplified upload for debugging - smaller file size limit
const debugUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit instead of 50MB
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter - mimetype:', file.mimetype);
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Public test routes (no auth required)
// Test route without auth for CORS debugging
router.get('/test-cors', (req, res) => {
  res.json({ 
    message: 'Admin CORS test successful',
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  });
});

// Simple ping endpoint to test if admin routes are working
router.get('/ping', (req, res) => {
  res.json({ 
    message: 'Admin routes are working',
    path: req.originalUrl,
    method: req.method,
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  });
});

// Simple upload test endpoint for debugging
router.post('/upload-test', authenticate, requireAdmin, (req, res) => {
  res.json({ 
    message: 'Upload route accessible',
    user: req.user.username,
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  });
});

// Test upload endpoint without auth for debugging
router.post('/upload-debug', (req, res) => {
  console.log('=== UPLOAD DEBUG ENDPOINT ===');
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body present:', !!req.body);
  console.log('=== END UPLOAD DEBUG ===');
  
  res.json({ 
    message: 'Upload debug endpoint reached',
    method: req.method,
    headers: Object.keys(req.headers),
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  });
});

// Test authenticated route for debugging
router.post('/test-auth', authenticate, requireAdmin, (req, res) => {
  res.json({ 
    message: 'Admin auth test successful',
    user: {
      id: req.user._id,
      username: req.user.username,
      role: req.user.role
    },
    origin: req.get('Origin'),
    timestamp: new Date().toISOString()
  });
});

// Apply authentication and admin requirement to protected routes only
// Note: We don't apply this globally to avoid interfering with CORS preflight

// Upload PDF
router.post('/upload', (req, res) => {
  return res.status(403).json({
    error: 'PDF upload is disabled. Google personal accounts do not support admin uploads.'
  });
});

// Get all PDFs (admin view)
router.get('/pdfs', [
  authenticate,
  requireAdmin,
  query('department').optional().isIn(['CSE', 'CSBS', 'AIML', 'CSDS', 'IT', 'CSCS', 'ECE', 'EIE', 'IOT', 'ECS', 'EE', 'CE', 'FT', 'ME', 'BCA', 'BBA', 'BHM', 'BMS']),
  query('year').optional().isInt({ min: 1, max: 4 }),
  query('subject').optional().trim(),
  query('isActive').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('sortBy').optional().isIn(['createdAt', 'title', 'viewCount', 'department', 'year']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
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
      isActive = true,
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    if (department) query.department = department;
    if (year) query.year = parseInt(year);
    if (subject) query.subject = new RegExp(subject, 'i');
    if (isActive !== undefined) query.isActive = isActive;

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [pdfs, totalCount] = await Promise.all([
      PDF.find(query)
        .populate({
          path: 'uploadedBy',
          select: 'name email',
          // Handle case where user might have been deleted
          options: { strictPopulate: false }
        })
        .sort(sort)
        .skip(skip)
        .limit(limit),
      PDF.countDocuments(query)
    ]);

    // Debug: Log any PDFs with missing or problematic uploader info
    const pdfsWithIssues = pdfs.filter(pdf => !pdf.uploadedBy || typeof pdf.uploadedBy === 'string');
    if (pdfsWithIssues.length > 0) {
      console.log(`Found ${pdfsWithIssues.length} PDFs with uploader issues:`);
      pdfsWithIssues.forEach(pdf => {
        console.log(`- PDF: ${pdf.title} (ID: ${pdf._id}), uploadedBy: ${pdf.uploadedBy}`);
      });
    }

    res.json({
      pdfs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      filters: { department, year, subject, isActive },
      sort: { sortBy, sortOrder }
    });
  } catch (error) {
    console.error('Get admin PDFs error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch PDFs', 
      message: error.message 
    });
  }
});

// Update PDF
router.put('/pdfs/:pdfId', [
  authenticate,
  requireAdmin,
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('departments').optional().isArray(),
  body('year').optional().isInt({ min: 1, max: 4 }),
  body('subject').optional().trim().isLength({ min: 1, max: 100 }),
  body('tags').optional().isArray(),
  body('isActive').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const pdf = await PDF.findById(req.params.pdfId);
    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    const allowedUpdates = ['title', 'description', 'departments', 'year', 'subject', 'tags', 'isActive'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    Object.assign(pdf, updates);
    await pdf.save();

    // Log update activity
    await AccessLog.logAccess({
      userId: req.user._id,
      pdfId: pdf._id,
      action: 'update',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId: req.deviceId,
      metadata: { updates }
    });

    res.json({
      message: 'PDF updated successfully',
      pdf: pdf.toJSON()
    });
  } catch (error) {
    console.error('Update PDF error:', error);
    res.status(500).json({ 
      error: 'Failed to update PDF', 
      message: error.message 
    });
  }
});

// Delete PDF
router.delete('/pdfs/:pdfId', authenticate, requireAdmin, async (req, res) => {
  try {
    const pdf = await PDF.findById(req.params.pdfId);
    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Delete from database
    await PDF.findByIdAndDelete(req.params.pdfId);

    // Log deletion activity
    await AccessLog.logAccess({
      userId: req.user._id,
      pdfId: pdf._id,
      action: 'delete',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId: req.deviceId,
      metadata: {
        deletedPdf: {
          title: pdf.title,
          fileName: pdf.fileName,
          department: pdf.department,
          year: pdf.year
        }
      }
    });

    res.json({
      message: 'PDF deleted successfully',
      deletedPdf: {
        id: pdf._id,
        title: pdf.title,
        fileName: pdf.fileName
      }
    });
  } catch (error) {
    console.error('Delete PDF error:', error);
    res.status(500).json({ 
      error: 'Failed to delete PDF', 
      message: error.message 
    });
  }
});

// Get all users (admin view)
router.get('/users', [
  authenticate,
  requireAdmin,
  query('role').optional().isIn(['client', 'admin']),
  query('department').optional().isIn(['CSE', 'CSBS', 'AIML', 'CSDS', 'IT', 'CSCS', 'ECE', 'EIE', 'IOT', 'ECS', 'EE', 'CE', 'FT', 'ME', 'BCA', 'BBA', 'BHM', 'BMS']),
  query('year').optional().isInt({ min: 1, max: 4 }),
  query('semester').optional().isInt({ min: 1, max: 8 }),
  query('isActive').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
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
      role, 
      department, 
      year, 
      semester,
      isActive = true,
      page = 1, 
      limit = 50,
      search
    } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (department) query.department = department;
    if (year) query.year = parseInt(year);
    if (semester) query.semester = parseInt(semester);
    if (isActive !== undefined) query.isActive = isActive;
    if (search && typeof search === 'string' && search.trim().length > 0) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, totalCount] = await Promise.all([
      User.find(query)
        .select('-password -loginAttempts -lockUntil')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    res.json({
      users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      filters: { role, department, year, semester, isActive }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users', 
      message: error.message 
    });
  }
});

// Update user
router.put('/users/:userId', [
  authenticate,
  requireAdmin,
  body('isActive').optional().isBoolean(),
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('department').optional().isIn(['CSE', 'CSBS', 'AIML', 'CSDS', 'IT', 'CSCS', 'ECE', 'EIE', 'IOT', 'ECS', 'EE', 'CE', 'FT', 'ME', 'BCA', 'BBA', 'BHM', 'BMS']),
  body('year').optional().isInt({ min: 1, max: 4 }),
  body('semester').optional().isInt({ min: 1, max: 8 }),
  body('accessTags').optional().isArray(),
  body('accessTags.*').optional().isString().trim().isLength({ min: 1, max: 50 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admin from modifying other admins
    if (user.role === 'admin' && !user._id.equals(req.user._id)) {
      return res.status(403).json({ 
        error: 'Cannot modify other admin accounts' 
      });
    }

    const allowedUpdates = ['isActive', 'name', 'department', 'year', 'semester', 'accessTags'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    Object.assign(user, updates);
    await user.save();

    // Log admin action
    await AccessLog.logAccess({
      userId: req.user._id,
      action: 'user_update',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId: req.deviceId,
      metadata: { 
        targetUserId: user._id,
        updates 
      }
    });

    res.json({
      message: 'User updated successfully',
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      error: 'Failed to update user', 
      message: error.message 
    });
  }
});

// Get analytics dashboard data
router.get('/analytics', authenticate, requireAdmin, async (req, res) => {
  try {
    const [
      totalUsers,
      totalPdfs,
      activePdfs,
      recentUploads,
      departmentStats,
      yearStats,
      recentActivity,
      totalViews,
      topPdfs,
      uploaderStats,
      totalFolders
    ] = await Promise.all([
      User.countDocuments({ role: 'client', isActive: true }),
      PDF.countDocuments(),
      PDF.countDocuments({ isActive: true }),
      PDF.countDocuments({ 
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } 
      }),
      PDF.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$department', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      PDF.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$year', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      AccessLog.find()
        .populate('user', 'name email department year')
        .populate('pdf', 'title department year')
        .sort({ createdAt: -1 })
        .limit(50),
      PDF.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: null, totalViews: { $sum: '$viewCount' } } }
      ]),
      PDF.find({ isActive: true })
        .populate('uploadedBy', 'name email')
        .sort({ viewCount: -1 })
        .limit(10)
        .select('title department year viewCount uploadedBy'),
      PDF.aggregate([
        { $match: { isActive: true } },
        { 
          $lookup: {
            from: 'users',
            localField: 'uploadedBy',
            foreignField: '_id',
            as: 'uploader'
          }
        },
        { $unwind: { path: '$uploader', preserveNullAndEmptyArrays: true } },
        { 
          $group: { 
            _id: '$uploader.name', 
            count: { $sum: 1 },
            totalViews: { $sum: '$viewCount' }
          } 
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      Folder.countDocuments() // Count total folders
    ]);

    res.json({
      overview: {
        totalUsers,
        totalPdfs,
        activePdfs,
        recentUploads,
        totalViews: totalViews[0]?.totalViews || 0,
        totalFolders // Include totalFolders in the overview
      },
      distribution: {
        byDepartment: departmentStats,
        byYear: yearStats
      },
      recentActivity,
      topPdfs: topPdfs.map(pdf => ({
        _id: pdf._id,
        title: pdf.title,
        department: pdf.department,
        year: pdf.year,
        viewCount: pdf.viewCount || 0,
        uploadedBy: pdf.uploadedBy?.name || 'System Admin'
      })),
      topUploaders: uploaderStats.map(uploader => ({
        name: uploader._id || 'System Admin',
        pdfCount: uploader.count,
        totalViews: uploader.totalViews || 0
      }))
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics', 
      message: error.message 
    });
  }
});


// Sync from Google Sheets
router.post('/sync-sheets', authenticate, requireAdmin, async (req, res) => {
  try {
    console.log('Admin initiated Google Sheets sync');
    
    // Clear cache to force fresh fetch
    googleSheetsService.clearCache();
    
    // Fetch fresh data from Google Sheets
    const users = await googleSheetsService.fetchApprovedUsers();
    
    // Import/upsert users into database
    let importStats = {
      added: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };
    
    let skippedDetails = [];
    
    for (const sheetUser of users) {
      try {
        // Skip if missing required fields
        if (!sheetUser.email || !sheetUser.name) {
          importStats.skipped++;
          skippedDetails.push({
            email: sheetUser.email || 'MISSING',
            name: sheetUser.name || 'MISSING',
            reason: 'Missing required fields (email or name)'
          });
          continue;
        }
        
        // Find existing user by email
        const existingUser = await User.findOne({ 
          email: sheetUser.email.toLowerCase().trim() 
        });
        
        if (existingUser) {
          // Update existing user (but don't change admin accounts)
          if (existingUser.role !== 'admin') {
            let hasChanges = false;
            
            if (existingUser.name !== sheetUser.name?.trim()) {
              existingUser.name = sheetUser.name.trim();
              hasChanges = true;
            }
            
            if (existingUser.department !== sheetUser.department?.trim()) {
              existingUser.department = sheetUser.department?.trim() || existingUser.department;
              hasChanges = true;
            }
            
            if (existingUser.year !== parseInt(sheetUser.year) && !isNaN(parseInt(sheetUser.year))) {
              existingUser.year = parseInt(sheetUser.year);
              hasChanges = true;
            }
            
            if (existingUser.semester !== parseInt(sheetUser.semester) && !isNaN(parseInt(sheetUser.semester))) {
              existingUser.semester = parseInt(sheetUser.semester);
              hasChanges = true;
            }
            
            if (!existingUser.isActive) {
              existingUser.isActive = true;
              hasChanges = true;
            }
            
            if (hasChanges) {
              await existingUser.save();
              importStats.updated++;
            } else {
              importStats.skipped++;
              skippedDetails.push({
                email: sheetUser.email,
                name: sheetUser.name,
                reason: 'No changes detected - user data already up to date'
              });
            }
          } else {
            importStats.skipped++; // Skip admin accounts
            skippedDetails.push({
              email: sheetUser.email,
              name: sheetUser.name,
              reason: 'Admin account - skipped for safety'
            });
          }
        } else {
          // Create new user
          const newUser = new User({
            email: sheetUser.email.toLowerCase().trim(),
            name: sheetUser.name.trim(),
            department: sheetUser.department?.trim() || 'CSE',
            year: parseInt(sheetUser.year) || 1,
            semester: parseInt(sheetUser.semester) || 1,
            role: 'client',
            isActive: true,
            // Generate a temporary password - user will need to reset
            password: Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
          });
          
          await newUser.save();
          importStats.added++;
        }
      } catch (userError) {
        console.error(`Error processing user ${sheetUser.email}:`, userError);
        importStats.errors++;
        skippedDetails.push({
          email: sheetUser.email || 'UNKNOWN',
          name: sheetUser.name || 'UNKNOWN',
          reason: `Processing error: ${userError.message}`
        });
      }
    }
    
    // Get cache status for response
    const cacheStatus = googleSheetsService.getCacheStatus();
    
    // Log sync action to console for admin audit trail
    console.log(`Admin ${req.user.username} synced Google Sheets - Added: ${importStats.added}, Updated: ${importStats.updated}, Skipped: ${importStats.skipped}, Errors: ${importStats.errors}`);
    
    // Log details of skipped users
    if (skippedDetails.length > 0) {
      // console.log('Skipped users details:');
      // skippedDetails.forEach((detail, index) => {
      //   console.log(`  ${index + 1}. ${detail.email} (${detail.name}) - ${detail.reason}`);
      // });
    }
    
    res.json({ 
      success: true,
      message: `Successfully synced ${users.length} users from Google Sheets. Added: ${importStats.added}, Updated: ${importStats.updated}, Skipped: ${importStats.skipped}, Errors: ${importStats.errors}`,
      data: {
        sheetsUsersCount: users.length,
        importStats,
        skippedUsers: skippedDetails.slice(0, 10), // Only return first 10 for response size
        cacheStatus,
        syncTime: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to sync from Google Sheets', 
      message: error.message 
    });
  }
});

// Get Google Sheets cache status
router.get('/sheets-status', authenticate, requireAdmin, (req, res) => {
  try {
    const cacheStatus = googleSheetsService.getCacheStatus();
    res.json({
      success: true,
      data: cacheStatus
    });
  } catch (error) {
    console.error('Error getting sheets status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to get sheets status', 
      message: error.message 
    });
  }
});

// Disable all test and debug upload endpoints
router.post(['/upload-test','/upload-debug','/test-upload-file','/test-upload-minimal','/test-upload-no-validation','/test-upload-no-rate-limit','/test-upload-cors','/upload-no-auth','/upload-simple','/debug-upload','/simple-upload'], (req, res) => {
  return res.status(403).json({
    error: 'PDF upload is disabled. Google personal accounts do not support admin uploads.'
  });
});

// Minimal upload test - step by step debugging
router.post('/test-upload-minimal', [
  (req, res, next) => {
    console.log('=== MINIMAL UPLOAD STEP 1: Request received ===');
    console.log('Method:', req.method);
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Authorization:', req.get('Authorization') ? 'Present' : 'Missing');
    next();
  },
  authenticate,
  (req, res, next) => {
    console.log('=== MINIMAL UPLOAD STEP 2: Authentication passed ===');
    console.log('User:', req.user?.username);
    console.log('Role:', req.user?.role);
    next();
  },
  requireAdmin,
  (req, res, next) => {
    console.log('=== MINIMAL UPLOAD STEP 3: Admin check passed ===');
    next();
  },
  upload.single('pdf'),
  (req, res, next) => {
    console.log('=== MINIMAL UPLOAD STEP 4: File upload middleware ===');
    console.log('File received:', !!req.file);
    if (req.file) {
      console.log('File details:', {
        name: req.file.originalname,
        size: req.file.size,
        type: req.file.mimetype
      });
    }
    console.log('Body:', req.body);
    next();
  }
], (req, res) => {
  console.log('=== MINIMAL UPLOAD STEP 5: Final handler ===');
  
  res.json({
    success: true,
    message: 'All middleware passed successfully',
    fileReceived: !!req.file,
    fileName: req.file?.originalname,
    fileSize: req.file?.size,
    formData: req.body,
    user: {
      username: req.user?.username,
      role: req.user?.role
    },
    timestamp: new Date().toISOString()
  });
});

// Upload test without validation to isolate validation issues
router.post('/test-upload-no-validation', authenticate, requireAdmin, upload.single('pdf'), (req, res) => {
  console.log('=== UPLOAD WITHOUT VALIDATION ===');
  console.log('File received:', !!req.file);
  console.log('File info:', req.file ? {
    originalname: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size
  } : 'No file');
  console.log('Body:', req.body);
  console.log('=== END UPLOAD WITHOUT VALIDATION ===');
  
  res.json({
    success: true,
    message: 'Upload test without validation successful',
    fileReceived: !!req.file,
    fileName: req.file?.originalname,
    fileSize: req.file?.size,
    bodyKeys: Object.keys(req.body || {}),
    timestamp: new Date().toISOString()
  });
});

// Upload test without rate limiting to isolate rate limit issues
router.post('/test-upload-no-rate-limit', authenticate, requireAdmin, upload.single('pdf'), (req, res) => {
  console.log('=== UPLOAD WITHOUT RATE LIMIT ===');
  console.log('File received:', !!req.file);
  console.log('User:', req.user?.username);
  console.log('=== END UPLOAD WITHOUT RATE LIMIT ===');
  
  res.json({
    success: true,
    message: 'Upload test without rate limit successful',
    fileReceived: !!req.file,
    timestamp: new Date().toISOString()
  });
});

// Test upload endpoint for CORS debugging (no auth)
router.post('/test-upload-cors', (req, res) => {
  console.log('=== TEST UPLOAD CORS ===');
  console.log('Origin:', req.get('Origin'));
  console.log('Method:', req.method);
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Response CORS headers:', {
    'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
    'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials')
  });
  console.log('=== END TEST ===');
  
  res.json({ 
    message: 'Upload CORS test successful',
    origin: req.get('Origin'),
    timestamp: new Date().toISOString(),
    method: req.method,
    corsHeaders: {
      'Access-Control-Allow-Origin': res.get('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': res.get('Access-Control-Allow-Credentials')
    }
  });
});

// Diagnostic endpoint - minimal dependencies
router.get('/health', (req, res) => {
  try {
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      headers: {
        origin: req.get('Origin'),
        userAgent: req.get('User-Agent'),
        contentType: req.get('Content-Type')
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Diagnostic endpoint - check environment variables
router.get('/env-check', (req, res) => {
  try {
    const envCheck = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      checks: {
        JWT_SECRET: !!process.env.JWT_SECRET,
        MONGODB_URI: !!process.env.MONGODB_URI,
        ADMIN_USERNAME: !!process.env.ADMIN_USERNAME,
        GOOGLE_SHEETS_ID: !!process.env.GOOGLE_SHEETS_ID
      }
    };
    
    res.json(envCheck);
  } catch (error) {
    console.error('Environment check error:', error);
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Super simple upload test - no middleware
router.post('/simple-upload', (req, res) => {
  try {
    console.log('=== SIMPLE UPLOAD TEST ===');
    console.log('Method:', req.method);
    console.log('Headers present:', Object.keys(req.headers || {}));
    console.log('Body type:', typeof req.body);
    console.log('Raw body available:', !!req.rawBody);
    console.log('=== END SIMPLE UPLOAD TEST ===');
    
    res.json({
      success: true,
      message: 'Simple upload endpoint reached',
      method: req.method,
      timestamp: new Date().toISOString(),
      headers: Object.keys(req.headers || {}),
      bodyType: typeof req.body
    });
  } catch (error) {
    console.error('Simple upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug upload with smaller limits
router.post('/debug-upload', [
  (req, res, next) => {
    console.log('=== DEBUG UPLOAD START ===');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Content-Length:', req.get('Content-Length'));
    next();
  },
  debugUpload.single('pdf'),
  (req, res, next) => {
    console.log('=== DEBUG UPLOAD FILE PROCESSED ===');
    console.log('File received:', !!req.file);
    if (req.file) {
      console.log('File size:', req.file.size);
      console.log('File type:', req.file.mimetype);
    }
    next();
  }
], (req, res) => {
  try {
    console.log('=== DEBUG UPLOAD SUCCESS ===');
    res.json({
      success: true,
      message: 'Debug upload successful',
      fileReceived: !!req.file,
      fileSize: req.file?.size,
      fileName: req.file?.originalname,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Debug upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test the actual upload route but without authentication
router.post('/upload-no-auth', [
  (req, res, next) => {
    console.log('=== UPLOAD NO AUTH - START ===');
    console.log('Content-Type:', req.get('Content-Type'));
    console.log('Origin:', req.get('Origin'));
    next();
  },
  upload.single('pdf'),
  (req, res, next) => {
    console.log('=== UPLOAD NO AUTH - FILE PROCESSED ===');
    console.log('File received:', !!req.file);
    next();
  }
], async (req, res) => {
  try {
    console.log('=== UPLOAD NO AUTH - PROCESSING ===');
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'PDF file is required' 
      });
    }

    // Just return success without actually saving anything
    res.json({
      success: true,
      message: 'Upload test successful (no auth, no save)',
      fileReceived: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Upload no auth error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Simplified main upload route for debugging
router.post('/upload-simple', authenticate, requireAdmin, upload.single('pdf'), async (req, res) => {
  try {
    console.log('=== SIMPLE UPLOAD ROUTE ===');
    console.log('User:', req.user?.username);
    console.log('File received:', !!req.file);
    
    if (!req.file) {
      return res.status(400).json({ 
        error: 'PDF file is required' 
      });
    }

    const { title = 'Test Title', department = 'CSE', year = 1, subject = 'Test Subject' } = req.body;

    console.log('Basic validation passed');

    // Skip R2 upload and database save for now - just test the middleware
    res.json({
      success: true,
      message: 'Simple upload route successful',
      fileReceived: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      formData: { title, department, year, subject },
      user: req.user?.username,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Simple upload route error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Fix orphaned PDF uploader references
router.post('/fix-orphaned-uploaders', [
  authenticate,
  requireAdmin
], async (req, res) => {
  try {
    // Find PDFs with invalid uploadedBy references
    const pdfs = await PDF.find({}).populate('uploadedBy');
    const orphanedPdfs = pdfs.filter(pdf => !pdf.uploadedBy);
    console.log(`Found ${orphanedPdfs.length} PDFs with orphaned uploader references`);
    let updatedCount = 0;
    const updatedPdfs = [];
    for (const pdf of orphanedPdfs) {
      // Fetch metadata from Google Drive
      const metadata = await googleDriveService.getFileFullMetadata(pdf.googleDriveFileId);
      let uploaderName = 'Unknown';
      let uploadDate = null;
      if (metadata) {
        if (metadata.owners && metadata.owners.length > 0) {
          uploaderName = metadata.owners[0].displayName || metadata.owners[0].email || 'Unknown';
        }
        uploadDate = metadata.createdTime || null;
      }
      // Store uploader name and upload date in PDF document (custom fields)
      pdf.uploadedByName = uploaderName;
      pdf.uploadedAt = uploadDate;
      await pdf.save();
      updatedCount++;
      updatedPdfs.push({ id: pdf._id, uploaderName, uploadDate });
    }
    res.json({
      message: 'Fixed orphaned uploader references with Google Drive metadata',
      orphanedCount: orphanedPdfs.length,
      updatedCount,
      updatedPdfs
    });
  } catch (error) {
    console.error('Fix orphaned uploaders error:', error);
    res.status(500).json({
      error: 'Failed to fix orphaned uploaders',
      message: error.message
    });
  }
});

module.exports = router;
