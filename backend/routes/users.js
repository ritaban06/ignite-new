const express = require('express');
const { query, validationResult } = require('express-validator');
const User = require('../models/User');
const AccessLog = require('../models/AccessLog');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all user routes
router.use(authenticate);

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: user.toJSON()
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch profile', 
      message: error.message 
    });
  }
});

// Get user activity summary
router.get('/activity', [
  query('days').optional().isInt({ min: 1, max: 365 }).toInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { days = 30 } = req.query;

    const activitySummary = await AccessLog.getUserActivitySummary(req.user._id, days);
    
    // Get recent activity details
    const recentActivity = await AccessLog.find({
      user: req.user._id
    })
    .populate('pdf', 'title department year subject')
    .sort({ createdAt: -1 })
    .limit(20);

    res.json({
      summary: activitySummary,
      recentActivity,
      period: `Last ${days} days`
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch activity', 
      message: error.message 
    });
  }
});

// Get user statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      totalViews,
      uniquePdfsViewed,
      recentViews,
      viewsByDay
    ] = await Promise.all([
      AccessLog.countDocuments({
        user: userId,
        action: 'view'
      }),
      AccessLog.distinct('pdf', {
        user: userId,
        action: 'view'
      }).then(pdfs => pdfs.length),
      AccessLog.countDocuments({
        user: userId,
        action: 'view',
        createdAt: { $gte: thirtyDaysAgo }
      }),
      AccessLog.aggregate([
        {
          $match: {
            user: userId,
            action: 'view',
            createdAt: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ])
    ]);

    res.json({
      totalViews,
      uniquePdfsViewed,
      recentViews,
      viewsByDay,
      user: {
        id: req.user._id,
        name: req.user.name,
        department: req.user.department,
        year: req.user.year
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch statistics', 
      message: error.message 
    });
  }
});

// Get user preferences (placeholder for future features)
router.get('/preferences', async (req, res) => {
  try {
    // For now, return basic user preferences
    // This can be extended with a separate preferences collection
    res.json({
      preferences: {
        theme: 'light', // default
        notifications: true, // default
        language: 'en', // default
        department: req.user.department,
        year: req.user.year
      }
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch preferences', 
      message: error.message 
    });
  }
});

// Update user preferences (placeholder for future features)
router.put('/preferences', async (req, res) => {
  try {
    // For now, just return success
    // This can be implemented with a preferences collection
    res.json({
      message: 'Preferences updated successfully',
      preferences: req.body
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ 
      error: 'Failed to update preferences', 
      message: error.message 
    });
  }
});

// Get user's device info
router.get('/devices', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('deviceId lastLogin');
    
    res.json({
      currentDevice: {
        deviceId: user.deviceId,
        lastLogin: user.lastLogin,
        isCurrentDevice: user.deviceId === req.deviceId
      },
      message: user.deviceId ? 'Device is registered' : 'No device registered'
    });
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch device info', 
      message: error.message 
    });
  }
});

// Logout from current device
router.post('/logout-device', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Clear device ID to allow login from other devices
    user.deviceId = null;
    await user.save();

    // Log logout activity
    await AccessLog.logAccess({
      userId: req.user._id,
      action: 'device_logout',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      deviceId: req.deviceId
    });

    res.json({
      message: 'Successfully logged out from this device'
    });
  } catch (error) {
    console.error('Device logout error:', error);
    res.status(500).json({ 
      error: 'Failed to logout device', 
      message: error.message 
    });
  }
});

module.exports = router;
