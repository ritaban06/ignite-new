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
    
    // Build a folder hierarchy from Google Drive
    const buildFolderHierarchy = async (folderId, parentGdriveId = null) => {
      const subfoldersRes = await googleDriveService.drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name, parents, owners)',
      });
      
      const subfolders = subfoldersRes.data.files || [];
      const result = [];
      
      for (const folder of subfolders) {
        const ownerName = (folder.owners && folder.owners.length > 0) ? folder.owners[0].displayName : 'Unknown';
        
        // Create folder object with nested structure
        const folderObj = {
          name: folder.name,
          gdriveId: folder.id,
          parent: parentGdriveId,
          ownerName: ownerName,
          children: []
        };
        
        // Recursively get children
        folderObj.children = await buildFolderHierarchy(folder.id, folder.id);
        
        result.push(folderObj);
      }
      
      return result;
    };
    
    const rootId = process.env.GDRIVE_BASE_FOLDER_ID;
    const folderHierarchy = await buildFolderHierarchy(rootId, null);
    
    // Collect all Google Drive IDs for cleanup
    const collectAllGdriveIds = (folders) => {
      let ids = new Set();
      
      const collectIds = (folderArray) => {
        for (const folder of folderArray) {
          ids.add(folder.gdriveId);
          if (folder.children && folder.children.length > 0) {
            collectIds(folder.children);
          }
        }
      };
      
      collectIds(folders);
      return ids;
    };
    
    const allDriveIds = collectAllGdriveIds(folderHierarchy);
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

    // Process the folder hierarchy and save to MongoDB
    const processFolderHierarchy = async (folders, parentMetadata = null) => {
      for (const folder of folders) {
        // Check if this is a subject folder (top-level)
        const isSubjectFolder = folder.parent === null;
        
        // Find existing folder in DB
        const existingFolder = await Folder.findOne({ gdriveId: folder.gdriveId });
        
        // Prepare metadata with inheritance from parent if needed
        const folderMetadata = {
          name: folder.name,
          gdriveId: folder.gdriveId,
          description: folder.description || parentMetadata?.description || folder.name.toLowerCase(),
          departments: folder.departments || parentMetadata?.departments || ['IT'],
          years: folder.years || parentMetadata?.years || [0],
          semesters: folder.semesters || parentMetadata?.semesters || [0],
          tags: folder.tags || (parentMetadata?.tags ? [...parentMetadata.tags, folder.name.toLowerCase()] : [folder.name.toLowerCase()]),
          accessControlTags: folder.accessControlTags || parentMetadata?.accessControlTags || [],
          createdByName: folder.ownerName || 'Ignite Admin'
        };
        
        // Process children with inherited metadata
        const processedChildren = [];
        if (folder.children && folder.children.length > 0) {
          for (const child of folder.children) {
            // Apply parent metadata inheritance to child
            const childWithMetadata = {
              ...child,
              // Only set these fields if not explicitly defined on the child
              description: child.description || folderMetadata.description,
              departments: child.departments || folderMetadata.departments,
              years: child.years || folderMetadata.years,
              semesters: child.semesters || folderMetadata.semesters,
              tags: child.tags || (folderMetadata.tags ? [...folderMetadata.tags, child.name.toLowerCase()] : [child.name.toLowerCase()]),
              accessControlTags: child.accessControlTags || folderMetadata.accessControlTags
            };
            
            // Process nested children recursively
            if (child.children && child.children.length > 0) {
              childWithMetadata.children = await processFolderHierarchy(child.children, folderMetadata);
            }
            
            processedChildren.push(childWithMetadata);
          }
        }
        
        // Update or create the folder in MongoDB
        if (!existingFolder) {
          // Create new folder with children
          await Folder.create({
            ...folderMetadata,
            parent: null, // Top-level folders have null parent
            children: processedChildren
          });
          added++;
        } else {
          // Update existing folder
          existingFolder.name = folderMetadata.name;
          existingFolder.description = folderMetadata.description;
          existingFolder.departments = folderMetadata.departments;
          existingFolder.years = folderMetadata.years;
          existingFolder.semesters = folderMetadata.semesters;
          existingFolder.tags = folderMetadata.tags;
          existingFolder.accessControlTags = folderMetadata.accessControlTags;
          existingFolder.createdByName = folderMetadata.createdByName;
          existingFolder.children = processedChildren;
          
          await existingFolder.save();
          updated++;
        }
      }
      
      return folders;
    };
    
    // Process the entire hierarchy
    await processFolderHierarchy(folderHierarchy);
    
    // Count total folders processed
    const countFolders = (folders) => {
      let count = folders.length;
      for (const folder of folders) {
        if (folder.children && folder.children.length > 0) {
          count += countFolders(folder.children);
        }
      }
      return count;
    };
    
    const totalFolders = countFolders(folderHierarchy);
    res.json({
      message: `Sync complete: ${added} added, ${updated} updated, ${removed} removed. Total scanned: ${totalFolders}.`,
      total: totalFolders,
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

// List Google Drive folders and subfolders with hierarchy
router.get('/gdrive', async (req, res) => {
  try {
    // Instead of fetching from Google Drive directly, get from MongoDB with children
    const folders = await Folder.find({ parent: null }).lean();
    
    // Transform the data to match the expected format for the client
    const transformedFolders = folders.map(folder => {
      return {
        id: folder.gdriveId,
        gdriveId: folder.gdriveId, // Ensure gdriveId is included
        _id: folder._id,
        name: folder.name,
        parent: null,
        description: folder.description,
        departments: folder.departments || [],
        years: folder.years || [],
        semesters: folder.semesters || [],
        tags: folder.tags || [],
        accessControlTags: folder.accessControlTags || [],
        children: transformChildren(folder.children || [])
      };
    });
    
    // Helper function to transform nested children
    function transformChildren(children) {
      return children.map(child => {
        return {
          id: child.gdriveId,
          gdriveId: child.gdriveId, // Ensure gdriveId is included
          name: child.name,
          parent: child.parent,
          description: child.description || '',
          departments: child.departments || [],
          years: child.years || [],
          semesters: child.semesters || [],
          tags: child.tags || [],
          accessControlTags: child.accessControlTags || [],
          children: child.children && child.children.length > 0 ? transformChildren(child.children) : []
        };
      });
    }
    
    res.json(transformedFolders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch folders', details: err.message });
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

// Get subject folders only (for admin panel) - excludes subfolders
router.get('/subject-folders', authenticate, async (req, res) => {
  try {
    // Only allow admin to access this endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get all top-level folders from MongoDB
    const subjectFolders = await Folder.find({ parent: null }).lean();
    // Helper function to transform folder and its children recursively
    const transformFolderWithChildren = (folder) => {
      // Transform the current folder
      const transformed = {
        gdriveId: folder.gdriveId,
        id: folder.gdriveId, // For backward compatibility
        _id: folder._id,
        name: folder.name,
        parent: null,
        // Include metadata directly
        departments: folder.departments || [],
        years: folder.years || [],
        semesters: folder.semesters || [],
        description: folder.description || '',
        tags: folder.tags || [],
        accessControlTags: folder.accessControlTags || [],
        // Include children count
        childrenCount: folder.children ? folder.children.length : 0,
        // Include metadata as a separate property for backward compatibility
        metadata: {
          _id: folder._id,
          departments: folder.departments || [],
          years: folder.years || [],
          semesters: folder.semesters || [],
          description: folder.description || '',
          tags: folder.tags || [],
          accessControlTags: folder.accessControlTags || []
        }
      };
      
      // Transform children recursively if they exist
      if (folder.children && folder.children.length > 0) {
        // console.log(`Folder ${folder.name} has ${folder.children.length} children`);
        transformed.children = folder.children.map(child => {
          return transformFolderWithChildren({
            ...child,
            _id: child._id || folder._id, // Use parent _id if child doesn't have one
            gdriveId: child.gdriveId,
            parent: folder.gdriveId
          });
        });
      } else {
        transformed.children = [];
      }
      
      // console.log(`Transformed folder ${transformed.name} has ${transformed.children ? transformed.children.length : 0} children`);
      return transformed;
    };
    
    // Transform the data to match the expected format for the admin panel
    const transformedFolders = subjectFolders.map(folder => transformFolderWithChildren(folder));
    
    res.json(transformedFolders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subject folders', details: err.message });
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


// Update folder metadata in MongoDB with inheritance for subfolders
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
      folder = await Folder.findById(req.params.id);
    } else {
      // If not found by _id, try to find by Google Drive folder id (gdriveId)
      folder = await Folder.findOne({ gdriveId: req.params.id });
    }

    if (!folder) {
      // Create new folder if not found
      folder = new Folder({
        gdriveId: req.params.id,
        name: name || 'Google Drive Folder',
        createdBy: req.user._id,
        ...update
      });
      await folder.save();
    } else {
      // Update existing folder
      Object.assign(folder, update);
      
      // If this is a subject folder (direct child of root), apply inheritance to children
      if (folder.children && folder.children.length > 0 && req.user.role === 'admin') {
        // Apply inheritance to all children recursively
        const applyInheritanceToChildren = (children) => {
          return children.map(child => {
            // Only inherit fields if they're not explicitly set on the child
            const updatedChild = {
              ...child,
              // Only update these fields if they're not already set on the child
              description: child.description || description,
              departments: child.departments?.length > 0 ? child.departments : departments,
              years: child.years?.length > 0 ? child.years : years,
              semesters: child.semesters?.length > 0 ? child.semesters : semesters,
              tags: child.tags?.length > 0 ? child.tags : (tags ? [...tags, child.name.toLowerCase()] : [child.name.toLowerCase()]),
              accessControlTags: child.accessControlTags?.length > 0 ? child.accessControlTags : accessControlTags
            };
            
            // Recursively apply to nested children
            if (child.children && child.children.length > 0) {
              updatedChild.children = applyInheritanceToChildren(child.children);
            }
            
            return updatedChild;
          });
        };
        
        // Apply inheritance to all children
        folder.children = applyInheritanceToChildren(folder.children);
      }
      
      await folder.save();
    }
    
    if (!folder) return res.status(404).json({ error: 'Folder not found or could not be created' });
    
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update folder', details: err.message });
  }
});

module.exports = router;
