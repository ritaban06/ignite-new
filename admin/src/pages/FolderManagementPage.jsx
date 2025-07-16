import React, { useState, useEffect } from 'react';
import { Folder, FileText, Edit, Trash2, Plus, User } from 'lucide-react';
import { folderAPI, pdfAPI } from '../api';
import { gdriveAPI } from '../api';
import toast from 'react-hot-toast';

// Use GDRIVE_BASE_FOLDER_ID from admin env
const GDRIVE_BASE_FOLDER_ID = import.meta.env.VITE_GDRIVE_BASE_FOLDER_ID || import.meta.env.GDRIVE_BASE_FOLDER_ID || '1CiH_j_hiOz2-ybtmvCfTSG-XxrJlh0ic';

export default function FolderManagementPage() {
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pdfs, setPdfs] = useState([]);

  useEffect(() => {
    fetchGDriveFolders();
  }, []);

  const fetchGDriveFolders = async () => {
    setLoading(true);
    try {
      const response = await gdriveAPI.getFolders();
      setFolders(response.data);
    } catch (error) {
      toast.error('Failed to load Google Drive folders');
    } finally {
      setLoading(false);
    }
  };

  const fetchPdfsInFolder = async (folderId) => {
    try {
      const response = await folderAPI.getPdfsInFolder(folderId);
      setPdfs(response.data);
    } catch (error) {
      toast.error('Failed to load PDFs in folder');
    }
  };

  // Recursive folder tree renderer
  const renderFolderTree = (folders, parentId, level = 0) => {
    if (!GDRIVE_BASE_FOLDER_ID && level === 0) return null;
    const rootId = level === 0 ? GDRIVE_BASE_FOLDER_ID : parentId;
    return (
      <ul className={level === 0 ? 'ml-2' : 'ml-6'}>
        {folders.filter(f => f.parent === rootId).map((folder, idx) => (
          <li key={folder.id ? folder.id : `folder-${idx}`} className="mb-2">
            <div className="flex items-center gap-2">
              <button
                className="text-blue-400 hover:text-blue-600 font-bold"
                onClick={() => {
                  setSelectedFolder(folder);
                  fetchPdfsInFolder(folder.id);
                }}
              >
                <Folder className="inline-block mr-1" />{folder.name}
              </button>
            </div>
            {renderFolderTree(folders, folder.id, level + 1)}
          </li>
        ))}
      </ul>
    );
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('Delete this folder and all PDFs inside?')) return;
    try {
      await folderAPI.deleteFolder(folderId);
      toast.success('Folder deleted');
      fetchFolders();
      setSelectedFolder(null);
      setPdfs([]);
    } catch (error) {
      toast.error('Failed to delete folder');
    }
  };

  // ...Add create/edit modal logic as needed...

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Manage Folders</h1>
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-6">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-300">Loading folders...</p>
          </div>
        ) : (
          renderFolderTree(folders, GDRIVE_BASE_FOLDER_ID)
        )}
      </div>
      {selectedFolder && (
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">PDFs in {selectedFolder.name}</h2>
          {pdfs.length === 0 ? (
            <p className="text-gray-300">No PDFs in this folder</p>
          ) : (
            <ul>
              {pdfs.map((pdf, idx) => (
                <li key={pdf._id || pdf.id || idx} className="mb-2 flex items-center gap-2">
                  <FileText className="inline-block mr-1 text-primary-600" />
                  <span className="text-white font-medium">{pdf.title || pdf.name || 'Untitled PDF'}</span>
                  {pdf.subject && (
                    <span className="text-gray-400">({pdf.subject})</span>
                  )}
                  <span className="text-xs text-gray-400 ml-2">{pdf.fileName || pdf.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{pdf.fileSize || pdf.size || 0} bytes</span>
                  {pdf.uploadedBy?.name || pdf.uploadedByName ? (
                    <span className="text-xs text-gray-400 ml-2">Uploaded by: {pdf.uploadedBy?.name || pdf.uploadedByName}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {/* TODO: Add modals for create/edit folder */}
    </div>
  );
}
