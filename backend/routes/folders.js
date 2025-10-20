const express = require('express');
const { body, validationResult } = require('express-validator');
const GoogleDriveService = require('../services/googleDriveService');
const Folder = require('../models/Folder');
const AccessLog = require('../models/AccessLog');
const { authenticate } = require('../middleware/auth');
const { emitFolderUpdate } = require('../utils/socketEvents');

// Load Google Drive credentials from environment variable
let credentials;
try {
  credentials = process.env.GDRIVE_CREDENTIALS ? JSON.parse(process.env.GDRIVE_CREDENTIALS) : null;
  if (!credentials) {
    console.error('GDRIVE_CREDENTIALS environment variable is not set');
  }
} catch (error) {
  console.error('Error parsing GDRIVE_CREDENTIALS:', error);
  credentials = null;
}

const router = express.Router();
const PDF = require('../models/PDF');

// Utility route: Sync/caches all Google Drive folders into MongoDB
// This route preserves existing metadata on folders and subfolders that already have custom metadata set.
// Only folders without meaningful metadata will be updated with default or inherited values.
router.post('/gdrive/cache', authenticate, async (req, res) => {
  try {
    // Only allow admin to trigger cache
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);
    const googleDriveService = new GoogleDriveService(
      credentials,
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
          parent: parentGdriveId, // This is the parent's Google Drive ID
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
        // Log the deletion for debugging
        console.log(`Removing folder ${folder.name} (${folder.gdriveId}) - no longer exists in Google Drive`);
        await Folder.deleteOne({ _id: folder._id });
        removed++;
      }
    }
    
    // Track all folders we've seen to prevent duplicates
    const processedGdriveIds = new Set();
    const folderParentMap = new Map(); // Maps gdriveId to parent gdriveId
    
    // First build a map of all folder relationships from Google Drive
    const buildFolderParentMap = (folders, parentId = null) => {
      for (const folder of folders) {
        folderParentMap.set(folder.gdriveId, parentId);
        if (folder.children && folder.children.length > 0) {
          buildFolderParentMap(folder.children, folder.gdriveId);
        }
      }
    };
    
    // Build the parent map
    buildFolderParentMap(folderHierarchy);

    // Clean up duplicate entries where a folder exists both as top-level and as a child
    // This fixes any historical data issues
    const allFolders = await Folder.find({}).lean();
    const topLevelFolders = allFolders.filter(f => f.parent === null);
    
    // Create a map of all child folders in the hierarchy
    const childFolderMap = new Map();
    
    const collectChildFolders = (folders) => {
      if (!folders) return;
      for (const folder of folders) {
        if (folder.gdriveId) {
          childFolderMap.set(folder.gdriveId, true);
        }
        if (folder.children && folder.children.length > 0) {
          collectChildFolders(folder.children);
        }
      }
    };
    
    // Collect all children from the hierarchy
    for (const topFolder of topLevelFolders) {
      if (topFolder.children && topFolder.children.length > 0) {
        collectChildFolders(topFolder.children);
      }
    }
    
    // Find top-level folders that should actually be children
    const folderCleanupPromises = [];
    for (const topFolder of topLevelFolders) {
      // If this folder appears in folderParentMap with a non-null parent
      // and also exists as a top-level folder, it's a duplicate
      const parentInDrive = folderParentMap.get(topFolder.gdriveId);
      if (parentInDrive !== null && parentInDrive !== undefined && childFolderMap.has(topFolder.gdriveId)) {
        console.log(`Found duplicate top-level folder ${topFolder.name} (${topFolder.gdriveId}) - should only be a child`);
        folderCleanupPromises.push(Folder.deleteOne({ _id: topFolder._id }));
        removed++;
      }
    }
    
    // Wait for all cleanup operations to complete
    if (folderCleanupPromises.length > 0) {
      await Promise.all(folderCleanupPromises);
    }
    
    // Helper function to check if a folder has existing meaningful metadata set
    const hasExistingMetadata = (folder) => {
      if (!folder) return false;
      
      // Check if folder has any meaningful metadata beyond defaults
      const hasCustomDescription = folder.description && folder.description !== folder.name?.toLowerCase();
      const hasCustomDepartments = folder.departments && folder.departments.length > 0 && !(folder.departments.length === 1 && folder.departments[0] === 'IT');
      const hasCustomYears = folder.years && folder.years.length > 0 && !(folder.years.length === 1 && folder.years[0] === 0);
      const hasCustomSemesters = folder.semesters && folder.semesters.length > 0 && !(folder.semesters.length === 1 && folder.semesters[0] === 0);
      const hasCustomTags = folder.tags && folder.tags.length > 0 && !(folder.tags.length === 1 && folder.tags[0] === folder.name?.toLowerCase());
      const hasAccessControlTags = folder.accessControlTags && folder.accessControlTags.length > 0;
      
      return hasCustomDescription || hasCustomDepartments || hasCustomYears || 
             hasCustomSemesters || hasCustomTags || hasAccessControlTags;
    };

    // Helper function to update nested children metadata recursively
    const updateChildrenMetadata = (children, existingChildren, parentMetadata) => {
      const updatedChildren = [];
      
      for (const child of children) {
        // Find existing child by gdriveId
        const existingChild = existingChildren?.find(ec => ec.gdriveId === child.gdriveId);
        
        let childMetadata;
        if (existingChild && hasExistingMetadata(existingChild)) {
          // Preserve existing metadata, only update structural fields
          childMetadata = {
            ...existingChild,
            name: child.name, // Always update name from Google Drive
            gdriveId: child.gdriveId,
            children: [] // Will be filled below
          };
          console.log(`Preserving existing metadata for subfolder: ${child.name} (${child.gdriveId})`);
        } else {
          // Use inherited or default metadata
          childMetadata = {
            name: child.name,
            gdriveId: child.gdriveId,
            description: child.description || parentMetadata?.description || child.name.toLowerCase(),
            departments: child.departments || parentMetadata?.departments || ['IT'],
            years: child.years || parentMetadata?.years || [0],
            semesters: child.semesters || parentMetadata?.semesters || [0],
            tags: child.tags || (parentMetadata?.tags ? [...parentMetadata.tags, child.name.toLowerCase()] : [child.name.toLowerCase()]),
            accessControlTags: child.accessControlTags || parentMetadata?.accessControlTags || [],
          };
          console.log(`Using inherited/default metadata for subfolder: ${child.name} (${child.gdriveId})`);
        }
        
        // Recursively handle nested children
        if (child.children && child.children.length > 0) {
          childMetadata.children = updateChildrenMetadata(
            child.children, 
            existingChild?.children || [], 
            childMetadata
          );
        } else {
          childMetadata.children = [];
        }
        
        updatedChildren.push(childMetadata);
      }
      
      return updatedChildren;
    };

    // Process the folder hierarchy and save to MongoDB
    const processFolderHierarchy = async (folders, parentMetadata = null) => {
      const processedFolders = [];

      for (const folder of folders) {
        // Skip duplicates
        if (processedGdriveIds.has(folder.gdriveId)) {
          console.log(`Skipping duplicate folder ${folder.name} (${folder.gdriveId}) - already processed`);
          continue;
        }

        const parentGdriveId = folderParentMap.get(folder.gdriveId);
        const isTopLevelFolder = parentGdriveId === null;

        processedGdriveIds.add(folder.gdriveId);

        if (isTopLevelFolder) {
          // Check if folder already exists in database
          let existingFolder = await Folder.findOne({ gdriveId: folder.gdriveId });

          if (!existingFolder) {
            // Create new folder with default metadata
            const folderMetadata = {
              name: folder.name,
              gdriveId: folder.gdriveId,
              description: folder.description || folder.name.toLowerCase(),
              departments: folder.departments || ['IT'],
              years: folder.years || [0],
              semesters: folder.semesters || [0],
              tags: folder.tags || [folder.name.toLowerCase()],
              accessControlTags: folder.accessControlTags || [],
              createdByName: folder.ownerName || 'Ignite Admin',
              parent: parentGdriveId,
              children: []
            };

            // Recursively process children with new metadata
            if (folder.children && folder.children.length > 0) {
              folderMetadata.children = updateChildrenMetadata(folder.children, [], folderMetadata);
            }

            const newFolder = await Folder.create(folderMetadata);
            added++;
            processedFolders.push(newFolder);
            console.log(`Created new folder: ${folder.name} (${folder.gdriveId}) with default metadata`);
          } else {
            // Update existing folder
            let metadataToUse;
            
            if (hasExistingMetadata(existingFolder)) {
              // Preserve existing metadata, only update structural fields
              metadataToUse = {
                description: existingFolder.description,
                departments: existingFolder.departments,
                years: existingFolder.years,
                semesters: existingFolder.semesters,
                tags: existingFolder.tags,
                accessControlTags: existingFolder.accessControlTags,
              };
              console.log(`Preserving existing metadata for folder: ${folder.name} (${folder.gdriveId})`);
            } else {
              // Use default metadata since no meaningful metadata exists
              metadataToUse = {
                description: folder.description || folder.name.toLowerCase(),
                departments: folder.departments || ['IT'],
                years: folder.years || [0],
                semesters: folder.semesters || [0],
                tags: folder.tags || [folder.name.toLowerCase()],
                accessControlTags: folder.accessControlTags || [],
              };
              console.log(`Updating folder with default metadata: ${folder.name} (${folder.gdriveId})`);
            }

            // Always update name and structural fields
            existingFolder.name = folder.name;
            existingFolder.description = metadataToUse.description;
            existingFolder.departments = metadataToUse.departments;
            existingFolder.years = metadataToUse.years;
            existingFolder.semesters = metadataToUse.semesters;
            existingFolder.tags = metadataToUse.tags;
            existingFolder.accessControlTags = metadataToUse.accessControlTags;
            existingFolder.createdByName = existingFolder.createdByName || folder.ownerName || 'Ignite Admin';

            // Update children hierarchy
            if (folder.children && folder.children.length > 0) {
              existingFolder.children = updateChildrenMetadata(
                folder.children, 
                existingFolder.children || [], 
                metadataToUse
              );
            } else {
              existingFolder.children = [];
            }

            await existingFolder.save();
            updated++;
            processedFolders.push(existingFolder);
          }
        } else {
          // For subfolders (not saved directly to DB), create metadata structure
          const folderMetadata = {
            name: folder.name,
            gdriveId: folder.gdriveId,
            description: folder.description || parentMetadata?.description || folder.name.toLowerCase(),
            departments: folder.departments || parentMetadata?.departments || ['IT'],
            years: folder.years || parentMetadata?.years || [0],
            semesters: folder.semesters || parentMetadata?.semesters || [0],
            tags: folder.tags || (parentMetadata?.tags ? [...parentMetadata.tags, folder.name.toLowerCase()] : [folder.name.toLowerCase()]),
            accessControlTags: folder.accessControlTags || parentMetadata?.accessControlTags || [],
            children: []
          };

          // Recursively process children
          if (folder.children && folder.children.length > 0) {
            folderMetadata.children = updateChildrenMetadata(folder.children, [], folderMetadata);
          }

          processedFolders.push(folderMetadata);
        }
      }

      return processedFolders;
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
    // Log folder creation
    await AccessLog.logAccess({
      userId: req.user._id,
      action: 'folder_create',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      folderId: folder._id,
      metadata: { name: folder.name, parent: folder.parent, description: folder.description }
    });
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
    const transformFolderWithChildren = (folder, parentGdriveId = null) => {
      // Transform the current folder
      const transformed = {
        gdriveId: folder.gdriveId,
        id: folder.gdriveId, // For backward compatibility
        _id: folder._id,
        name: folder.name,
        parent: parentGdriveId,
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
      if (folder.children && Array.isArray(folder.children) && folder.children.length > 0) {
        console.log(`Folder ${folder.name} has ${folder.children.length} children:`, folder.children.map(c => c.name));
        transformed.children = folder.children.map(child => {
          // Ensure child has required properties
          const childFolder = {
            gdriveId: child.gdriveId,
            _id: child._id || folder._id, // Use parent _id if child doesn't have one
            name: child.name,
            departments: child.departments || folder.departments || [],
            years: child.years || folder.years || [],
            semesters: child.semesters || folder.semesters || [],
            description: child.description || folder.description || '',
            tags: child.tags || folder.tags || [],
            accessControlTags: child.accessControlTags || folder.accessControlTags || [],
            children: child.children || []
          };
          
          // Recursively transform the child with the current folder as parent
          return transformFolderWithChildren(childFolder, folder.gdriveId);
        });
      } else {
        transformed.children = [];
      }
      
      console.log(`Transformed folder ${transformed.name} has ${transformed.children ? transformed.children.length : 0} children`);
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
    const topLevelFolders = await Folder.find({ parent: null }).lean();
    
    // Flatten the hierarchy to include all folders (top-level and subfolders)
    const flattenFoldersWithMetadata = (folders, parentMetadata = null) => {
      const result = [];
      
      for (const folder of folders) {
        // Add the current folder with its metadata
        const folderWithMetadata = {
          _id: folder._id,
          gdriveId: folder.gdriveId,
          name: folder.name,
          description: folder.description,
          departments: folder.departments || [],
          years: folder.years || [],
          semesters: folder.semesters || [],
          tags: folder.tags || [],
          accessControlTags: folder.accessControlTags || [],
          parent: folder.parent
        };
        
        result.push(folderWithMetadata);
        
        // Recursively process children if they exist
        if (folder.children && folder.children.length > 0) {
          const childrenWithMetadata = flattenFoldersWithMetadata(folder.children, folderWithMetadata);
          result.push(...childrenWithMetadata);
        }
      }
      
      return result;
    };
    
    const allFoldersFlat = flattenFoldersWithMetadata(topLevelFolders);
    res.json(allFoldersFlat);
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
function getContentType(ext, mimeType = null) {
  // If we have a mimeType from Google Drive, use it for PDF files
  if (mimeType === "application/pdf") return "application/pdf";
  
  // Handle other known mimeTypes
  if (mimeType && mimeType.startsWith("image/")) return mimeType;
  if (mimeType && mimeType.startsWith("text/")) return mimeType;
  
  // Extension-based detection (fallback or when no mimeType available)
  if (ext && ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext.toLowerCase())) {
    return `image/${ext.toLowerCase() === "jpg" ? "jpeg" : ext.toLowerCase()}`;
  }
  if (ext && ["pdf"].includes(ext.toLowerCase())) return "application/pdf";
  if (ext && ["doc", "docx"].includes(ext.toLowerCase())) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (ext && ["xls", "xlsx"].includes(ext.toLowerCase())) {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if (ext && ["ppt", "pptx"].includes(ext.toLowerCase())) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (ext && ["txt"].includes(ext.toLowerCase())) return "text/plain";
  
  // If we have a mimeType but don't know how to handle it, use it anyway
  if (mimeType) return mimeType;
  
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
  let credentials;
  try {
    credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.fileId !== req.params.fileId) return res.status(403).json({ error: 'Invalid token for this file' });
    
    // Stream file from Google Drive
    const googleDriveService = new GoogleDriveService(
      credentials,
      null // folderId not needed for download
    );
    
    // First get file metadata to get the mimeType
    let fileMimeType = null;
    try {
      const fileMetadata = await googleDriveService.drive.files.get({
        fileId: req.params.fileId,
        fields: 'mimeType, name'
      });
      fileMimeType = fileMetadata.data.mimeType;
      console.log(`[PROXY] File ${req.params.fileId} has mimeType: ${fileMimeType}`);
    } catch (error) {
      console.warn(`[PROXY] Could not get file metadata for ${req.params.fileId}:`, error.message);
    }
    
    const driveResult = await googleDriveService.downloadPdf(req.params.fileId); // downloadPdf streams any file
    if (!driveResult.success) return res.status(500).json({ error: 'Failed to fetch file from Google Drive', message: driveResult.error });
    
    // Set headers for secure inline viewing
    const ext = req.query.ext || '';
    const contentType = getContentType(ext, fileMimeType);
    
    console.log(`[PROXY] File ${req.params.fileId}: ext="${ext}", mimeType="${fileMimeType}", contentType="${contentType}"`);
    
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `inline; filename="${req.params.fileId}.${ext}"`,
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
  console.log(`[FILES] Request for folderId: ${folderId}`);
  try {
    // Google Drive logic
    const credentials = JSON.parse(process.env.GDRIVE_CREDENTIALS);
    const googleDriveService = new GoogleDriveService(
      credentials,
      folderId // Use requested folderId as Google Drive folder
    );
    const driveResult = await googleDriveService.listFiles();
    console.log('[FILES] Google Drive result:', JSON.stringify(driveResult, null, 2));
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
      console.log(`[FILES] Returning ${transformedFiles.length} files.`);
      return res.json(transformedFiles);
    } else {
      console.warn('[FILES] Google Drive failed or returned no files. Falling back to MongoDB.');
      const pdfs = await PDF.find({ folder: folderId });
      console.log(`[FILES] MongoDB fallback returned ${pdfs.length} PDFs.`);
      return res.json(pdfs);
    }
  } catch (err) {
    console.error('[FILES] Error in Google Drive logic:', err);
    // Fallback to MongoDB if Google Drive throws
    try {
      const pdfs = await PDF.find({ folder: folderId });
      console.log(`[FILES] Error fallback: MongoDB returned ${pdfs.length} PDFs.`);
      return res.json(pdfs);
    } catch (mongoErr) {
      console.error('[FILES] MongoDB fallback error:', mongoErr);
      return res.status(500).json({ error: 'Failed to fetch files', details: err.message, mongoError: mongoErr.message });
    }
  }
});
router.get('/:folderId/pdfs', authenticate, async (req, res) => {
  const folderId = req.params.folderId;
  try {
    // Google Drive logic
    const googleDriveService = new GoogleDriveService(
      credentials,
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


// Helper function to find and update a folder in the nested structure
const findAndUpdateFolderInHierarchy = (folders, targetGdriveId, updateData, parentMetadata = null) => {
  for (let i = 0; i < folders.length; i++) {
    const folder = folders[i];
    
    if (folder.gdriveId === targetGdriveId) {
      // Found the target folder - apply inheritance from parent if needed
      const inheritedUpdate = { ...updateData };
      
      // Apply inheritance logic for subfolders only for fields that weren't explicitly provided in the update
       if (parentMetadata) {
         // Check what fields were actually provided in the original update request
         const originalUpdate = updateData;
         
         // Only inherit if the field was not provided in the update request
         if (originalUpdate.description === undefined && (!folder.description || folder.description.trim() === '')) {
           inheritedUpdate.description = parentMetadata.description;
         }
         if (originalUpdate.departments === undefined && (!folder.departments || folder.departments.length === 0)) {
           inheritedUpdate.departments = parentMetadata.departments;
         }
         if (originalUpdate.years === undefined && (!folder.years || folder.years.length === 0 || (folder.years.length === 1 && folder.years[0] === 0))) {
           inheritedUpdate.years = parentMetadata.years;
         }
         if (originalUpdate.semesters === undefined && (!folder.semesters || folder.semesters.length === 0 || (folder.semesters.length === 1 && folder.semesters[0] === 0))) {
           inheritedUpdate.semesters = parentMetadata.semesters;
         }
         if (originalUpdate.tags === undefined && (!folder.tags || folder.tags.length === 0)) {
           inheritedUpdate.tags = parentMetadata.tags;
         }
         if (originalUpdate.accessControlTags === undefined && (!folder.accessControlTags || folder.accessControlTags.length === 0)) {
           inheritedUpdate.accessControlTags = parentMetadata.accessControlTags;
         }
       }
      
      // Update the folder with inherited values
      Object.assign(folder, inheritedUpdate);
      
      // Apply inheritance to children if this folder has any
      if (folder.children && folder.children.length > 0) {
        const applyInheritanceToChildren = (children, parentMeta) => {
          return children.map(child => {
            const updatedChild = {
              ...child,
              description: child.description || parentMeta.description,
              departments: (child.departments && child.departments.length > 0) ? child.departments : parentMeta.departments,
              years: (child.years && child.years.length > 0 && child.years[0] !== 0) ? child.years : parentMeta.years,
              semesters: (child.semesters && child.semesters.length > 0 && child.semesters[0] !== 0) ? child.semesters : parentMeta.semesters,
              tags: (child.tags && child.tags.length > 0) ? child.tags : (parentMeta.tags ? [...parentMeta.tags, child.name.toLowerCase()] : [child.name.toLowerCase()]),
              accessControlTags: (child.accessControlTags && child.accessControlTags.length > 0) ? child.accessControlTags : parentMeta.accessControlTags
            };
            if (child.children && child.children.length > 0) {
              updatedChild.children = applyInheritanceToChildren(child.children, updatedChild);
            }
            return updatedChild;
          });
        };
        folder.children = applyInheritanceToChildren(folder.children, folder);
      }
      
      return { found: true, folder };
    }
    
    // Search in children recursively
    if (folder.children && folder.children.length > 0) {
      const result = findAndUpdateFolderInHierarchy(folder.children, targetGdriveId, updateData, folder);
      if (result.found) {
        return result;
      }
    }
  }
  
  return { found: false, folder: null };
};

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

    let folder = null;
    let changes = {};
    let isSubfolderUpdate = false;
    let parentFolder = null;

    // First, check if this is a subfolder in any hierarchy
    const allTopLevelFolders = await Folder.find({ parent: null });
    for (const topFolder of allTopLevelFolders) {
      if (topFolder.children && topFolder.children.length > 0) {
        const result = findAndUpdateFolderInHierarchy(topFolder.children, req.params.id, update, topFolder);
        if (result.found) {
          folder = result.folder;
          parentFolder = topFolder;
          isSubfolderUpdate = true;
          break;
        }
      }
    }

    // If not found in hierarchy, try to find as a top-level folder
    if (!folder) {
      if (/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
        folder = await Folder.findById(req.params.id);
      } else {
        folder = await Folder.findOne({ gdriveId: req.params.id });
      }
    }

    // If still not found, return error (don't create new folders)
    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Track changes for logging
    if (name !== undefined && name !== folder.name) changes.name = { from: folder.name, to: name };
    if (description !== undefined && description !== folder.description) changes.description = { from: folder.description, to: description };
    if (years !== undefined && JSON.stringify(years) !== JSON.stringify(folder.years)) changes.years = { from: folder.years, to: years };
    if (departments !== undefined && JSON.stringify(departments) !== JSON.stringify(folder.departments)) changes.departments = { from: folder.departments, to: departments };
    if (semesters !== undefined && JSON.stringify(semesters) !== JSON.stringify(folder.semesters)) changes.semesters = { from: folder.semesters, to: semesters };
    if (tags !== undefined && JSON.stringify(tags) !== JSON.stringify(folder.tags)) changes.tags = { from: folder.tags, to: tags };
    if (accessControlTags !== undefined && JSON.stringify(accessControlTags) !== JSON.stringify(folder.accessControlTags)) changes.accessControlTags = { from: folder.accessControlTags, to: accessControlTags };

    if (isSubfolderUpdate) {
      // Subfolder was already updated in findAndUpdateFolderInHierarchy, just save the parent
      await parentFolder.save();
    } else {
      // This is a top-level folder, update it directly
      Object.assign(folder, update);
      
      // Apply inheritance to children if admin and folder has children
      if (req.user.role === 'admin' && folder.children && folder.children.length > 0) {
        const applyInheritanceToChildren = (children) => {
          return children.map(child => {
            const updatedChild = {
              ...child,
              description: child.description || description,
              departments: (child.departments && child.departments.length > 0) ? child.departments : departments,
              years: (child.years && child.years.length > 0 && child.years[0] !== 0) ? child.years : years,
              semesters: (child.semesters && child.semesters.length > 0 && child.semesters[0] !== 0) ? child.semesters : semesters,
              tags: (child.tags && child.tags.length > 0) ? child.tags : (tags ? [...tags, child.name.toLowerCase()] : [child.name.toLowerCase()]),
              accessControlTags: (child.accessControlTags && child.accessControlTags.length > 0) ? child.accessControlTags : accessControlTags
            };
            if (child.children && child.children.length > 0) {
              updatedChild.children = applyInheritanceToChildren(child.children);
            }
            return updatedChild;
          });
        };
        folder.children = applyInheritanceToChildren(folder.children);
      }
      
      await folder.save();
    }

    // Log folder metadata update (with error handling)
    try {
      await AccessLog.logAccess({
        userId: req.user._id,
        action: 'folder_update_metadata',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        folderId: folder._id || folder.gdriveId,
        metadata: { changes }
      });
    } catch (logError) {
      console.warn('Failed to log folder update:', logError.message);
      // Don't fail the request if logging fails
    }
    
    // Emit socket.io event for real-time updates
    try {
      emitFolderUpdate(req, folder);
    } catch (socketError) {
      console.warn('Failed to emit folder update event:', socketError.message);
      // Don't fail the request if socket event fails
    }
    
    res.json(folder);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update folder', details: err.message });
  }
});

// Folder delete route
router.delete('/:id', authenticate, async (req, res) => {
  try {
    let folder = null;
    if (/^[a-fA-F0-9]{24}$/.test(req.params.id)) {
      folder = await Folder.findById(req.params.id);
    } else {
      folder = await Folder.findOne({ gdriveId: req.params.id });
    }
    if (!folder) return res.status(404).json({ error: 'Folder not found' });
    await Folder.deleteOne({ _id: folder._id });
    // Log folder deletion
    await AccessLog.logAccess({
      userId: req.user._id,
      action: 'folder_delete',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      folderId: folder._id,
      metadata: { name: folder.name, description: folder.description }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete folder', details: err.message });
  }
});

// Helper function for searching files in folders
async function searchFilesInFolders(folders, user, searchTerm, googleDriveService) {
  if (!folders || !Array.isArray(folders) || !searchTerm || !googleDriveService) {
    throw new Error('Invalid parameters for searchFilesInFolders');
  }

  let results = [];
  try {
    for (const folder of folders) {
      // Skip if folder is not accessible to user
      if (!folder) continue;

      try {
        // Recursively search in children
        if (folder.children && Array.isArray(folder.children) && folder.children.length > 0) {
          const childResults = await searchFilesInFolders(folder.children, user, searchTerm, googleDriveService);
          if (Array.isArray(childResults)) {
            results = results.concat(childResults);
          }
        }

        // Search files in current folder
        if (folder.gdriveId) {
          try {
            const files = await googleDriveService.listFilesRecursive(folder.gdriveId);
            if (Array.isArray(files)) {
              const matchingFiles = files.filter(file =>
                file && file.name && 
                typeof file.name === 'string' && 
                file.name.toLowerCase().includes(searchTerm.toLowerCase())
              );
              results = results.concat(matchingFiles);
            }
          } catch (driveError) {
            console.error(`Error listing files in folder ${folder.gdriveId}:`, driveError);
            // Continue with other folders instead of failing completely
          }
        }
      } catch (folderError) {
        console.error(`Error processing folder:`, folderError);
        // Continue with other folders
      }
    }
    return results;
  } catch (error) {
    console.error('Error in searchFilesInFolders:', error);
    throw error;
  }
}

// Route: /folders/search
router.get('/search', authenticate, async (req, res) => {
  try {
    // Validate and sanitize input
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit) || 12));
    const searchTerm = (req.query.q || '').trim();
    
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Get root folders
    const rootFolders = await Folder.find({ parent: null }).lean();
    if (!rootFolders || !Array.isArray(rootFolders)) {
      return res.status(500).json({ error: 'Failed to retrieve folder structure' });
    }
    
    try {
      // Validate required credentials
      if (!credentials || !credentials.private_key || !credentials.client_email) {
        console.error('Invalid credentials state:', 
          credentials ? 'Missing required fields' : 'No credentials found');
        throw new Error('Google Drive credentials are not properly configured');
      }

      // Initialize Google Drive service
      const googleDriveService = new GoogleDriveService(credentials, process.env.GDRIVE_BASE_FOLDER_ID || null);
      
      // Get all matching files
      let results = await searchFilesInFolders(rootFolders, user, searchTerm, googleDriveService);
      
      // Ensure results is always an array
      results = Array.isArray(results) ? results : [];
      
      // Calculate pagination
      const startIndex = (page - 1) * limit;
      const endIndex = Math.min(startIndex + limit, results.length);
      const paginatedResults = results.slice(startIndex, endIndex);
      
      res.json({
        query: searchTerm,
        files: paginatedResults,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(results.length / limit) || 1,
          totalCount: results.length
        }
      });
    } catch (driveError) {
      console.error('Google Drive service error:', driveError);
      return res.status(500).json({ error: 'Failed to search files', details: driveError.message });
    }
  } catch (error) {
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

module.exports = router;
