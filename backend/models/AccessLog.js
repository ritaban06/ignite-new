const mongoose = require('mongoose');

const accessLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  pdf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PDF',
    required: [true, 'PDF is required']
  },
  action: {
    type: String,
    required: [true, 'Action is required'],
    enum: ['view', 'download_attempt', 'share_attempt', 'print_attempt']
  },
  ipAddress: {
    type: String,
    required: [true, 'IP address is required']
  },
  userAgent: {
    type: String,
    required: [true, 'User agent is required']
  },
  deviceId: {
    type: String,
    default: null
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for analytics queries
accessLogSchema.index({ user: 1, createdAt: -1 });
accessLogSchema.index({ pdf: 1, createdAt: -1 });
accessLogSchema.index({ action: 1, createdAt: -1 });
accessLogSchema.index({ ipAddress: 1 });
accessLogSchema.index({ createdAt: -1 });

// Compound indexes for common queries
accessLogSchema.index({ user: 1, action: 1, createdAt: -1 });
accessLogSchema.index({ pdf: 1, action: 1, success: 1 });

// Static method to log access
accessLogSchema.statics.logAccess = function(data) {
  return this.create({
    user: data.userId,
    pdf: data.pdfId,
    action: data.action,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    deviceId: data.deviceId,
    duration: data.duration || 0,
    success: data.success !== false,
    errorMessage: data.errorMessage,
    metadata: data.metadata || {}
  });
};

// Static method to get user activity summary
accessLogSchema.statics.getUserActivitySummary = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        lastAccess: { $max: '$createdAt' }
      }
    }
  ]);
};

// Static method to get PDF access statistics
accessLogSchema.statics.getPdfStats = function(pdfId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        pdf: new mongoose.Types.ObjectId(pdfId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt'
            }
          }
        },
        count: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' }
      }
    },
    {
      $group: {
        _id: '$_id.action',
        dailyStats: {
          $push: {
            date: '$_id.date',
            count: '$count',
            uniqueUsers: { $size: '$uniqueUsers' }
          }
        },
        totalCount: { $sum: '$count' }
      }
    }
  ]);
};

// Static method to detect suspicious activity
accessLogSchema.statics.detectSuspiciousActivity = function(userId, timeWindow = 5) {
  const startTime = new Date();
  startTime.setMinutes(startTime.getMinutes() - timeWindow);
  
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startTime },
        action: { $in: ['download_attempt', 'share_attempt', 'print_attempt'] }
      }
    },
    {
      $group: {
        _id: '$action',
        count: { $sum: 1 },
        attempts: { $push: '$createdAt' }
      }
    },
    {
      $match: {
        count: { $gte: 3 } // Flag if 3+ suspicious attempts in time window
      }
    }
  ]);
};

module.exports = mongoose.model('AccessLog', accessLogSchema);
