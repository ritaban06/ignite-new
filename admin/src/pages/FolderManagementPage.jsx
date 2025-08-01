import React, { useState, useEffect } from 'react';
// Department, Year, and Semester options
const DEPARTMENTS = ['AIML', 'CSE', 'ECE', 'EEE', 'IT'];
const YEARS = ['1', '2', '3', '4'];
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];
import { Folder, FileText, Edit, Trash2, Plus, User, ChevronRight, ChevronDown, Check, X } from 'lucide-react';
import { folderAPI, pdfAPI, accessTagAPI } from '../api';
import { gdriveAPI } from '../api';
import toast from 'react-hot-toast';

// Use GDRIVE_BASE_FOLDER_ID from admin env
const GDRIVE_BASE_FOLDER_ID = import.meta.env.VITE_GDRIVE_BASE_FOLDER_ID;

export default function FolderManagementPage() {
  // console.log('GDRIVE_BASE_FOLDER_ID:', GDRIVE_BASE_FOLDER_ID);
  const [subjectFolders, setSubjectFolders] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [folderMetadata, setFolderMetadata] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [pdfs, setPdfs] = useState([]);
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [showAllFolders, setShowAllFolders] = useState(false);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedAccessTags, setSelectedAccessTags] = useState([]);

  useEffect(() => {
    fetchGDriveFolders();
  }, []);

  const fetchGDriveFolders = async () => {
    setLoading(true);
    try {
      // Fetch subject folders (top-level folders with their children)
      const subjectFoldersResponse = await folderAPI.getSubjectFolders();
      const subjectFoldersData = subjectFoldersResponse.data;
      // console.log('Subject folders data:', JSON.stringify(subjectFoldersData, null, 2));
      
      // Fetch all folders including hierarchy
      const allFoldersResponse = await folderAPI.getGDriveFolders();
      const allFoldersData = allFoldersResponse.data;
      // console.log('All folders data:', JSON.stringify(allFoldersData, null, 2));
      
      // Create a flat array of all folders for operations that need it
      const flattenFolders = (folders, result = []) => {
        folders.forEach(folder => {
          result.push(folder);
          if (folder.children && folder.children.length > 0) {
            flattenFolders(folder.children, result);
          }
        });
        return result;
      };
      
      const allFoldersFlat = flattenFolders(allFoldersData);
      // console.log('Flattened folders:', allFoldersFlat);
      
      // Create metadata map by gdriveId
      const metadataMap = new Map();
      subjectFoldersData.forEach(folder => {
        // Store the folder's own metadata
        metadataMap.set(folder.gdriveId, {
          description: folder.description,
          departments: folder.departments,
          years: folder.years,
          semesters: folder.semesters,
          tags: folder.tags,
          accessControlTags: folder.accessControlTags
        });
      });
      
      // Ensure children arrays are properly initialized
  const ensureChildrenArrays = (folders) => {
    if (!Array.isArray(folders)) {
      // console.error('ensureChildrenArrays received non-array:', folders);
      return [];
    }
    
    return folders.map(folder => {
      if (!folder) {
        console.error('Null or undefined folder in ensureChildrenArrays');
        return { children: [] };
      }
      
      // Make sure children is always an array
      if (!folder.children) folder.children = [];
      if (!Array.isArray(folder.children)) folder.children = [];
      
      // Recursively ensure children arrays for nested folders
      if (folder.children.length > 0) {
        folder.children = ensureChildrenArrays(folder.children);
      }
      
      return folder;
    });
  };
      
      const processedSubjectFolders = ensureChildrenArrays(subjectFoldersData);
      const processedAllFolders = ensureChildrenArrays(allFoldersData);
      
      // console.log('Processed subject folders:', processedSubjectFolders);
      
      setSubjectFolders(processedSubjectFolders);
      setAllFolders(processedAllFolders);
      setFolderMetadata(metadataMap);
      
      // Expand all top-level folders by default to show subfolders
      const newExpandedFolders = new Set(expandedFolders);
      processedSubjectFolders.forEach(folder => {
        if (folder.children && folder.children.length > 0) {
          newExpandedFolders.add(folder.gdriveId);
        }
      });
      setExpandedFolders(newExpandedFolders);
      
    } catch (error) {
      toast.error('Failed to load folders');
      console.error(error);
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

  // Toggle folder expansion
  const toggleFolderExpansion = (folderId) => {
    // console.log(`Toggling expansion for folder: ${folderId}`);
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
        // When expanding a folder, also fetch its PDFs
        if (selectedFolder?.gdriveId !== folderId) {
          const folder = findFolderById(folderId, allFolders);
          if (folder) {
            // console.log(`Found folder for ${folderId}:`, folder);
            fetchPdfsInFolder(folderId);
          }
        }
      }
      return newSet;
    });
  };
  
  // Helper function to find a folder by ID in the nested structure
  const findFolderById = (folderId, folders) => {
    for (const folder of folders) {
      if (folder.gdriveId === folderId) {
        return folder;
      }
      if (folder.children && folder.children.length > 0) {
        const found = findFolderById(folderId, folder.children);
        if (found) return found;
      }
    }
    return null;
  };

  // Toggle between showing all folders or just subject folders
  const toggleFolderView = () => {
    setShowAllFolders(prev => !prev);
  };

  // Recursive folder renderer that supports hierarchy
  const renderFolder = (folder, level = 0, isSubfolder = false) => {
    if (!folder) {
      console.error('Null or undefined folder in renderFolder');
      return null;
    }
    
    // Ensure folder has a children array
    if (!folder.children) folder.children = [];
    if (!Array.isArray(folder.children)) folder.children = [];
    
    const hasSubfolders = folder.children && folder.children.length > 0;
    const isExpanded = expandedFolders.has(folder.gdriveId);
    
    // console.log(`Rendering folder: ${folder.name}`, {
    //   gdriveId: folder.gdriveId,
    //   hasSubfolders,
    //   children: folder.children,
    //   isExpanded
    // });
    
    return (
      <li key={folder.gdriveId} className={`mb-2 ${isSubfolder ? 'ml-6' : 'p-4 bg-gray-700 rounded-lg mb-4'}`}>
        <div className="flex items-center gap-2 mb-2">
          {hasSubfolders && (
            <button 
              onClick={() => toggleFolderExpansion(folder.gdriveId)}
              className="text-gray-400 hover:text-white"
            >
              {isExpanded ? 
                <ChevronDown className="h-4 w-4" /> : 
                <ChevronRight className="h-4 w-4" />
              }
            </button>
          )}
          {!hasSubfolders && <div className="w-4 ml-4"></div>}
          <button
            className="text-blue-400 hover:text-blue-600 font-bold"
            onClick={() => {
              setSelectedFolder(folder);
              fetchPdfsInFolder(folder.gdriveId);
            }}
          >
            <Folder className="inline-block mr-2" />{folder.name}
          </button>
          <button
            className="ml-2 text-yellow-400 hover:text-yellow-600"
            title="Edit Folder Metadata"
            onClick={() => {
              setSelectedFolder(folder);
              setShowEditModal(true);
            }}
          >
            <Edit className="inline-block h-4 w-4" />
          </button>
        </div>
        
        {/* Display metadata */}
        {!isSubfolder && (
          <div className="ml-8 text-sm text-gray-300 space-y-1">
            {folder.departments?.length > 0 && (
              <div><span className="font-semibold">Departments:</span> {folder.departments.join(', ')}</div>
            )}
            {folder.years?.length > 0 && (
              <div><span className="font-semibold">Years:</span> {folder.years.join(', ')}</div>
            )}
            {folder.semesters?.length > 0 && (
              <div><span className="font-semibold">Semesters:</span> {folder.semesters.join(', ')}</div>
            )}
            {folder.description && (
              <div><span className="font-semibold">Description:</span> {folder.description}</div>
            )}
            {folder.tags?.length > 0 && (
              <div><span className="font-semibold">Tags:</span> {folder.tags.join(', ')}</div>
            )}
            {folder.accessControlTags?.length > 0 && (
              <div><span className="font-semibold">Access Tags:</span> {folder.accessControlTags.join(', ')}</div>
            )}
            <div className="text-xs text-yellow-400 mt-2">
              <em>Note: This metadata will be inherited by all subfolders unless explicitly changed.</em>
            </div>
          </div>
        )}
        
        {/* Render subfolders if expanded */}
        {hasSubfolders && isExpanded && (
          <ul className="mt-2">
            {/* {console.log(`Rendering children of ${folder.name}:`, folder.children)} */}
            {Array.isArray(folder.children) && folder.children.map(subfolder => {
              // console.log('Rendering subfolder:', subfolder);
              return renderFolder(subfolder, level + 1, true);
            })}
          </ul>
        )}
      </li>
    );
  };

  // Main folder list renderer
  const renderFolderList = () => {
    // With the new nested structure, we always render from the top-level folders
    // showAllFolders just controls whether we show the full hierarchy or just subject folders
    const foldersToRender = subjectFolders;
    
    return (
      <div>
        <div className="mb-4 flex justify-between items-center">
          <button 
            onClick={toggleFolderView}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            {showAllFolders ? 'Show Subject Folders Only' : 'Show All Folders with Hierarchy'}
          </button>
        </div>
        
        <ul className="ml-2">
          {foldersToRender.map(folder => renderFolder(folder))}
        </ul>
      </div>
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
      // Initialize the edit form with the selected folder's metadata
      // For nested folders, we need to handle both direct properties and inherited ones
      setEditForm({
        name: selectedFolder.name || '',
        description: selectedFolder.description || '',
        years: Array.isArray(selectedFolder.years) ? selectedFolder.years.map(String) : [],
        departments: Array.isArray(selectedFolder.departments) ? selectedFolder.departments : [],
        semesters: Array.isArray(selectedFolder.semesters) ? selectedFolder.semesters.map(String) : [],
        tags: Array.isArray(selectedFolder.tags) ? selectedFolder.tags.join(', ') : '',
        accessControlTags: Array.isArray(selectedFolder.accessControlTags) ? selectedFolder.accessControlTags.join(', ') : '',
      });
      setSelectedAccessTags(Array.isArray(selectedFolder.accessControlTags) ? selectedFolder.accessControlTags : []);
      
      // Fetch available tags
      const fetchAvailableTags = async () => {
        try {
          const response = await accessTagAPI.getAvailableTags();
          setAvailableTags(response.data || []);
        } catch (error) {
          console.error('Failed to fetch available tags:', error);
          toast.error('Failed to load available tags');
          setAvailableTags([]);
        }
      };
      
      fetchAvailableTags();
    }
  }, [showEditModal, selectedFolder]);

  const handleEditFolderChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      // Handle checkbox for multi-select options
      setEditForm(prev => {
        const currentValues = [...prev[name]];
        if (checked) {
          // Add value if checked and not already in array
          if (!currentValues.includes(value)) {
            return { ...prev, [name]: [...currentValues, value] };
          }
        } else {
          // Remove value if unchecked
          return { ...prev, [name]: currentValues.filter(val => val !== value) };
        }
        return prev;
      });
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
      accessControlTags: selectedAccessTags,
    };
    try {
      // Use gdriveId instead of id for folder identification
      await folderAPI.updateFolder(selectedFolder.gdriveId, updateData);
      toast.success('Folder updated successfully! Metadata will be inherited by subfolders.');
      setShowEditModal(false);
      setSelectedFolder(null);
      setSelectedAccessTags([]);
      fetchGDriveFolders();
    } catch (error) {
      console.error('Error updating folder:', error);
      toast.error('Failed to update folder');
    }
  };

  const toggleAccessTagSelection = (tagName) => {
    setSelectedAccessTags(prev => 
      prev.includes(tagName)
        ? prev.filter(tag => tag !== tagName)
        : [...prev, tagName]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">Manage Folders</h1>
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-6">
        <div className="mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Folders</h2>
            <p className="text-yellow-400 text-sm">Subject folders and their subfolders. Subfolders inherit metadata from their parent unless explicitly changed.</p>
          </div>
          <div>
            <button 
              onClick={toggleFolderView}
              className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm transition-colors"
            >
              {showAllFolders ? "Show Subject Folders Only" : "Show All Folders"}
            </button>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-300">Loading folders...</p>
          </div>
        ) : (
          renderFolderList()
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Edit Subject Folder Metadata</h2>
            <p className="text-gray-400 text-sm mb-4">Changes to this metadata will be inherited by all subfolders unless they have explicit metadata set.</p>
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
                <label className="block text-gray-300 mb-1">Departments</label>
                <div className="grid grid-cols-2 gap-2 p-3 rounded bg-gray-700 border border-gray-600">
                  {DEPARTMENTS.map(dept => (
                    <div key={dept} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`dept-${dept}`}
                        name="departments"
                        value={dept}
                        checked={editForm.departments.includes(dept)}
                        onChange={handleEditFolderChange}
                        className="mr-2 h-4 w-4 rounded border-gray-500 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor={`dept-${dept}`} className="text-white">{dept}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Years</label>
                <div className="grid grid-cols-2 gap-2 p-3 rounded bg-gray-700 border border-gray-600">
                  {YEARS.map(year => (
                    <div key={year} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`year-${year}`}
                        name="years"
                        value={year}
                        checked={editForm.years.includes(year)}
                        onChange={handleEditFolderChange}
                        className="mr-2 h-4 w-4 rounded border-gray-500 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor={`year-${year}`} className="text-white">Year {year}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-gray-300 mb-1">Semesters</label>
                <div className="grid grid-cols-4 gap-2 p-3 rounded bg-gray-700 border border-gray-600">
                  {SEMESTERS.map(semester => (
                    <div key={semester} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`semester-${semester}`}
                        name="semesters"
                        value={semester}
                        checked={editForm.semesters.includes(semester)}
                        onChange={handleEditFolderChange}
                        className="mr-2 h-4 w-4 rounded border-gray-500 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor={`semester-${semester}`} className="text-white">Sem {semester}</label>
                    </div>
                  ))}
                </div>
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
                <div className="space-y-2">
                  {availableTags.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 p-3 rounded bg-gray-700 border border-gray-600 max-h-40 overflow-y-auto">
                      {availableTags.map(tag => (
                        <div key={tag.name} className="flex items-center justify-between p-2 bg-gray-600 rounded">
                          <div className="flex items-center flex-1">
                            <span className="text-white text-sm">{tag.name}</span>
                            {tag.description && (
                              <span className="text-gray-400 text-xs ml-2">({tag.description})</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleAccessTagSelection(tag.name)}
                            className={`ml-2 p-1 rounded ${
                              selectedAccessTags.includes(tag.name)
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-500 text-gray-300'
                            }`}
                          >
                            {selectedAccessTags.includes(tag.name) ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-700 border border-gray-600 rounded text-gray-400 text-sm">
                      No access tags available. Create some access tags first.
                    </div>
                  )}
                  {selectedAccessTags.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-300 mb-1">Selected tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedAccessTags.map(tagName => (
                          <span key={tagName} className="px-2 py-1 bg-blue-600 text-white text-xs rounded">
                            {tagName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
