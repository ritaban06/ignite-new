const express = require('express');
const multer = require('multer');
const { body, query, validationResult } = require('express-validator');
const PDF = require('../models/PDF');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');
const r2Service = require('../services/r2Service');
const { 
  authenticate, 
  requireAdmin, 
  logAccess, 
  uploadRateLimit 
} = require('../middleware/auth');

const router = express.Router();

// Configure multer for admin uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit for admin uploads
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Apply authentication and admin requirement to all routes
router.use(authenticate);
router.use(requireAdmin);

// Upload PDF
router.post('/upload', [
  uploadRateLimit,
  upload.single('pdf'),
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('department').isIn(['AIML', 'CSE', 'ECE', 'EEE', 'IT']),
  body('year').isInt({ min: 1, max: 4 }),
  body('subject').trim().isLength({ min: 1, max: 100 }),
  body('tags').optional()
], async (req, res) => {
  try {
    console.log('Upload request - User object:', {
      _id: req.user._id,
      username: req.user.username,
      role: req.user.role,
      isEnvAdmin: req.user.isEnvAdmin
    });

    console.log('Upload request body:', req.body);
    console.log('Upload file info:', req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    } : 'No file');

    // Process tags from FormData - when multiple values are sent with same key,
    // they might not be automatically converted to array
    if (req.body.tags && !Array.isArray(req.body.tags)) {
      req.body.tags = [req.body.tags];
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        error: 'PDF file is required' 
      });
    }

    const { title, description, department, year, subject, tags } = req.body;

    // Upload to R2
    const uploadResult = await r2Service.uploadPdf(
      req.file.buffer,
      req.file.originalname,
      department,
      parseInt(year),
      subject,
      req.file.mimetype
    );

    if (!uploadResult.success) {
      return res.status(500).json({ 
        error: 'Failed to upload file to storage' 
      });
    }

    // Create PDF record in database
    const pdf = new PDF({
      title,
      description,
      fileName: uploadResult.fileKey,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      department,
      year: parseInt(year),
      subject,
      tags: tags || [],
      uploadedBy: req.user._id,
      cloudflareKey: uploadResult.fileKey
    });

    await pdf.save();

    // Log upload activity
    await AccessLog.logAccess({
      userId: req.user._id,
      pdfId: pdf._id,
      action: 'upload',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId: req.deviceId,
      metadata: {
        fileSize: req.file.size,
        originalName: req.file.originalname,
        department,
        year,
        subject
      }
    });

    res.status(201).json({
      message: 'PDF uploaded successfully',
      pdf: pdf.toJSON()
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    // Try to cleanup uploaded file if database save failed
    if (error.cloudflareKey) {
      r2Service.deletePdf(error.cloudflareKey).catch(console.error);
    }
    
    res.status(500).json({ 
      error: 'Upload failed', 
      message: error.message 
    });
  }
});

// Get all PDFs (admin view)
router.get('/pdfs', [
  query('department').optional().isIn(['AIML', 'CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'CHEMICAL']),
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
        .populate('uploadedBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      PDF.countDocuments(query)
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
  body('title').optional().trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim().isLength({ max: 1000 }),
  body('department').optional().isIn(['AIML', 'CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'CHEMICAL']),
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

    const allowedUpdates = ['title', 'description', 'department', 'year', 'subject', 'tags', 'isActive'];
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
router.delete('/pdfs/:pdfId', async (req, res) => {
  try {
    const pdf = await PDF.findById(req.params.pdfId);
    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Delete from R2 storage
    try {
      await r2Service.deletePdf(pdf.cloudflareKey);
    } catch (r2Error) {
      console.error('Failed to delete from R2:', r2Error);
      // Continue with database deletion even if R2 fails
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
  query('role').optional().isIn(['client', 'admin']),
  query('department').optional().isIn(['AIML', 'CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'CHEMICAL']),
  query('year').optional().isInt({ min: 1, max: 4 }),
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
      isActive = true,
      page = 1, 
      limit = 50 
    } = req.query;

    // Build query
    const query = {};
    if (role) query.role = role;
    if (department) query.department = department;
    if (year) query.year = parseInt(year);
    if (isActive !== undefined) query.isActive = isActive;

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
      filters: { role, department, year, isActive }
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
  body('isActive').optional().isBoolean(),
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('department').optional().isIn(['AIML', 'CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'CHEMICAL']),
  body('year').optional().isInt({ min: 1, max: 4 })
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

    const allowedUpdates = ['isActive', 'name', 'department', 'year'];
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
router.get('/analytics', async (req, res) => {
  try {
    const [
      totalUsers,
      totalPdfs,
      activePdfs,
      recentUploads,
      departmentStats,
      yearStats,
      recentActivity
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
        .limit(50)
    ]);

    res.json({
      overview: {
        totalUsers,
        totalPdfs,
        activePdfs,
        recentUploads
      },
      distribution: {
        byDepartment: departmentStats,
        byYear: yearStats
      },
      recentActivity
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch analytics', 
      message: error.message 
    });
  }
});

// Test R2 connection
router.get('/test-r2', async (req, res) => {
  try {
    const result = await r2Service.testConnection();
    res.json(result);
  } catch (error) {
    console.error('R2 test error:', error);
    res.status(500).json({ 
      error: 'R2 connection test failed', 
      message: error.message 
    });
  }
});

module.exports = router;
