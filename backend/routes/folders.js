const express = require('express');
const { body, validationResult } = require('express-validator');
const GoogleDriveService = require('../services/googleDriveService');
const Folder = require('../models/Folder');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Utility route: Sync/caches all Google Drive folders into MongoDB
router.post('/gdrive/cache', authenticate, async (req, res) => {
  try {
    // Only allow admin to trigger cache
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const credentials = process.env.GDRIVE_CREDENTIALS
      .replace(/\\n/g, '\n')
      .replace(/\n/g, '\n');
    const googleDriveService = new GoogleDriveService(
      JSON.parse(credentials),
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
          // Update existing folder - PRESERVE EXISTING METADATA
          existingFolder.name = folderMetadata.name;
          
          // Only update these fields if they don't already exist or are empty
          existingFolder.description = existingFolder.description || folderMetadata.description;
          existingFolder.departments = existingFolder.departments?.length > 0 ? existingFolder.departments : folderMetadata.departments;
          existingFolder.years = existingFolder.years?.length > 0 ? existingFolder.years : folderMetadata.years;
          existingFolder.semesters = existingFolder.semesters?.length > 0 ? existingFolder.semesters : folderMetadata.semesters;
          existingFolder.tags = existingFolder.tags?.length > 0 ? existingFolder.tags : folderMetadata.tags;
          existingFolder.accessControlTags = existingFolder.accessControlTags?.length > 0 ? existingFolder.accessControlTags : folderMetadata.accessControlTags;
          
          existingFolder.createdByName = existingFolder.createdByName || folderMetadata.createdByName;
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
  // Set specific CORS headers for this endpoint to ensure client access
  const origin = req.get('Origin');
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    console.log('Folders CORS: Setting specific headers for /gdrive endpoint, origin:', origin);
  }
  
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
    console.error('Error fetching folders from MongoDB:', err);
    // Ensure CORS headers are set even for errors
    const origin = req.get('Origin');
    if (origin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
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
// Get all files in a folder (universal: PDFs, images, docs, etc.)
// Universal proxy route to securely stream any file type from Google Drive
const jwt = require('jsonwebtoken');
const { Readable } = require('stream');
function getContentType(ext) {
  if (["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext)) return `image/${ext === "jpg" ? "jpeg" : ext}`;
  if (["pdf"].includes(ext)) return "application/pdf";
  if (["doc", "docx"].includes(ext)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (["xls", "xlsx"].includes(ext)) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (["ppt", "pptx"].includes(ext)) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if (["txt"].includes(ext)) return "text/plain";
  return "application/octet-stream";
}

// POST: get a secure token for file viewing
router.post('/file/:fileId/view', authenticate, async (req, res) => {
  const fileId = req.params.fileId;
  try {
    // You can add access control checks here
    const token = jwt.sign({ fileId, userId: req.user._id }, process.env.JWT_SECRET, { expiresIn: '10m' });
    const viewUrl = `/api/folders/proxy/${fileId}?token=${token}`;
    res.json({ viewUrl });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate file view token', message: error.message });
  }
});

// GET: proxy/stream any file type securely
router.get('/proxy/:fileId', authenticate, async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Token required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.fileId !== req.params.fileId) return res.status(403).json({ error: 'Invalid token for this file' });
    // Stream file from Google Drive
    const googleDriveService = new GoogleDriveService(
      JSON.parse(credentials),
      null // folderId not needed for download
    );
    const driveResult = await googleDriveService.downloadPdf(req.params.fileId); // downloadPdf streams any file
    if (!driveResult.success) return res.status(500).json({ error: 'Failed to fetch file from Google Drive', message: driveResult.error });
    // Set headers for secure inline viewing
    const ext = req.query.ext || '';
    res.set({
      'Content-Type': getContentType(ext),
      'Content-Disposition': 'inline; filename="secured.' + ext + '"',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Download-Options': 'noopen',
      'Content-Security-Policy': "default-src 'none'; object-src 'none'; script-src 'none';"
    });
    driveResult.stream.pipe(res);
    driveResult.stream.on('error', (err) => {
      if (!res.headersSent) res.status(500).json({ error: 'Error streaming file' });
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token', message: error.message });
  }
});
router.get('/:folderId/files', authenticate, async (req, res) => {
  const folderId = req.params.folderId;
  try {
    // Google Drive logic
    const googleDriveService = new GoogleDriveService(
      JSON.parse(credentials),
      folderId // Use requested folderId as Google Drive folder
    );
    const driveResult = await googleDriveService.listFiles();
    if (driveResult.success && Array.isArray(driveResult.files)) {
      // Transform Google Drive files to a universal format
      const transformedFiles = driveResult.files.map(file => ({
        _id: file.id,
        googleDriveFileId: file.id,
        title: file.name || 'Untitled File',
        fileName: file.name,
        mimeType: file.mimeType,
        fileType: (file.name && file.name.includes('.')) ? file.name.split('.').pop().toLowerCase() : '',
        fileSize: file.size ? parseInt(file.size) : 0,
        uploadedBy: null,
        uploadedByName: 'Unknown',
        uploadedAt: file.createdTime || new Date(),
        createdAt: file.createdTime || new Date(),
        updatedAt: file.createdTime || new Date(),
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
        url: file.webContentLink || file.webViewLink || '',
      }));
      return res.json(transformedFiles);
    } else {
      // Fallback to MongoDB: get PDFs only (legacy)
      const pdfs = await PDF.find({ folder: folderId });
      return res.json(pdfs);
    }
  } catch (err) {
    // Fallback to MongoDB if Google Drive throws
    try {
      const pdfs = await PDF.find({ folder: folderId });
      return res.json(pdfs);
    } catch (mongoErr) {
      return res.status(500).json({ error: 'Failed to fetch files', details: err.message, mongoError: mongoErr.message });
    }
  }
});
router.get('/:folderId/pdfs', authenticate, async (req, res) => {
  const folderId = req.params.folderId;
  try {
    // Google Drive logic
    const googleDriveService = new GoogleDriveService(
      JSON.parse(credentials),
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

// Helper: check if user can access folder
function userCanAccessFolder(folder, user) {
  const deptMatch = !folder.departments || folder.departments.length === 0 || folder.departments.includes(user.department);
  const yearMatch = !folder.years || folder.years.length === 0 || folder.years.includes(user.year);
  const semMatch = !folder.semesters || folder.semesters.length === 0 || folder.semesters.includes(user.semester);
  return deptMatch && yearMatch && semMatch;
}

// Recursively search folders and files
async function searchFilesInFolders(folders, user, searchTerm, googleDriveService) {
  let results = [];
  for (const folder of folders) {
    if (!userCanAccessFolder(folder, user)) continue;
    // Recursively search subfolders
    if (folder.children && folder.children.length > 0) {
      results = results.concat(await searchFilesInFolders(folder.children, user, searchTerm, googleDriveService));
    }
    // Search files in this folder
    if (folder.gdriveId) {
      const files = await googleDriveService.listFilesRecursive(folder.gdriveId);
      const matchingFiles = files.filter(file =>
        file.name && file.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      results = results.concat(matchingFiles);
    }
  }
  return results;
}

// Route: /folders/search
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    const user = req.user;
    const rootFolders = await Folder.find({ parent: null }).lean();
    const googleDriveService = new GoogleDriveService(
      JSON.parse(credentials),
      null
    );
    const results = await searchFilesInFolders(rootFolders, user, q, googleDriveService);
    res.json({
      query: q,
      files: results,
      totalCount: results.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

module.exports = router;
