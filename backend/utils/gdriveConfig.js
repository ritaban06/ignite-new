/**
 * Utility functions for Google Drive configuration
 */

/**
 * Get all configured Google Drive base folder IDs
 * Supports multiple configuration methods:
 * 1. Comma-separated values in GDRIVE_BASE_FOLDER_ID
 * 2. Separate environment variables (GDRIVE_BASE_FOLDER_ID_2, GDRIVE_BASE_FOLDER_ID_3, etc.)
 * 
 * @returns {string[]} Array of base folder IDs
 */
function getBaseFolderIds() {
  const baseFolderIds = [];
  
  // Method 1: Primary folder ID (supports comma-separated values)
  if (process.env.GDRIVE_BASE_FOLDER_ID) {
    const primaryIds = process.env.GDRIVE_BASE_FOLDER_ID
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);
    baseFolderIds.push(...primaryIds);
  }
  
  // Method 2: Additional folder IDs via separate env vars
  if (process.env.GDRIVE_BASE_FOLDER_ID_2) {
    baseFolderIds.push(process.env.GDRIVE_BASE_FOLDER_ID_2.trim());
  }
  if (process.env.GDRIVE_BASE_FOLDER_ID_3) {
    baseFolderIds.push(process.env.GDRIVE_BASE_FOLDER_ID_3.trim());
  }
  
  // Remove duplicates and filter out empty strings
  return [...new Set(baseFolderIds)].filter(id => id.length > 0);
}

/**
 * Get the primary (first) base folder ID for backward compatibility
 * 
 * @returns {string|null} Primary base folder ID or null if none configured
 */
function getPrimaryBaseFolderId() {
  const ids = getBaseFolderIds();
  return ids.length > 0 ? ids[0] : null;
}

/**
 * Check if multiple base folders are configured
 * 
 * @returns {boolean} True if multiple base folders are configured
 */
function hasMultipleBaseFolders() {
  return getBaseFolderIds().length > 1;
}

/**
 * Validate that at least one base folder ID is configured
 * 
 * @returns {boolean} True if at least one base folder is configured
 */
function hasBaseFolderIds() {
  return getBaseFolderIds().length > 0;
}

module.exports = {
  getBaseFolderIds,
  getPrimaryBaseFolderId,
  hasMultipleBaseFolders,
  hasBaseFolderIds
};