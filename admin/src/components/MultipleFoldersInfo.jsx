import React, { useState, useEffect } from 'react';

const MultipleFoldersInfo = () => {
  const [baseFolderInfo, setBaseFolderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBaseFolderInfo = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${import.meta.env.VITE_API_URL}/folders/gdrive-base-id`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBaseFolderInfo(data);
        } else {
          console.error('Failed to fetch base folder info');
        }
      } catch (error) {
        console.error('Error fetching base folder info:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBaseFolderInfo();
  }, []);

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-700">Loading base folder information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-red-700">Error loading base folder info: {error}</p>
      </div>
    );
  }

  if (!baseFolderInfo) {
    return null;
  }

  const hasMultipleFolders = baseFolderInfo.baseFolderIds && baseFolderInfo.baseFolderIds.length > 1;

  return (
    <div className={`border rounded-lg p-4 mb-6 ${hasMultipleFolders ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <h3 className="text-sm font-medium text-gray-900 mb-2">
        Google Drive Configuration
      </h3>
      
      {hasMultipleFolders ? (
        <div>
          <p className="text-sm text-green-700 mb-2">
            ✅ Multiple base folders configured ({baseFolderInfo.baseFolderIds.length} folders)
          </p>
          <div className="space-y-1">
            {baseFolderInfo.baseFolderIds.map((folderId, index) => (
              <div key={folderId} className="flex items-center text-xs">
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                  index === 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {index === 0 ? 'Primary' : `Secondary ${index}`}
                </span>
                <span className="ml-2 font-mono text-gray-600">{folderId}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">
            When syncing folders, all configured base folders will be processed.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-700 mb-2">
            Single base folder configured
          </p>
          <div className="flex items-center text-xs">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
              Primary
            </span>
            <span className="ml-2 font-mono text-gray-600">{baseFolderInfo.baseFolderId}</span>
          </div>
          <p className="text-xs text-gray-600 mt-2">
            To configure additional base folders, see the documentation for GDRIVE_BASE_FOLDER_ID.
          </p>
        </div>
      )}
    </div>
  );
};

export default MultipleFoldersInfo;