
// This file contains helper functions to emit socket events from various routes
// without having to handle the socket instance directly.

/**
 * Emits folder update event to all connected clients
 * @param {object} req - Express request object (contains the socketio instance)
 * @param {object} folderData - The updated folder data
 */
const emitFolderUpdate = (req, folderData) => {
  const io = req.app.get('socketio');
  if (!io) {
    console.warn('Socket.IO not initialized, skipping folder update emission');
    return;
  }
  
  io.emit('folder:updated', {
    folderId: folderData._id,
    name: folderData.name,
    updatedAt: folderData.updatedAt,
    type: folderData.type,
    action: 'updated'
  });
  
  console.log(`Socket event emitted: folder:updated for folder ${folderData._id}`);
};

/**
 * Emits access tag update event to all connected clients
 * @param {object} req - Express request object
 * @param {object} tagData - The updated access tag data
 */
const emitAccessTagUpdate = (req, tagData) => {
  const io = req.app.get('socketio');
  if (!io) {
    console.warn('Socket.IO not initialized, skipping access tag update emission');
    return;
  }
  
  io.emit('accessTag:updated', {
    tagId: tagData._id,
    name: tagData.name,
    updatedAt: tagData.updatedAt,
    action: 'updated'
  });
  
  console.log(`Socket event emitted: accessTag:updated for tag ${tagData._id}`);
};

/**
 * Emits PDF update event to all connected clients
 * @param {object} req - Express request object
 * @param {object} pdfData - The updated PDF data
 */
const emitPdfUpdate = (req, pdfData) => {
  const io = req.app.get('socketio');
  if (!io) {
    console.warn('Socket.IO not initialized, skipping PDF update emission');
    return;
  }
  
  io.emit('pdf:updated', {
    pdfId: pdfData._id,
    title: pdfData.title,
    folderId: pdfData.folder,
    updatedAt: pdfData.updatedAt,
    action: 'updated'
  });
  
  console.log(`Socket event emitted: pdf:updated for PDF ${pdfData._id}`);
};

module.exports = {
  emitFolderUpdate,
  emitAccessTagUpdate,
  emitPdfUpdate
};
