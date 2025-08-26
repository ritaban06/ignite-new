const express = require('express');
const { body, validationResult } = require('express-validator');
const AccessTag = require('../models/AccessTag');
const User = require('../models/User');
const Folder = require('../models/Folder');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { emitAccessTagUpdate } = require('../utils/socketEvents');

const router = express.Router();

// Get all access tags with optional filtering
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { category, active, search, sort = 'name' } = req.query;
    
    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (active !== undefined) filter.isActive = active === 'true';
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Build sort object
    const sortOptions = {};
    switch (sort) {
      case 'usage':
        sortOptions.usageCount = -1;
        sortOptions.name = 1;
        break;
      case 'category':
        sortOptions.category = 1;
        sortOptions.name = 1;
        break;
      case 'created':
        sortOptions.createdAt = -1;
        break;
      default:
        sortOptions.name = 1;
    }
    
    const tags = await AccessTag.find(filter)
      .populate('createdBy', 'name email')
      .sort(sortOptions)
      .lean();
    
    // Add virtual assignedCount to each tag
    const tagsWithCounts = tags.map(tag => ({
      ...tag,
      assignedCount: (tag.assignedUsers?.length || 0) + (tag.assignedFolders?.length || 0)
    }));
    
    res.json({
      tags: tagsWithCounts,
      total: tagsWithCounts.length
    });
  } catch (error) {
    console.error('Get access tags error:', error);
    res.status(500).json({ error: 'Failed to fetch access tags', message: error.message });
  }
});

// Get all access tags
router.get('/', authenticate, async (req, res) => {
  try {
    const { sort = 'name' } = req.query;
    const tags = await AccessTag.find().sort({ [sort]: 1 });
    res.json(tags);
  } catch (error) {
    console.error('Fetch access tags error:', error);
    res.status(500).json({ error: 'Failed to fetch access tags', message: error.message });
  }
});

// Get access tags by category
router.get('/category/:category', authenticate, requireAdmin, async (req, res) => {
  try {
    const { category } = req.params;
    const tags = await AccessTag.getByCategory(category);
    res.json(tags);
  } catch (error) {
    console.error('Get tags by category error:', error);
    res.status(500).json({ error: 'Failed to fetch tags by category', message: error.message });
  }
});

// Get popular access tags
router.get('/popular', authenticate, requireAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const tags = await AccessTag.getPopularTags(parseInt(limit));
    res.json(tags);
  } catch (error) {
    console.error('Get popular tags error:', error);
    res.status(500).json({ error: 'Failed to fetch popular tags', message: error.message });
  }
});

// Get tag statistics
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const totalTags = await AccessTag.countDocuments();
    const activeTags = await AccessTag.countDocuments({ isActive: true });
    const inactiveTags = await AccessTag.countDocuments({ isActive: false });
    
    const categoryStats = await AccessTag.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const usageStats = await AccessTag.aggregate([
      {
        $group: {
          _id: null,
          totalUsage: { $sum: '$usageCount' },
          avgUsage: { $avg: '$usageCount' },
          maxUsage: { $max: '$usageCount' }
        }
      }
    ]);
    
    res.json({
      total: totalTags,
      active: activeTags,
      inactive: inactiveTags,
      categoryBreakdown: categoryStats,
      usage: usageStats[0] || { totalUsage: 0, avgUsage: 0, maxUsage: 0 }
    });
  } catch (error) {
    console.error('Get tag statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch tag statistics', message: error.message });
  }
});

// Create new access tag
router.post('/', [
  authenticate,
  requireAdmin,
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Tag name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Tag name can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('category')
    .isIn(['academic', 'department', 'special-group', 'course', 'project', 'research', 'temporary', 'other'])
    .withMessage('Invalid category'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color code')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }
    
    const { name, description, category, color } = req.body;
    
    // Check if tag name already exists
    const existingTag = await AccessTag.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });
    
    if (existingTag) {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    
    const tag = new AccessTag({
      name,
      description,
      category,
      color: color || '#3B82F6',
      createdBy: req.user._id
    });
    
    await tag.save();
    await tag.populate('createdBy', 'name email');
    
    res.status(201).json({
      message: 'Access tag created successfully',
      tag
    });
  } catch (error) {
    console.error('Create access tag error:', error);
    res.status(500).json({ error: 'Failed to create access tag', message: error.message });
  }
});

// Update access tag
router.put('/:id', [
  authenticate,
  requireAdmin,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Tag name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Tag name can only contain letters, numbers, spaces, hyphens, and underscores'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('category')
    .optional()
    .isIn(['academic', 'department', 'special-group', 'course', 'project', 'research', 'temporary', 'other'])
    .withMessage('Invalid category'),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color must be a valid hex color code'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }
    
    const tag = await AccessTag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ error: 'Access tag not found' });
    }
    
    const { name, description, category, color, isActive } = req.body;
    
    // Check if new name conflicts with existing tag
    if (name && name !== tag.name) {
      const existingTag = await AccessTag.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: tag._id }
      });
      
      if (existingTag) {
        return res.status(409).json({ error: 'Tag name already exists' });
      }
    }
    
    // Update fields
    if (name !== undefined) tag.name = name;
    if (description !== undefined) tag.description = description;
    if (category !== undefined) tag.category = category;
    if (color !== undefined) tag.color = color;
    if (isActive !== undefined) tag.isActive = isActive;
    
    await tag.save();
    await tag.populate('createdBy', 'name email');
    
    // Emit socket.io event for real-time updates
    try {
      emitAccessTagUpdate(req, tag);
    } catch (socketError) {
      console.warn('Failed to emit access tag update event:', socketError.message);
      // Don't fail the request if socket event fails
    }
    
    res.json({
      message: 'Access tag updated successfully',
      tag
    });
  } catch (error) {
    console.error('Update access tag error:', error);
    res.status(500).json({ error: 'Failed to update access tag', message: error.message });
  }
});

// Delete access tag
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const tag = await AccessTag.findById(req.params.id);
    if (!tag) {
      return res.status(404).json({ error: 'Access tag not found' });
    }
    
    // Check if tag is in use
    const usageCount = (tag.assignedUsers?.length || 0) + (tag.assignedFolders?.length || 0);
    if (usageCount > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete tag that is currently in use',
        usageCount,
        assignedUsers: tag.assignedUsers?.length || 0,
        assignedFolders: tag.assignedFolders?.length || 0
      });
    }
    
    await AccessTag.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Access tag deleted successfully' });
  } catch (error) {
    console.error('Delete access tag error:', error);
    res.status(500).json({ error: 'Failed to delete access tag', message: error.message });
  }
});

// Bulk operations
router.post('/bulk', [
  authenticate,
  requireAdmin,
  body('action')
    .isIn(['activate', 'deactivate', 'delete'])
    .withMessage('Action must be activate, deactivate, or delete'),
  body('tagIds')
    .isArray({ min: 1 })
    .withMessage('tagIds must be a non-empty array'),
  body('tagIds.*')
    .isMongoId()
    .withMessage('Each tagId must be a valid MongoDB ObjectId')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }
    
    const { action, tagIds } = req.body;
    let result;
    
    switch (action) {
      case 'activate':
        result = await AccessTag.updateMany(
          { _id: { $in: tagIds } },
          { isActive: true }
        );
        break;
      case 'deactivate':
        result = await AccessTag.updateMany(
          { _id: { $in: tagIds } },
          { isActive: false }
        );
        break;
      case 'delete':
        // Check if any tags are in use
        const tagsInUse = await AccessTag.find({
          _id: { $in: tagIds },
          $or: [
            { 'assignedUsers.0': { $exists: true } },
            { 'assignedFolders.0': { $exists: true } }
          ]
        });
        
        if (tagsInUse.length > 0) {
          return res.status(409).json({
            error: 'Cannot delete tags that are currently in use',
            tagsInUse: tagsInUse.map(tag => ({ id: tag._id, name: tag.name }))
          });
        }
        
        result = await AccessTag.deleteMany({ _id: { $in: tagIds } });
        break;
    }
    
    res.json({
      message: `Bulk ${action} completed successfully`,
      modifiedCount: result.modifiedCount || result.deletedCount,
      matchedCount: result.matchedCount
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation', message: error.message });
  }
});

// Get available tags for assignment (active tags only)
router.get('/available', authenticate, async (req, res) => {
  try {
    const { category, search } = req.query;
    
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    const tags = await AccessTag.find(filter)
      .select('name description category color')
      .sort({ name: 1 })
      .lean();
    
    res.json(tags);
  } catch (error) {
    console.error('Get available tags error:', error);
    res.status(500).json({ error: 'Failed to fetch available tags', message: error.message });
  }
});

module.exports = router;