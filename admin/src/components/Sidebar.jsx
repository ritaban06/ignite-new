import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
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
  Tags
} from 'lucide-react';
import { userAPI, pdfAPI } from '../api';
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

  const handleSyncSheets = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    
    try {
      const response = await userAPI.syncSheets();
      setSyncStatus({
        type: 'success',
        message: `Sync successful! ${response.data.data.usersCount} users loaded.`
      });
      
      // Clear status after 3 seconds
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus({
        type: 'error',
        message: error.response?.data?.message || 'Sync failed. Please try again.'
      });
      
      // Clear status after 5 seconds
      setTimeout(() => setSyncStatus(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCacheDriveFolders = async () => {
    setCacheLoading(true);
    setCacheResult(null);
    try {
      const res = await api.post('/folders/gdrive/cache');
      setCacheResult({ success: true, ...res.data });
      setTimeout(() => setCacheResult(null), 3000);
    } catch (err) {
      setCacheResult({ success: false, error: err?.response?.data?.error || 'Failed to cache folders' });
      setTimeout(() => setCacheResult(null), 5000);
    } finally {
      setCacheLoading(false);
    }
  };

  return (
    <div className="w-64 bg-gray-800 shadow-sm border-r border-gray-700 min-h-screen">
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
          >
            <Download className="mr-3 h-5 w-5 text-yellow-300" />
            {cacheLoading ? 'Caching Folders...' : 'Sync Folders from Google Drive'}
          </button>
          {/* Status Message for Folder Sync */}
          {cacheResult && (
            <div className={`mt-2 px-3 py-2 text-xs rounded-md ${
              cacheResult.success
                ? 'bg-green-800 text-green-200'
                : 'bg-red-800 text-red-200'
            }`}>
              {cacheResult.success
                ? `Sync complete: ${cacheResult.added ?? 0} added, ${cacheResult.updated ?? 0} updated, ${cacheResult.removed ?? 0} removed. Total scanned: ${cacheResult.total ?? 0}.`
                : `Error: ${cacheResult.error}`}
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
    </div>
  );
}
