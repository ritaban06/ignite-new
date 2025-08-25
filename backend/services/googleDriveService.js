const { google } = require('googleapis');
const fs = require('fs');

// GoogleDriveService class for handling PDF uploads/downloads to Google Drive
class GoogleDriveService {
  constructor(serviceAccountCredentials, folderId) {
    this.folderId = folderId;
    // Accept credentials object directly
    this.auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
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
        body: fileBuffer,
      };
      const response = await this.drive.files.create({
        resource: fileMetadata,
        media,
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
      // console.log('[GoogleDriveService] downloadPdf called with fileId:', fileId);
      const response = await this.drive.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'stream' });
      // console.log('[GoogleDriveService] downloadPdf success for fileId:', fileId);
      return { success: true, stream: response.data };
    } catch (error) {
      // Log full error details for debugging
      // console.error('[GoogleDriveService] downloadPdf ERROR for fileId:', fileId);
      console.error('Google Drive download error:', error);
      if (error.response) {
        console.error('Google Drive API response data:', error.response.data);
        console.error('Google Drive API response status:', error.response.status);
        console.error('Google Drive API response headers:', error.response.headers);
      }
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
  // List all files (PDFs, images, docs, etc.) in the folder
  async listFiles() {
    try {
      const response = await this.drive.files.list({
        q: `'${this.folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, createdTime, size)',
        orderBy: 'createdTime desc',
      });
      return { success: true, files: response.data.files };
    } catch (error) {
      console.error('Google Drive list error:', error);
      return { success: false, error: error.message };
    }
  }

  // Recursively list all PDF files in a folder and its subfolders
  async listFilesRecursive(folderId = this.folderId) {
    let allFiles = [];
    try {
      // List PDF files in the current folder
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
        fields: 'files(id, name, webViewLink, webContentLink, createdTime, size, parents)',
        orderBy: 'createdTime desc',
      });
      allFiles = response.data.files || [];

      // List subfolders in the current folder
      const subfoldersRes = await this.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
      });
      const subfolders = subfoldersRes.data.files || [];

      // Recursively list files in subfolders
      for (const subfolder of subfolders) {
        const subFiles = await this.listFilesRecursive(subfolder.id);
        allFiles = allFiles.concat(subFiles);
      }
    } catch (error) {
      console.error('Google Drive recursive list error:', error);
    }
    return allFiles;
  }

  // Get a view URL for a PDF
  getViewUrl(fileId) {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }

  // Get file metadata from Google Drive
  async getFileMetadata(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, parents',
      });
      return response.data;
    } catch (error) {
      console.error('Google Drive getFileMetadata error:', error);
      return null;
    }
  }

  // Get file metadata including owner and createdTime
  async getFileFullMetadata(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'id, name, parents, owners, createdTime',
      });
      return response.data;
    } catch (error) {
      console.error('Google Drive getFileFullMetadata error:', error);
      return null;
    }
  }
}

// Usage: new GoogleDriveService('path/to/service-account.json', 'your-folder-id')
module.exports = GoogleDriveService;
