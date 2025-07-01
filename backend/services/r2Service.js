// R2Bucket class - Represents a bucket in R2 storage
class R2Bucket {
  constructor(accountId, accessKeyId, secretAccessKey, bucketName) {
    this.accountId = accountId;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.bucketName = bucketName;
  }

  // List files in the bucket
  async listFiles() {
    // ...existing code...
  }

  // Delete a PDF file from the bucket
  async deletePdf(fileKey) {
    // ...existing code...
  }

  // Cleanup expired files (for maintenance)
  async cleanupExpiredFiles(olderThanDays = 30) {
    try {
      if (!this.accountId || !this.accessKeyId || !this.secretAccessKey) {
        throw new Error('R2 credentials not configured');
      }

      // List all files in the bucket
      const listResult = await this.listFiles();
      if (!listResult.success) {
        throw new Error('Failed to list files for cleanup');
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      let deletedCount = 0;
      const errors = [];

      for (const fileKey of listResult.files) {
        try {
          // Extract timestamp from file key (assuming it's the first part)
          const timestampMatch = fileKey.match(/\/(\d+)_/);
          if (timestampMatch) {
            const fileTimestamp = parseInt(timestampMatch[1]);
            const fileDate = new Date(fileTimestamp);
            
            if (fileDate < cutoffDate) {
              const deleteResult = await this.deletePdf(fileKey);
              if (deleteResult.success) {
                deletedCount++;
                console.log(`🗑️ Deleted expired file: ${fileKey}`);
              }
            }
          }
        } catch (error) {
          errors.push(`Failed to process ${fileKey}: ${error.message}`);
        }
      }

      return {
        success: true,
        deletedCount,
        errors: errors.length > 0 ? errors : undefined,
        message: `Cleanup completed. Deleted ${deletedCount} files older than ${olderThanDays} days.`
      };
    } catch (error) {
      console.error('R2 cleanup error:', error);
      throw new Error(`Failed to cleanup files from R2: ${error.message}`);
    }
  }
}