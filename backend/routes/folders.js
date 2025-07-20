const express = require('express');
const { body, validationResult } = require('express-validator');
const Folder = require('../models/Folder');
const GoogleDriveService = require('../services/googleDriveService');
const PDF = require('../models/PDF');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Utility route: Sync/caches all Google Drive folders into MongoDB
router.post('/gdrive/cache', authenticate, async (req, res) => {
  try {
    // Only allow admin to trigger cache
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const googleDriveService = new GoogleDriveService(
      JSON.parse(process.env.GDRIVE_CREDENTIALS),
      process.env.GDRIVE_BASE_FOLDER_ID
    );
    // Recursively list all folders from Google Drive, including owner info
    const listFoldersRecursive = async (folderId) => {
      const subfoldersRes = await googleDriveService.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, parents, owners)',
      });
      const subfolders = subfoldersRes.data.files || [];
      let allFolders = subfolders.map(f => ({
        id: f.id,
        name: f.name,
        parent: f.parents?.[0] || null,
        ownerName: (f.owners && f.owners.length > 0) ? f.owners[0].displayName : 'Unknown'
      }));
      for (const subfolder of subfolders) {
        const childFolders = await listFoldersRecursive(subfolder.id);
        allFolders = allFolders.concat(childFolders);
      }
      return allFolders;
    };
    const rootId = process.env.GDRIVE_BASE_FOLDER_ID;
    const folders = await listFoldersRecursive(rootId);
    const allDriveIds = new Set(folders.map(f => f.id));
    let added = 0, updated = 0, removed = 0;

    // Find all folders in DB that have a gdriveId
    const dbFolders = await Folder.find({ gdriveId: { $exists: true } });
    // Remove folders that no longer exist in Drive
    for (const folder of dbFolders) {
      if (!allDriveIds.has(folder.gdriveId)) {
        await Folder.deleteOne({ _id: folder._id });
        removed++;
      }
    }

    // Helper function to find parent metadata for inheritance
    const findParentMetadata = async (parentGdriveId) => {
      if (!parentGdriveId) return null;
      const parentFolder = await Folder.findOne({ gdriveId: parentGdriveId });
      return parentFolder;
    };

    // Add or update folders from Drive
    for (const f of folders) {
      const existingFolder = await Folder.findOne({ gdriveId: f.id });
      
      // Find parent metadata for inheritance
      const parentMetadata = await findParentMetadata(f.parent);
      
      // Default values for schema fields with inheritance from parent
      const defaultDepartments = parentMetadata?.departments?.length > 0 ? parentMetadata.departments : ['IT'];
      const defaultYears = parentMetadata?.years?.length > 0 ? parentMetadata.years : [1];
      const defaultSemesters = parentMetadata?.semesters?.length > 0 ? parentMetadata.semesters : [1];
      const defaultDescription = parentMetadata?.description || f.name.toLowerCase();
      const defaultTags = parentMetadata?.tags?.length > 0 ? [...parentMetadata.tags, f.name.toLowerCase()] : [f.name.toLowerCase()];
      const defaultAccessControlTags = parentMetadata?.accessControlTags || [];
      const defaultCreatedByName = f.ownerName || 'Ignite Admin';
      
      if (!existingFolder) {
        await Folder.create({
          name: f.name,
          gdriveId: f.id,
          parent: null, // Optionally resolve parent by gdriveId
          description: defaultDescription,
          departments: defaultDepartments,
          years: defaultYears,
          semesters: defaultSemesters,
          tags: defaultTags,
          accessControlTags: defaultAccessControlTags,
          createdByName: defaultCreatedByName
        });
        added++;
      } else {
        let needsUpdate = false;
        if (existingFolder.name !== f.name) { existingFolder.name = f.name; needsUpdate = true; }
        if (existingFolder.description !== defaultDescription) { existingFolder.description = defaultDescription; needsUpdate = true; }
        // Migrate old single fields to arrays if needed
        if (existingFolder.department && !existingFolder.departments) {
          existingFolder.departments = [existingFolder.department];
          existingFolder.department = undefined;
          needsUpdate = true;
        }
        if (existingFolder.year && !existingFolder.years) {
          existingFolder.years = [existingFolder.year];
          existingFolder.year = undefined;
          needsUpdate = true;
        }
        if (!existingFolder.semesters) {
          existingFolder.semesters = defaultSemesters;
          needsUpdate = true;
        }
        if (!existingFolder.accessControlTags) {
          existingFolder.accessControlTags = defaultAccessControlTags;
          needsUpdate = true;
        }
        if (JSON.stringify(existingFolder.tags) !== JSON.stringify(defaultTags)) { existingFolder.tags = defaultTags; needsUpdate = true; }
        if (existingFolder.createdByName !== defaultCreatedByName) { existingFolder.createdByName = defaultCreatedByName; needsUpdate = true; }
        if (needsUpdate) {
          await existingFolder.save();
          updated++;
        }
      }
    }
    res.json({
      message: `Sync complete: ${added} added, ${updated} updated, ${removed} removed. Total scanned: ${folders.length}.`,
      total: folders.length,
      added,
      updated,
      removed
    });
  } catch (error) {
    console.error('Sync folders from Google Drive error:', error);
    res.status(500).json({ error: 'Failed to sync folders', message: error.message });
  }
});


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

// Get folders with metadata (for client access control)
router.get('/with-metadata', authenticate, async (req, res) => {
  try {
    const folders = await Folder.find().populate('parent').lean();
    res.json(folders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch folders with metadata', details: err.message });
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
      // Transform Google Drive files to match PDF schema expected by client
      const transformedPdfs = driveResult.files.map(file => ({
        _id: file.id, // Use Google Drive file ID as _id
        googleDriveFileId: file.id,
        title: file.name || 'Untitled PDF',
        fileName: file.name,
        subject: 'N/A', // Default values for missing metadata
        description: '',
        department: 'N/A',
        year: 'N/A',
        semester: 'N/A',
        tags: [],
        fileSize: file.size ? parseInt(file.size) : 0,
        uploadedBy: null,
        uploadedByName: 'Unknown',
        uploadedAt: file.createdTime || new Date(),
        createdAt: file.createdTime || new Date(),
        updatedAt: file.createdTime || new Date(),
        viewCount: 0,
        lastAccessedAt: null,
        isActive: true,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink
      }));
      return res.json(transformedPdfs);
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


// Update folder metadata in MongoDB
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { name, description, years, departments, semesters, tags, accessControlTags } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (years !== undefined) update.years = years;
    if (departments !== undefined) update.departments = departments;
    if (semesters !== undefined) update.semesters = semesters;
    if (tags !== undefined) update.tags = tags;
    if (accessControlTags !== undefined) update.accessControlTags = accessControlTags;

    // Try to update by MongoDB _id first (if valid ObjectId)
    let folder = null;
    if (/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
      folder = await Folder.findByIdAndUpdate(
        req.params.id,
        { $set: update },
        { new: true }
      );
    }

    // If not found, try to find by Google Drive folder id (gdriveId), or create new
    if (!folder) {
      folder = await Folder.findOneAndUpdate(
        { gdriveId: req.params.id },
        { $set: { ...update, gdriveId: req.params.id, name: name || 'Google Drive Folder', createdBy: req.user._id } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    }
    if (!folder) return res.status(404).json({ error: 'Folder not found or could not be created' });
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update folder', details: err.message });
  }
});

module.exports = router;
