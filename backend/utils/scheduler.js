const cron = require('node-cron');
const AccessLog = require('../models/AccessLog');
const r2Service = require('../services/r2Service');

// Cleanup old access logs (older than 90 days)
const cleanupOldLogs = cron.schedule('0 2 * * 0', async () => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const result = await AccessLog.deleteMany({
      createdAt: { $lt: ninetyDaysAgo }
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} old access logs`);
  } catch (error) {
    console.error('❌ Failed to cleanup old logs:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

// Cleanup orphaned files in R2 (files not referenced in database)
const cleanupOrphanedFiles = cron.schedule('0 3 * * 1', async () => {
  try {
    // This would require implementing a scan of R2 bucket
    // and comparing with database records
    console.log('🔍 Starting orphaned file cleanup...');
    
    // For now, just run the existing cleanup
    const result = await r2Service.cleanupExpiredFiles(90);
    console.log(`🧹 R2 cleanup result:`, result);
  } catch (error) {
    console.error('❌ Failed to cleanup orphaned files:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

// Generate daily statistics summary
const generateDailyStats = cron.schedule('0 1 * * *', async () => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const stats = await AccessLog.aggregate([
      {
        $match: {
          createdAt: {
            $gte: yesterday,
            $lte: endOfYesterday
          }
        }
      },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user' }
        }
      }
    ]);

    console.log(`📊 Daily stats for ${yesterday.toDateString()}:`, stats);
    
    // Here you could save stats to a separate collection or send to analytics service
  } catch (error) {
    console.error('❌ Failed to generate daily stats:', error);
  }
}, {
  scheduled: false // Don't start automatically
});

// Start all scheduled tasks
const startScheduledTasks = () => {
  console.log('⏰ Starting scheduled tasks...');
  
  cleanupOldLogs.start();
  cleanupOrphanedFiles.start();
  generateDailyStats.start();
  
  console.log('✅ All scheduled tasks started');
};

// Stop all scheduled tasks
const stopScheduledTasks = () => {
  console.log('⏹️ Stopping scheduled tasks...');
  
  cleanupOldLogs.stop();
  cleanupOrphanedFiles.stop();
  generateDailyStats.stop();
  
  console.log('✅ All scheduled tasks stopped');
};

module.exports = {
  startScheduledTasks,
  stopScheduledTasks,
  tasks: {
    cleanupOldLogs,
    cleanupOrphanedFiles,
    generateDailyStats
  }
};
