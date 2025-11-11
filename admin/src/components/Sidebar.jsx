import React, { useState, useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Upload, 
  FileText, 
  Users, 
  BarChart3,
  Settings,
  RefreshCw,
  Bug,
  Download,
  Folder,
  Tags,
  AlertTriangle
} from 'lucide-react';
import { userAPI, pdfAPI, folderAPI } from '../api';
import api from '../api';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Manage Folders', href: '/folders', icon: Folder },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Access Tags', href: '/access-tags', icon: Tags },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
];

export default function Sidebar() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [cacheResult, setCacheResult] = useState(null);

  // Parse multiple Google Drive base folder IDs
  const getBaseFolderIds = () => {
    const baseFolderIds = [];
    
    // Primary folder ID (supports comma-separated values)
    if (import.meta.env.VITE_GDRIVE_BASE_FOLDER_ID) {
      const primaryIds = import.meta.env.VITE_GDRIVE_BASE_FOLDER_ID
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      baseFolderIds.push(...primaryIds);
    }
    
    // Additional folder IDs via separate env vars
    if (import.meta.env.VITE_GDRIVE_BASE_FOLDER_ID_2) {
      baseFolderIds.push(import.meta.env.VITE_GDRIVE_BASE_FOLDER_ID_2.trim());
    }
    if (import.meta.env.VITE_GDRIVE_BASE_FOLDER_ID_3) {
      baseFolderIds.push(import.meta.env.VITE_GDRIVE_BASE_FOLDER_ID_3.trim());
    }
    
    // Remove duplicates
    return [...new Set(baseFolderIds)].filter(id => id.length > 0);
  };

  const baseFolderIds = getBaseFolderIds();
  const driveBaseFolderId = baseFolderIds[0]; // For backward compatibility
  const GOOGLE_DRIVE_FOLDER_URL = driveBaseFolderId
    ? `https://drive.google.com/drive/folders/${driveBaseFolderId}`
    : null;

  const handleOpenDriveRoot = (folderId, index = 0) => {
    const driveUrl = `https://drive.google.com/drive/folders/${folderId}`;
    window.open(driveUrl, '_blank', 'noopener,noreferrer');
  };

  const handleSyncSheets = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const response = await userAPI.syncSheets();
      const { sheetsUsersCount, importStats } = response.data.data;
      setSyncStatus({
        type: 'success',
        message: `Sync successful! ${sheetsUsersCount} users from sheets. Added: ${importStats.added}, Updated: ${importStats.updated}, Skipped: ${importStats.skipped}, Errors: ${importStats.errors}`
      });
      setTimeout(() => setSyncStatus(null), 5000); // Show longer for more detail
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus({
        type: 'error',
        message: error.response?.data?.message || 'Sync failed. Please try again.'
      });
      setTimeout(() => setSyncStatus(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCacheDriveFolders = async () => {
    setCacheLoading(true);
    setCacheResult(null);
    
    try {
      // Use the folderAPI directly instead of raw api
      const res = await folderAPI.syncFoldersFromGDrive();
      
      // On success, show the results for longer (5 seconds instead of 3)
      setCacheResult({ 
        success: true, 
        added: res.data.added || 0,
        updated: res.data.updated || 0, 
        removed: res.data.removed || 0,
        total: res.data.total || 0,
        message: res.data.message || 'Folders synchronized successfully!'
      });
      
      // If currently on the folders page, trigger a refresh
      if (window.location.pathname === '/folders') {
        // Dispatch a custom event that FolderManagementPage can listen for
        const event = new CustomEvent('folderSyncComplete');
        window.dispatchEvent(event);
      }
      
      setTimeout(() => setCacheResult(null), 5000);
    } catch (err) {
      console.error('Error syncing folders:', err);
      
      // Improved error message handling
      const errorMessage = err?.response?.data?.message || 
                          err?.response?.data?.error || 
                          err?.message || 
                          'Failed to synchronize folders from Google Drive';
                          
      setCacheResult({ 
        success: false, 
        error: errorMessage,
        details: err?.response?.data?.details || ''
      });
      
      // Show errors for longer (8 seconds)
      setTimeout(() => setCacheResult(null), 8000);
    } finally {
      setCacheLoading(false);
    }
  };

  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Hamburger for mobile */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-800 text-white p-2 rounded"
        onClick={() => setOpen(!open)}
        aria-label="Open sidebar"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <aside
        className={`bg-gray-800 shadow-sm border-r border-gray-700 min-h-screen w-64 transition-transform duration-300
          fixed top-16 left-0 z-40 ${open ? 'translate-x-0' : '-translate-x-full'}
          md:static md:top-auto md:left-auto md:z-0 md:translate-x-0 md:block`}
      >
        {/* Close button for mobile */}
        {/* <button className="md:hidden absolute top-4 right-4 bg-gray-700 text-white p-2 rounded" onClick={() => setOpen(false)} aria-label="Close sidebar">
          <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </button> */}
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary-900 text-primary-300 border-r-2 border-primary-500'
                        : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`
                  }
                  onClick={() => setOpen(false)} // Close sidebar on mobile nav
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
          {/* Sync from Google Sheets Section */}
          <div className="mt-8 pt-4 border-t border-gray-700">
            <button
              onClick={handleSyncSheets}
              disabled={isSyncing}
              className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                isSyncing
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'text-gray-300 hover:text-white hover:bg-blue-600 bg-blue-700'
              }`}
            >
              <RefreshCw className={`mr-3 h-5 w-5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Google Sheets'}
            </button>
            {/* Sync Folders from Google Drive Button */}
            <button
              onClick={handleCacheDriveFolders}
              disabled={cacheLoading}
              className="w-full flex items-center px-3 py-2 mt-2 text-sm font-medium rounded-md transition-colors text-gray-300 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-60"
              title="Synchronize folders from Google Drive and clean up duplicates"
            >
              <Download className={`mr-3 h-5 w-5 text-yellow-300 ${cacheLoading ? 'animate-pulse' : ''}`} />
              {cacheLoading ? 'Synchronizing Folders...' : 'Sync Folders from Google Drive'}
            </button>
            {/* Open Google Drive Root Button(s) */}
            {baseFolderIds.length === 1 ? (
              // Single folder - show one button
              <button
                onClick={() => handleOpenDriveRoot(baseFolderIds[0])}
                className="w-full flex items-center px-3 py-2 mt-2 text-sm font-medium rounded-md transition-colors text-gray-300 bg-green-700 hover:bg-green-600"
                title="Open Google Drive root folder in a new tab"
                disabled={baseFolderIds.length === 0}
              >
                <Folder className="mr-3 h-5 w-5 text-green-300" />
                Open Google Drive Root
              </button>
            ) : baseFolderIds.length > 1 ? (
              // Multiple folders - show separate buttons
              baseFolderIds.map((folderId, index) => (
                <button
                  key={folderId}
                  onClick={() => handleOpenDriveRoot(folderId, index)}
                  className="w-full flex items-center px-3 py-2 mt-2 text-sm font-medium rounded-md transition-colors text-gray-300 bg-green-700 hover:bg-green-600"
                  title={`Open Google Drive folder ${index + 1} in a new tab`}
                >
                  <Folder className="mr-3 h-5 w-5 text-green-300" />
                  Drive Folder {index + 1}
                  <span className="ml-auto text-xs text-green-200">
                    {folderId.substring(0, 8)}...
                  </span>
                </button>
              ))
            ) : null}
            {/* Open Google Sheets Button */}
            <button
              onClick={() => {
                const sheetsUrl = import.meta.env.VITE_APPROVED_USERS_SHEET_URL;
                if (sheetsUrl) {
                  window.open(sheetsUrl, '_blank', 'noopener,noreferrer');
                }
              }}
              className="w-full flex items-center px-3 py-2 mt-2 text-sm font-medium rounded-md transition-colors text-black bg-yellow-300 hover:bg-yellow-600"
              title="Open approved users Google Sheet in a new tab"
              disabled={!import.meta.env.VITE_APPROVED_USERS_SHEET_URL}
            >
              <FileText className="mr-3 h-5 w-5 text-black" />
              Open Google Sheets
            </button>
            {/* Status Message for Folder Sync */}
            {cacheResult && (
              <div className={`mt-2 px-3 py-2 text-xs rounded-md ${
                cacheResult.success
                  ? 'bg-green-800 text-green-200'
                  : 'bg-red-800 text-red-200'
              }`}>
                {cacheResult.success ? (
                  <div className="space-y-1">
                    <div className="font-medium">Synchronization complete:</div>
                    <div>• {cacheResult.added} folders added</div>
                    <div>• {cacheResult.updated} folders updated</div>
                    <div>• {cacheResult.removed} folders removed</div>
                    <div>• {cacheResult.total} folders scanned</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center font-medium">
                      <AlertTriangle className="w-4 h-4 mr-1" /> Error:
                    </div>
                    <div>{cacheResult.error}</div>
                    {cacheResult.details && <div className="text-xs opacity-80">{cacheResult.details}</div>}
                  </div>
                )}
              </div>
            )}
            {/* Status Message for Sheets Sync */}
            {syncStatus && (
              <div className={`mt-2 px-3 py-2 text-xs rounded-md ${
                syncStatus.type === 'success'
                  ? 'bg-green-800 text-green-200'
                  : 'bg-red-800 text-red-200'
              }`}>
                {syncStatus.message}
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}
