const { google } = require('googleapis');
const fs = require('fs');

// GoogleDriveService class for handling PDF uploads/downloads to Google Drive
class GoogleDriveService {
  constructor(serviceAccountKeyPath, folderId) {
    this.folderId = folderId;
    this.auth = new google.auth.GoogleAuth({
      keyFile: serviceAccountKeyPath,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  // Upload a PDF file to Google Drive
  async uploadPdf(fileBuffer, originalName, department, year, subject, mimeType) {
    try {
      const fileMetadata = {
        name: originalName,
        parents: [this.folderId],
        description: `Department: ${department}, Year: ${year}, Subject: ${subject}`,
      };
      const media = {
        mimeType,
        body: Buffer.isBuffer(fileBuffer) ? fs.createReadStream(fileBuffer) : fileBuffer,
      };
      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: { mimeType, body: fileBuffer },
        fields: 'id, webViewLink, webContentLink',
      });
      return {
        success: true,
        fileId: response.data.id,
        webViewLink: response.data.webViewLink,
        webContentLink: response.data.webContentLink,
      };
    } catch (error) {
      console.error('Google Drive upload error:', error);
      return { success: false, error: error.message };
    }
  }

  // Download a PDF file from Google Drive
  async downloadPdf(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'stream' });
      return { success: true, stream: response.data };
    } catch (error) {
      console.error('Google Drive download error:', error);
      return { success: false, error: error.message };
    }
  }

  // Delete a PDF file from Google Drive
  async deletePdf(fileId) {
    try {
      await this.drive.files.delete({ fileId });
      return { success: true };
    } catch (error) {
      console.error('Google Drive delete error:', error);
      return { success: false, error: error.message };
    }
  }

  // List PDF files in the folder
  async listFiles() {
    try {
      const response = await this.drive.files.list({
        q: `'${this.folderId}' in parents and mimeType='application/pdf' and trashed=false`,
        fields: 'files(id, name, webViewLink, webContentLink)',
      });
      return { success: true, files: response.data.files };
    } catch (error) {
      console.error('Google Drive list error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Usage: new GoogleDriveService('path/to/service-account.json', 'your-folder-id')
module.exports = GoogleDriveService;
