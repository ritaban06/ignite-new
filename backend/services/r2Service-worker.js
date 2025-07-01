const crypto = require('crypto');

class CloudflareR2Service {
  constructor() {
    this.workerUrl = process.env.CLOUDFLARE_WORKER_URL;
    this.workerSecret = process.env.CLOUDFLARE_WORKER_SECRET || process.env.JWT_SECRET;
    this.bucketName = process.env.R2_BUCKET_NAME;

    if (!this.workerUrl) {
      console.warn('⚠️ CLOUDFLARE_WORKER_URL not configured - R2 operations will fail');
    }
  }

  // Generate unique file key
  generateFileKey(originalName, department, year, subject) {
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(16).toString('hex');
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    return `pdfs/${department}/${year}/${subject}/${timestamp}_${randomId}_${sanitizedName}`;
  }

  // Create signed request for worker authentication
  createWorkerSignature(method, endpoint, body = null) {
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = crypto.randomBytes(16).toString('hex');
    
    const payload = {
      method,
      endpoint,
      timestamp,
      nonce,
      body: body ? crypto.createHash('sha256').update(body).digest('hex') : null
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', this.workerSecret)
      .update(payloadString)
      .digest('hex');

    return {
      payload: Buffer.from(payloadString).toString('base64'),
      signature,
      timestamp
    };
  }

  // Upload PDF through worker
  async uploadPdf(buffer, originalName, department, year, subject, mimeType = 'application/pdf') {
    try {
      if (!this.workerUrl) {
        throw new Error('Cloudflare Worker URL not configured');
      }

      const fileKey = this.generateFileKey(originalName, department, year, subject);
      const auth = this.createWorkerSignature('POST', '/upload', buffer);

      // Create form data for file upload
      const formData = new FormData();
      formData.append('file', new Blob([buffer], { type: mimeType }), originalName);
      formData.append('fileKey', fileKey);
      formData.append('department', department);
      formData.append('year', year.toString());
      formData.append('subject', subject);

      const response = await fetch(`${this.workerUrl}/upload`, {
        method: 'POST',
        headers: {
          'X-Worker-Auth': auth.payload,
          'X-Worker-Signature': auth.signature,
          'X-Worker-Timestamp': auth.timestamp.toString()
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Worker upload failed: ${response.status} ${error}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        fileKey: fileKey,
        message: 'File uploaded successfully',
        workerResponse: result
      };
    } catch (error) {
      console.error('Worker upload error:', error);
      throw new Error(`Failed to upload file via worker: ${error.message}`);
    }
  }

  // Generate worker URL for secure viewing
  getWorkerViewUrl(fileKey, userId, expiresIn = 300) {
    try {
      if (!this.workerUrl) {
        throw new Error('Cloudflare Worker URL not configured');
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const expiry = timestamp + expiresIn;
      
      // Create payload for worker verification
      const payload = {
        fileKey,
        userId: userId.toString(),
        expiry,
        timestamp
      };
      
      const payloadString = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', this.workerSecret)
        .update(payloadString)
        .digest('hex');

      // Encode parameters for worker
      const token = Buffer.from(payloadString).toString('base64');
      
      return {
        success: true,
        url: `${this.workerUrl}/view?token=${encodeURIComponent(token)}&sig=${signature}`,
        expiresIn: expiresIn,
        message: 'Worker view URL generated successfully'
      };
    } catch (error) {
      console.error('Worker view URL error:', error);
      throw new Error(`Failed to generate worker view URL: ${error.message}`);
    }
  }

  // Delete PDF through worker
  async deletePdf(fileKey) {
    try {
      if (!this.workerUrl) {
        throw new Error('Cloudflare Worker URL not configured');
      }

      const auth = this.createWorkerSignature('DELETE', '/delete');

      const response = await fetch(`${this.workerUrl}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Auth': auth.payload,
          'X-Worker-Signature': auth.signature,
          'X-Worker-Timestamp': auth.timestamp.toString()
        },
        body: JSON.stringify({ fileKey })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Worker delete failed: ${response.status} ${error}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        message: 'File deleted successfully',
        workerResponse: result
      };
    } catch (error) {
      console.error('Worker delete error:', error);
      throw new Error(`Failed to delete file via worker: ${error.message}`);
    }
  }

  // Get file metadata through worker
  async getFileMetadata(fileKey) {
    try {
      if (!this.workerUrl) {
        throw new Error('Cloudflare Worker URL not configured');
      }

      const auth = this.createWorkerSignature('GET', '/metadata');

      const response = await fetch(`${this.workerUrl}/metadata?fileKey=${encodeURIComponent(fileKey)}`, {
        method: 'GET',
        headers: {
          'X-Worker-Auth': auth.payload,
          'X-Worker-Signature': auth.signature,
          'X-Worker-Timestamp': auth.timestamp.toString()
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: false,
            error: 'File not found'
          };
        }
        const error = await response.text();
        throw new Error(`Worker metadata request failed: ${response.status} ${error}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        metadata: result
      };
    } catch (error) {
      console.error('Worker metadata error:', error);
      throw new Error(`Failed to get file metadata via worker: ${error.message}`);
    }
  }

  // Test worker connection
  async testConnection() {
    try {
      if (!this.workerUrl) {
        return {
          success: false,
          error: 'Cloudflare Worker URL not configured'
        };
      }

      const auth = this.createWorkerSignature('GET', '/health');

      const response = await fetch(`${this.workerUrl}/health`, {
        method: 'GET',
        headers: {
          'X-Worker-Auth': auth.payload,
          'X-Worker-Signature': auth.signature,
          'X-Worker-Timestamp': auth.timestamp.toString()
        }
      });

      if (!response.ok) {
        throw new Error(`Worker health check failed: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        message: 'Cloudflare Worker connection successful',
        workerResponse: result
      };
    } catch (error) {
      console.error('Worker connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cleanup through worker (for maintenance)
  async cleanupExpiredFiles(olderThanDays = 30) {
    try {
      if (!this.workerUrl) {
        throw new Error('Cloudflare Worker URL not configured');
      }

      const auth = this.createWorkerSignature('POST', '/cleanup');

      const response = await fetch(`${this.workerUrl}/cleanup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Worker-Auth': auth.payload,
          'X-Worker-Signature': auth.signature,
          'X-Worker-Timestamp': auth.timestamp.toString()
        },
        body: JSON.stringify({ olderThanDays })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Worker cleanup failed: ${response.status} ${error}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        deletedCount: result.deletedCount || 0,
        message: result.message || 'Cleanup completed',
        workerResponse: result
      };
    } catch (error) {
      console.error('Worker cleanup error:', error);
      throw new Error(`Failed to cleanup via worker: ${error.message}`);
    }
  }
}

module.exports = new CloudflareR2Service();
