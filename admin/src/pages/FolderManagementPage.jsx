import React, { useState, useEffect } from 'react';
// Department, Year, and Semester options
const DEPARTMENTS = ['AIML', 'CSE', 'ECE', 'EEE', 'IT'];
const YEARS = ['1', '2', '3', '4'];
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];
import { Folder, FileText, Edit, Trash2, Plus, User } from 'lucide-react';
import { folderAPI, pdfAPI } from '../api';
import { gdriveAPI } from '../api';
import toast from 'react-hot-toast';

// Use GDRIVE_BASE_FOLDER_ID from admin env
const GDRIVE_BASE_FOLDER_ID = import.meta.env.VITE_GDRIVE_BASE_FOLDER_ID;

export default function FolderManagementPage() {
  // console.log('GDRIVE_BASE_FOLDER_ID:', GDRIVE_BASE_FOLDER_ID);
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
      // console.log('GDrive Folders:', response.data); // Debug log
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

  // Recursive folder tree renderer (handles parent as string or array)
  const renderFolderTree = (folders, parentId, level = 0) => {
    if (!GDRIVE_BASE_FOLDER_ID && level === 0) return null;
    const rootId = level === 0 ? GDRIVE_BASE_FOLDER_ID : parentId;
    if (level === 0) {
      // console.log('Rendering folder tree with rootId:', rootId);
    }
    // Find children for this rootId
    const children = folders.filter(f => {
      if (Array.isArray(f.parents)) {
        return f.parents.includes(rootId);
      }
      if (typeof f.parent === 'string') {
        return f.parent === rootId;
      }
      return false;
    });
    // Fallback: if no children found for root, render all folders as top-level
    const foldersToRender = (level === 0 && children.length === 0) ? folders : children;
    return (
      <ul className={level === 0 ? 'ml-2' : 'ml-6'}>
        {foldersToRender.map((folder, idx) => (
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
              <button
                className="ml-2 text-yellow-400 hover:text-yellow-600"
                title="Edit Folder"
                onClick={() => {
                  setSelectedFolder(folder);
                  setShowEditModal(true);
                }}
              >
                <Edit className="inline-block h-4 w-4" />
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


  // Edit Folder Modal logic
  const [editForm, setEditForm] = useState({ 
    name: '', 
    description: '', 
    years: [], 
    departments: [], 
    semesters: [], 
    tags: '', 
    accessControlTags: '' 
  });
  useEffect(() => {
    if (showEditModal && selectedFolder) {
      setEditForm({
        name: selectedFolder.name || '',
        description: selectedFolder.description || '',
        years: Array.isArray(selectedFolder.years) ? selectedFolder.years.map(String) : (selectedFolder.year ? [String(selectedFolder.year)] : []),
        departments: Array.isArray(selectedFolder.departments) ? selectedFolder.departments : (selectedFolder.department ? [selectedFolder.department] : []),
        semesters: Array.isArray(selectedFolder.semesters) ? selectedFolder.semesters.map(String) : [],
        tags: Array.isArray(selectedFolder.tags) ? selectedFolder.tags.join(', ') : (selectedFolder.tags || ''),
        accessControlTags: Array.isArray(selectedFolder.accessControlTags) ? selectedFolder.accessControlTags.join(', ') : '',
      });
    }
  }, [showEditModal, selectedFolder]);

  const handleEditFolderChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'select-multiple') {
      const selectedValues = Array.from(e.target.selectedOptions, option => option.value);
      setEditForm(prev => ({ ...prev, [name]: selectedValues }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdateFolder = async (e) => {
    e.preventDefault();
    // Clean up tags and convert arrays
    const updateData = {
      name: editForm.name,
      description: editForm.description,
      departments: editForm.departments,
      years: editForm.years.map(year => Number(year)),
      semesters: editForm.semesters.map(semester => Number(semester)),
      tags: editForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      accessControlTags: editForm.accessControlTags.split(',').map(tag => tag.trim()).filter(tag => tag),
    };
    try {
      await folderAPI.updateFolder(selectedFolder.id, updateData);
      toast.success('Folder updated');
      setShowEditModal(false);
      setSelectedFolder(null);
      fetchGDriveFolders();
    } catch (error) {
      toast.error('Failed to update folder');
    }
  };

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
      {/* Edit Folder Modal */}
      {showEditModal && selectedFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Edit Folder</h2>
            <form onSubmit={handleUpdateFolder} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditFolderChange}
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Description</label>
                <textarea
                  name="description"
                  value={editForm.description}
                  onChange={handleEditFolderChange}
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Departments (Hold Ctrl/Cmd to select multiple)</label>
                <select
                  name="departments"
                  value={editForm.departments}
                  onChange={handleEditFolderChange}
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none"
                  multiple
                  size="3"
                >
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Years (Hold Ctrl/Cmd to select multiple)</label>
                <select
                  name="years"
                  value={editForm.years}
                  onChange={handleEditFolderChange}
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none"
                  multiple
                  size="3"
                >
                  {YEARS.map(year => (
                    <option key={year} value={year}>Year {year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Semesters (Hold Ctrl/Cmd to select multiple)</label>
                <select
                  name="semesters"
                  value={editForm.semesters}
                  onChange={handleEditFolderChange}
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none"
                  multiple
                  size="3"
                >
                  {SEMESTERS.map(semester => (
                    <option key={semester} value={semester}>Semester {semester}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Tags</label>
                <input
                  type="text"
                  name="tags"
                  value={editForm.tags}
                  onChange={handleEditFolderChange}
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none"
                  placeholder="Separate tags with commas"
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Access Control Tags</label>
                <input
                  type="text"
                  name="accessControlTags"
                  value={editForm.accessControlTags}
                  onChange={handleEditFolderChange}
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none"
                  placeholder="Separate access control tags with commas"
                />
                <p className="text-xs text-gray-400 mt-1">These tags control who can access this folder</p>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  Update Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
