const express = require('express');
const { body, validationResult } = require('express-validator');
const Folder = require('../models/Folder');
const GoogleDriveService = require('../services/googleDriveService');
const PDF = require('../models/PDF');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Expose Google Drive base folder ID
router.get('/gdrive-base-id', (req, res) => {
  res.json({ baseFolderId: process.env.GDRIVE_BASE_FOLDER_ID });
});

// List Google Drive folders and subfolders
router.get('/gdrive', async (req, res) => {
  try {
    const googleDriveService = new GoogleDriveService(
      JSON.parse(process.env.GDRIVE_CREDENTIALS),
      process.env.GDRIVE_BASE_FOLDER_ID
    );
    // List subfolders recursively
    const listFoldersRecursive = async (folderId) => {
      const subfoldersRes = await googleDriveService.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, parents)',
      });
      const subfolders = subfoldersRes.data.files || [];
      let allFolders = subfolders.map(f => ({ id: f.id, name: f.name, parent: f.parents?.[0] || null }));
      for (const subfolder of subfolders) {
        const childFolders = await listFoldersRecursive(subfolder.id);
        allFolders = allFolders.concat(childFolders);
      }
      return allFolders;
    };
    const rootId = process.env.GDRIVE_BASE_FOLDER_ID;
    const folders = await listFoldersRecursive(rootId);
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Google Drive folders', details: err.message });
  }
});

// Create a folder
router.post('/', [
  authenticate,
  body('name').isString().trim().notEmpty(),
  body('parent').optional().isMongoId(),
  body('description').optional().isString().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }
  try {
    const { name, parent, description } = req.body;
    const folder = new Folder({
      name,
      parent: parent || null,
      description,
      createdBy: req.user._id
    });
    await folder.save();
    res.status(201).json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create folder', details: err.message });
  }
});

// Get all folders (optionally nested)
router.get('/', authenticate, async (req, res) => {
  try {
    const folders = await Folder.find().populate('parent').lean();
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch folders', details: err.message });
  }
});

// Get PDFs in a folder
// Get PDFs in a folder (Google Drive first, MongoDB fallback)
router.get('/:folderId/pdfs', authenticate, async (req, res) => {
  const folderId = req.params.folderId;
  try {
    // Google Drive logic
    const googleDriveService = new GoogleDriveService(
      JSON.parse(process.env.GDRIVE_CREDENTIALS),
      folderId // Use requested folderId as Google Drive folder
    );
    const driveResult = await googleDriveService.listFiles();
    if (driveResult.success && Array.isArray(driveResult.files)) {
      // Optionally, enrich with MongoDB cache if needed
      // For each file, try to find matching MongoDB PDF by fileName or Google Drive fileId
      // This is optional and can be extended as needed
      return res.json(driveResult.files);
    } else {
      // Fallback to MongoDB if Google Drive fails
      const pdfs = await PDF.find({ folder: folderId });
      return res.json(pdfs);
    }
  } catch (err) {
    // Fallback to MongoDB if Google Drive throws
    try {
      const pdfs = await PDF.find({ folder: folderId });
      return res.json(pdfs);
    } catch (mongoErr) {
      return res.status(500).json({ error: 'Failed to fetch PDFs', details: err.message, mongoError: mongoErr.message });
    }
  }
});

// TODO: Add update, delete, access control endpoints as needed

module.exports = router;
