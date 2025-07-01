const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// R2Bucket class - Represents a bucket in R2 storage
class R2Bucket {
  constructor(accountId, accessKeyId, secretAccessKey, bucketName) {
    this.accountId = accountId;
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.bucketName = bucketName;
    
    // Initialize S3Client for R2
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }

  // Upload a PDF file to R2
  async uploadPdf(fileBuffer, originalName, department, year, subject, mimeType) {
    try {
      if (!this.accountId || !this.accessKeyId || !this.secretAccessKey) {
        throw new Error('R2 credentials not configured');
      }

      // Generate unique file key
      const timestamp = Date.now();
      const sanitizedFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileKey = `pdfs/${department}/${year}/${subject}/${timestamp}_${sanitizedFileName}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
        Body: fileBuffer,
        ContentType: mimeType,
        Metadata: {
          department,
          year: year.toString(),
          subject,
          originalName,
          uploadTimestamp: timestamp.toString(),
        },
      });

      await this.s3Client.send(command);

      return {
        success: true,
        fileKey,
        url: `https://${this.bucketName}.${this.accountId}.r2.cloudflarestorage.com/${fileKey}`,
      };
    } catch (error) {
      console.error('R2 upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Generate a view URL for a PDF
  getViewUrl(fileKey, userId, expiresIn = 300) {
    try {
      if (!this.accountId || !this.accessKeyId || !this.secretAccessKey) {
        throw new Error('R2 credentials not configured');
      }

      // For public buckets, return direct URL
      const url = `https://${this.bucketName}.${this.accountId}.r2.cloudflarestorage.com/${fileKey}`;
      
      return {
        success: true,
        url,
        expiresIn,
      };
    } catch (error) {
      console.error('R2 getViewUrl error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Generate a signed URL (for private access)
  async getSignedViewUrl(fileKey, expiresIn = 300) {
    try {
      if (!this.accountId || !this.accessKeyId || !this.secretAccessKey) {
        throw new Error('R2 credentials not configured');
      }

      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      return {
        success: true,
        url,
        expiresIn,
      };
    } catch (error) {
      console.error('R2 getSignedViewUrl error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // List files in the bucket
  async listFiles() {
    try {
      if (!this.accountId || !this.accessKeyId || !this.secretAccessKey) {
        throw new Error('R2 credentials not configured');
      }

      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: 'pdfs/',
      });

      const response = await this.s3Client.send(command);

      return {
        success: true,
        files: response.Contents?.map(obj => obj.Key) || [],
      };
    } catch (error) {
      console.error('R2 listFiles error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Delete a PDF file from the bucket
  async deletePdf(fileKey) {
    try {
      if (!this.accountId || !this.accessKeyId || !this.secretAccessKey) {
        throw new Error('R2 credentials not configured');
      }

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: fileKey,
      });

      await this.s3Client.send(command);

      return {
        success: true,
        message: `File ${fileKey} deleted successfully`,
      };
    } catch (error) {
      console.error('R2 deletePdf error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
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

// Initialize R2 service instance
const r2Service = new R2Bucket(
  process.env.CLOUDFLARE_ACCOUNT_ID,
  process.env.R2_ACCESS_KEY_ID,
  process.env.R2_SECRET_ACCESS_KEY,
  process.env.R2_BUCKET_NAME
);

module.exports = r2Service;