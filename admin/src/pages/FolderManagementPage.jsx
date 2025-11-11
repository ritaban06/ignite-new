import React, { useState, useEffect } from 'react';
// Department, Year, and Semester options
const DEPARTMENTS = ['CSE', 'CSBS', 'AIML', 'CSDS', 'IT', 'CSCS', 'ECE', 'EIE', 'IOT', 'ECS', 'EE', 'CE', 'FT', 'ME', 'BCA', 'BBA', 'BHM', 'BMS'];
const YEARS = ['1', '2', '3', '4'];
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8'];
import { Folder, FileText, Edit, Trash2, Plus, User, ChevronRight, ChevronDown, Check, X } from 'lucide-react';
import { folderAPI, pdfAPI, accessTagAPI } from '../api';
import { gdriveAPI } from '../api';
import toast from 'react-hot-toast';
import socketService from '../services/socketService';
import MultipleFoldersInfo from '../components/MultipleFoldersInfo';

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
  const [showPropagationModal, setShowPropagationModal] = useState(false);
  const [pendingUpdateData, setPendingUpdateData] = useState(null);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [bulkUpdateProgress, setBulkUpdateProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    fetchGDriveFolders();
    
    // Listen for real-time updates from other admins
    socketService.on('folder:updated', (folderData) => {
      console.log('Folder updated event received in admin:', folderData);
      // Refresh folder data
      fetchGDriveFolders();
      
      // toast.success(`Folder "${folderData.name}" was updated by another admin`);
    });
    
    // Listen for the folder sync completion event from Sidebar
    const handleFolderSyncComplete = () => {
      console.log('Folder sync complete event received');
      toast.success('Folder structure synchronized from Google Drive');
      fetchGDriveFolders();
    };
    
    window.addEventListener('folderSyncComplete', handleFolderSyncComplete);
    
    // Clean up event listeners
    return () => {
      socketService.off('folder:updated');
      window.removeEventListener('folderSyncComplete', handleFolderSyncComplete);
    };
  }, []);

  const fetchGDriveFolders = async () => {
    setLoading(true);
    try {
      // Fetch subject folders (top-level folders with their children)
      const subjectFoldersResponse = await folderAPI.getSubjectFolders();
      const subjectFoldersData = subjectFoldersResponse.data;
      
      // Fetch all folders including hierarchy
      const allFoldersResponse = await folderAPI.getGDriveFolders();
      const allFoldersData = allFoldersResponse.data;
      
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
      
      // Create metadata map by gdriveId
      const metadataMap = new Map();
      
      // Add metadata from all folders, both subject and subfolders
      allFoldersFlat.forEach(folder => {
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
      
      // Validate for duplicate folders and log warnings
      const checkForDuplicates = (folders, path = '') => {
        const seen = new Set();
        folders.forEach(folder => {
          const currentPath = path ? `${path}/${folder.name}` : folder.name;
          if (seen.has(folder.gdriveId)) {
            console.warn(`Duplicate folder detected: ${folder.name} (${folder.gdriveId}) at path ${currentPath}`);
          }
          seen.add(folder.gdriveId);
          
          if (folder.children && folder.children.length > 0) {
            checkForDuplicates(folder.children, currentPath);
          }
        });
      };
      
      // Check for duplicates in the folder structure
      checkForDuplicates(processedAllFolders);
      
      setSubjectFolders(processedSubjectFolders);
      setAllFolders(processedAllFolders);
      setFolderMetadata(metadataMap);
      
      // Do not expand any folders by default
      setExpandedFolders(new Set());
      
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
      // toast.error('Failed to load PDFs in folder');
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

  // Helper function to find parent folder of a given folder
  const findParentFolder = (targetFolderId, folders, parent = null) => {
    for (const folder of folders) {
      if (folder.gdriveId === targetFolderId) {
        return parent;
      }
      if (folder.children && folder.children.length > 0) {
        const found = findParentFolder(targetFolderId, folder.children, folder);
        if (found !== null) return found;
      }
    }
    return null;
  };

  // Helper function to get inherited metadata from parent
  const getInheritedMetadata = (folder, parentFolder) => {
    if (!parentFolder) return {};
    
    return {
      description: folder.description || parentFolder.description || '',
      departments: (folder.departments && folder.departments.length > 0) ? folder.departments : (parentFolder.departments || []),
      years: (folder.years && folder.years.length > 0) ? folder.years : (parentFolder.years || []),
      semesters: (folder.semesters && folder.semesters.length > 0) ? folder.semesters : (parentFolder.semesters || []),
      tags: (folder.tags && folder.tags.length > 0) ? folder.tags : (parentFolder.tags || []),
      accessControlTags: (folder.accessControlTags && folder.accessControlTags.length > 0) ? folder.accessControlTags : (parentFolder.accessControlTags || [])
    };
  };

  // Helper function to check if a folder is a subfolder
  const isSubfolder = (folderId) => {
    const parentFolder = findParentFolder(folderId, subjectFolders);
    return parentFolder !== null;
  };

  // Helper function to check if a folder has subfolders
  const hasSubfolders = (folderId) => {
    const folder = findFolderById(folderId, allFolders);
    return folder && folder.children && folder.children.length > 0;
  };

  // Helper function to get all descendant folders recursively
  const getAllDescendantFolders = (folder) => {
    let descendants = [];
    if (folder.children && folder.children.length > 0) {
      folder.children.forEach(child => {
        descendants.push(child);
        descendants = descendants.concat(getAllDescendantFolders(child));
      });
    }
    return descendants;
  };

  // Toggle between showing all folders or just subject folders
  const toggleFolderView = () => {
    setShowAllFolders(prev => !prev);
  };

  // Recursive folder renderer that supports hierarchy
  const renderFolder = (folder, level = 0, isSubfolderParam = false) => {
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
      <li key={folder.gdriveId} className={`mb-2 ${isSubfolderParam ? 'ml-6' : 'p-4 bg-gray-700 rounded-lg mb-4'}`}>
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
        <div className="ml-8 text-sm text-gray-300 space-y-1">
          {(() => {
            // Get effective metadata (inherited or direct)
            const parentFolder = isSubfolderParam ? findParentFolder(folder.gdriveId, subjectFolders) : null;
            const effectiveMetadata = isSubfolderParam ? getInheritedMetadata(folder, parentFolder) : folder;
            // Sort years and semesters numerically ascending
            const sortedYears = effectiveMetadata.years?.length > 0
              ? [...effectiveMetadata.years].map(Number).sort((a, b) => a - b).map(String)
              : [];
            const sortedSemesters = effectiveMetadata.semesters?.length > 0
              ? [...effectiveMetadata.semesters].map(Number).sort((a, b) => a - b).map(String)
              : [];
            // Sort departments and tags alphabetically ascending
            const sortedDepartments = effectiveMetadata.departments?.length > 0
              ? [...effectiveMetadata.departments].sort((a, b) => a.localeCompare(b))
              : [];
            const sortedTags = effectiveMetadata.tags?.length > 0
              ? [...effectiveMetadata.tags].sort((a, b) => a.localeCompare(b))
              : [];
            return (
              <>
                {sortedDepartments.length > 0 && (
                  <div>
                    <span className="font-semibold">Departments:</span> {sortedDepartments.join(', ')}
                    {isSubfolderParam && (!folder.departments || folder.departments.length === 0) && (
                      <span className="text-blue-400 text-xs ml-2">(inherited)</span>
                    )}
                  </div>
                )}
                {sortedYears.length > 0 && (
                  <div>
                    <span className="font-semibold">Years:</span> {sortedYears.join(', ')}
                    {isSubfolderParam && (!folder.years || folder.years.length === 0) && (
                      <span className="text-blue-400 text-xs ml-2">(inherited)</span>
                    )}
                  </div>
                )}
                {sortedSemesters.length > 0 && (
                  <div>
                    <span className="font-semibold">Semesters:</span> {sortedSemesters.join(', ')}
                    {isSubfolderParam && (!folder.semesters || folder.semesters.length === 0) && (
                      <span className="text-blue-400 text-xs ml-2">(inherited)</span>
                    )}
                  </div>
                )}
                {effectiveMetadata.description && (
                  <div>
                    <span className="font-semibold">Description:</span> {effectiveMetadata.description}
                    {isSubfolderParam && !folder.description && (
                      <span className="text-blue-400 text-xs ml-2">(inherited)</span>
                    )}
                  </div>
                )}
                {sortedTags.length > 0 && (
                  <div>
                    <span className="font-semibold">Tags:</span> {sortedTags.join(', ')}
                    {isSubfolderParam && (!folder.tags || folder.tags.length === 0) && (
                      <span className="text-blue-400 text-xs ml-2">(inherited)</span>
                    )}
                  </div>
                )}
                {effectiveMetadata.accessControlTags?.length > 0 && (
                  <div>
                    <span className="font-semibold">Access Tags:</span> {effectiveMetadata.accessControlTags.join(', ')}
                    {isSubfolderParam && (!folder.accessControlTags || folder.accessControlTags.length === 0) && (
                      <span className="text-blue-400 text-xs ml-2">(inherited)</span>
                    )}
                  </div>
                )}
                {/* <div className="text-xs text-yellow-400 mt-2">
                  <em>
                    {isSubfolderParam 
                      ? 'Note: This subfolder inherits metadata from its parent unless explicitly changed.'
                      : 'Note: This metadata will be inherited by all subfolders unless explicitly changed.'
                    }
                  </em>
                </div> */}
              </>
            );
          })()} 
        </div>
        
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
          {/* <button 
            onClick={toggleFolderView}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            {showAllFolders ? 'Show Subject Folders Only' : 'Show All Folders with Hierarchy'}
          </button> */}
        </div>
        {foldersToRender.length === 0 ? (
          <div className="p-8 text-center text-gray-300">
            <p className="text-lg font-semibold mb-2">No folders to show</p>
            <p className="text-sm">Either manually sync the folders or check MongoDB.</p>
          </div>
        ) : (
          <ul className="ml-2">
            {foldersToRender.map(folder => renderFolder(folder))}
          </ul>
        )}
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
      let formValues;
      const isSub = isSubfolder(selectedFolder.gdriveId);
      if (isSub) {
        const parentFolder = findParentFolder(selectedFolder.gdriveId, subjectFolders);
        formValues = {
          name: selectedFolder.name || '',
          description: selectedFolder.description || parentFolder?.description || '',
          years: Array.isArray(selectedFolder.years) && selectedFolder.years.length > 0
            ? selectedFolder.years.map(String)
            : (Array.isArray(parentFolder?.years) ? parentFolder.years.map(String) : []),
          departments: Array.isArray(selectedFolder.departments) && selectedFolder.departments.length > 0
            ? selectedFolder.departments
            : (Array.isArray(parentFolder?.departments) ? parentFolder.departments : []),
          semesters: Array.isArray(selectedFolder.semesters) && selectedFolder.semesters.length > 0
            ? selectedFolder.semesters.map(String)
            : (Array.isArray(parentFolder?.semesters) ? parentFolder.semesters.map(String) : []),
          tags: Array.isArray(selectedFolder.tags) && selectedFolder.tags.length > 0
            ? selectedFolder.tags.join(', ')
            : (Array.isArray(parentFolder?.tags) ? parentFolder.tags.join(', ') : ''),
          accessControlTags: Array.isArray(selectedFolder.accessControlTags) && selectedFolder.accessControlTags.length > 0
            ? selectedFolder.accessControlTags.join(', ')
            : (Array.isArray(parentFolder?.accessControlTags) ? parentFolder.accessControlTags.join(', ') : ''),
        };
        setSelectedAccessTags(Array.isArray(formValues.accessControlTags) ? formValues.accessControlTags : []);
      } else {
        formValues = {
          name: selectedFolder.name || '',
          description: selectedFolder.description || '',
          years: Array.isArray(selectedFolder.years) && selectedFolder.years.length > 0
            ? selectedFolder.years.map(String)
            : [],
          departments: Array.isArray(selectedFolder.departments) && selectedFolder.departments.length > 0
            ? selectedFolder.departments
            : [],
          semesters: Array.isArray(selectedFolder.semesters) && selectedFolder.semesters.length > 0
            ? selectedFolder.semesters.map(String)
            : [],
          tags: Array.isArray(selectedFolder.tags) && selectedFolder.tags.length > 0
            ? selectedFolder.tags.join(', ')
            : '',
          accessControlTags: Array.isArray(selectedFolder.accessControlTags) && selectedFolder.accessControlTags.length > 0
            ? selectedFolder.accessControlTags.join(', ')
            : '',
        };
        setSelectedAccessTags(Array.isArray(selectedFolder.accessControlTags) ? selectedFolder.accessControlTags : []);
      }
      setEditForm(formValues);
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

  // Helper to map selected semesters to years
  const getYearsFromSemesters = (semestersArr) => {
    const yearsSet = new Set();
    semestersArr.forEach(sem => {
      const semNum = Number(sem);
      if (semNum >= 1 && semNum <= 8) {
        const year = Math.ceil(semNum / 2);
        yearsSet.add(String(year));
      }
    });
    return Array.from(yearsSet);
  };

  // Helper to map selected years to semesters
  const getSemestersFromYears = (yearsArr) => {
    // yearsArr: array of string numbers
    const semestersSet = new Set();
    yearsArr.forEach(year => {
      const yearNum = Number(year);
      if (yearNum >= 1 && yearNum <= 4) {
        semestersSet.add(String((yearNum - 1) * 2 + 1));
        semestersSet.add(String((yearNum - 1) * 2 + 2));
      }
    });
    return Array.from(semestersSet);
  };

  const handleEditFolderChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setEditForm(prev => {
        const currentValues = [...prev[name]];
        let updatedForm = { ...prev };
        if (checked) {
          if (!currentValues.includes(value)) {
            updatedForm[name] = [...currentValues, value];
          }
        } else {
          updatedForm[name] = currentValues.filter(val => val !== value);
        }

        // If semester changed, auto-select years
        if (name === 'semesters') {
          const semestersArr = updatedForm.semesters;
          const autoYears = getYearsFromSemesters(semestersArr);
          updatedForm.years = autoYears;
        }
        // If years changed, auto-select semesters
        if (name === 'years') {
          const yearsArr = updatedForm.years;
          const autoSemesters = getSemestersFromYears(yearsArr);
          updatedForm.semesters = autoSemesters;
        }
        return updatedForm;
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

    // Check if this folder has subfolders and if metadata has changed
    const folderHasSubfolders = hasSubfolders(selectedFolder.gdriveId);
    
    // Check if the metadata has actually changed from what was originally set for this folder
    const originalFolder = findFolderById(selectedFolder.gdriveId, allFolders);
    
    // Helper function to safely compare arrays
    const arraysEqual = (arr1, arr2) => {
      const a1 = (arr1 || []).map(String).sort();
      const a2 = (arr2 || []).map(String).sort();
      return JSON.stringify(a1) === JSON.stringify(a2);
    };
    
    const hasMetadataChanges = (
      !arraysEqual(updateData.departments, originalFolder.departments) ||
      !arraysEqual(updateData.years, originalFolder.years) ||
      !arraysEqual(updateData.semesters, originalFolder.semesters) ||
      !arraysEqual(updateData.tags, originalFolder.tags) ||
      !arraysEqual(updateData.accessControlTags, originalFolder.accessControlTags) ||
      updateData.description !== (originalFolder.description || '')
    );

    // If this folder has subfolders and metadata has changed, show propagation modal
    if (folderHasSubfolders && hasMetadataChanges) {
      setPendingUpdateData(updateData);
      setShowPropagationModal(true);
      return;
    }

    // Otherwise, proceed with normal update
    await performFolderUpdate(updateData, false);
  };

  const performFolderUpdate = async (updateData, propagateToSubfolders = false) => {
    try {
      setIsBulkUpdating(propagateToSubfolders);
      
      // Use gdriveId instead of id for folder identification
      const response = await folderAPI.updateFolder(selectedFolder.gdriveId, updateData);
      
      // If propagating to subfolders, update each subfolder
      if (propagateToSubfolders) {
        const folder = findFolderById(selectedFolder.gdriveId, allFolders);
        const descendantFolders = getAllDescendantFolders(folder);
        
        setBulkUpdateProgress({ current: 0, total: descendantFolders.length });
        
        let successCount = 0;
        let failedFolders = [];
        
        for (let i = 0; i < descendantFolders.length; i++) {
          const descendant = descendantFolders[i];
          try {
            setBulkUpdateProgress({ current: i + 1, total: descendantFolders.length });
            await folderAPI.updateFolder(descendant.gdriveId, {
              ...updateData,
              name: descendant.name // Keep original name for each subfolder
            });
            successCount++;
          } catch (error) {
            console.error(`Failed to update subfolder ${descendant.name}:`, error);
            failedFolders.push(descendant.name);
          }
        }
        
        if (failedFolders.length > 0) {
          toast.error(`Failed to update ${failedFolders.length} subfolder(s): ${failedFolders.join(', ')}`);
        }
        if (successCount > 0) {
          toast.success(`Successfully updated ${successCount} subfolder(s)`);
        }
      }
      
      // Emit socket.io event for real-time updates to other admins and clients
      socketService.emitFolderUpdate({
        folderId: selectedFolder.gdriveId,
        name: updateData.name,
        updatedAt: new Date().toISOString(),
        action: 'updated'
      });
      
      const message = propagateToSubfolders 
        ? 'Folder and subfolders update completed!'
        : 'Folder updated successfully! Metadata will be inherited by subfolders.';
      toast.success(message);
      
      setShowEditModal(false);
      setSelectedFolder(null);
      setSelectedAccessTags([]);
      setShowPropagationModal(false);
      setPendingUpdateData(null);
      setIsBulkUpdating(false);
      setBulkUpdateProgress({ current: 0, total: 0 });
      
      // Always re-fetch folders after update to get latest parent metadata
      await fetchGDriveFolders();
    } catch (error) {
      setIsBulkUpdating(false);
      setBulkUpdateProgress({ current: 0, total: 0 });
      
      // If error is AxiosError and status is 500, but update seems successful, show warning
      if (error?.response?.status === 500) {
        toast.success('Folder updated');
        setShowEditModal(false);
        setSelectedFolder(null);
        setSelectedAccessTags([]);
        setShowPropagationModal(false);
        setPendingUpdateData(null);
        await fetchGDriveFolders();
      } else {
        console.error('Error updating folder:', error);
        toast.error('Failed to update folder');
      }
    }
  };

  const handlePropagationChoice = async (propagate) => {
    if (pendingUpdateData) {
      await performFolderUpdate(pendingUpdateData, propagate);
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
      
      {/* Multiple Base Folders Info */}
      <MultipleFoldersInfo />
      
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-6">
        <div className="mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Folders</h2>
            <p className="text-yellow-400 text-sm">Subject folders and their subfolders. Subfolders inherit metadata from their parent unless explicitly changed.</p>
          </div>
          <div>
            {/* <button 
              onClick={toggleFolderView}
              className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm transition-colors"
            >
              {showAllFolders ? "Show Subject Folders Only" : "Show All Folders"}
            </button> */}
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
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-700 relative">
            {/* Close button in top-right corner, above header */}
            <button
              type="button"
              className="absolute top-4 right-4 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 z-10"
              onClick={() => setShowEditModal(false)}
              aria-label="Close"
            >
              X
            </button>
            <h2 className="text-xl font-bold text-white mb-4">
              {isSubfolder(selectedFolder.gdriveId) ? 'Edit Subfolder Metadata' : 'Edit Subject Folder Metadata'}
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              {isSubfolder(selectedFolder.gdriveId) 
                ? 'This subfolder inherits metadata from its parent unless explicitly changed. Values shown below include inherited data.'
                : 'Changes to this metadata will be inherited by all subfolders unless they have explicit metadata set.'
              }
            </p>
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
                        checked={editForm.departments.includes(dept) || (isSubfolder(selectedFolder.gdriveId) && (!editForm.departments.length && findParentFolder(selectedFolder.gdriveId, subjectFolders)?.departments?.includes(dept)))}
                        onChange={handleEditFolderChange}
                        className="mr-2 h-4 w-4 rounded border-gray-500 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor={`dept-${dept}`} className="text-white">{dept}</label>
                      {isSubfolder(selectedFolder.gdriveId) && !editForm.departments.length && findParentFolder(selectedFolder.gdriveId, subjectFolders)?.departments?.includes(dept) && (
                        <span className="text-blue-400 text-xs ml-1">(inherited)</span>
                      )}
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
                        checked={editForm.years.map(String).includes(String(year)) || (isSubfolder(selectedFolder.gdriveId) && (!editForm.years.length && findParentFolder(selectedFolder.gdriveId, subjectFolders)?.years?.map(String).includes(String(year))))}
                        onChange={handleEditFolderChange}
                        className="mr-2 h-4 w-4 rounded border-gray-500 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor={`year-${year}`} className="text-white">Year {year}</label>
                      {isSubfolder(selectedFolder.gdriveId) && !editForm.years.length && findParentFolder(selectedFolder.gdriveId, subjectFolders)?.years?.map(String).includes(String(year)) && (
                        <span className="text-blue-400 text-xs ml-1">(inherited)</span>
                      )}
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
                        checked={editForm.semesters.map(String).includes(String(semester)) || (isSubfolder(selectedFolder.gdriveId) && (!editForm.semesters.length && findParentFolder(selectedFolder.gdriveId, subjectFolders)?.semesters?.map(String).includes(String(semester))))}
                        onChange={handleEditFolderChange}
                        className="mr-2 h-4 w-4 rounded border-gray-500 text-primary-600 focus:ring-primary-500"
                      />
                      <label htmlFor={`semester-${semester}`} className="text-white">Sem {semester}</label>
                      {isSubfolder(selectedFolder.gdriveId) && !editForm.semesters.length && findParentFolder(selectedFolder.gdriveId, subjectFolders)?.semesters?.map(String).includes(String(semester)) && (
                        <span className="text-blue-400 text-xs ml-1">(inherited)</span>
                      )}
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
      
      {/* Propagation Modal */}
      {showPropagationModal && selectedFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-lg w-full p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Apply Changes to Subfolders?</h2>
            <p className="text-gray-300 mb-4">
              This folder has subfolders. Do you want to apply these metadata changes to:
            </p>
            
            {/* Show affected subfolders */}
            {(() => {
              const folder = findFolderById(selectedFolder.gdriveId, allFolders);
              const descendantFolders = getAllDescendantFolders(folder);
              return descendantFolders.length > 0 && (
                <div className="mb-4 p-3 bg-gray-700 rounded">
                  <p className="text-white font-medium mb-2">Subfolders that will be affected:</p>
                  <div className="max-h-32 overflow-y-auto">
                    <ul className="text-sm text-gray-300 space-y-1">
                      {descendantFolders.map((subfolder, index) => (
                        <li key={subfolder.gdriveId} className="flex items-center">
                          <span className="w-4 h-4 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center mr-2">
                            {index + 1}
                          </span>
                          {subfolder.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Total: {descendantFolders.length} subfolder(s)</p>
                </div>
              );
            })()}
            
            <div className="space-y-3 mb-6">
              <div className="p-3 bg-gray-700 rounded border-l-4 border-blue-500">
                <p className="text-white font-medium">This folder only</p>
                <p className="text-gray-400 text-sm">Subfolders will inherit these changes automatically unless they have their own explicit metadata.</p>
              </div>
              <div className="p-3 bg-gray-700 rounded border-l-4 border-orange-500">
                <p className="text-white font-medium">This folder and all subfolders</p>
                <p className="text-gray-400 text-sm">All subfolders will be explicitly updated with these same metadata values, overriding any existing subfolder-specific metadata.</p>
              </div>
            </div>
            {/* Progress indicator for bulk updates */}
            {isBulkUpdating && (
              <div className="mb-4 p-3 bg-gray-700 rounded">
                <p className="text-white font-medium mb-2">Updating subfolders...</p>
                <div className="w-full bg-gray-600 rounded-full h-2">
                  <div 
                    className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${bulkUpdateProgress.total > 0 ? (bulkUpdateProgress.current / bulkUpdateProgress.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <p className="text-sm text-gray-300 mt-1">
                  {bulkUpdateProgress.current} of {bulkUpdateProgress.total} folders updated
                </p>
              </div>
            )}
            
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                onClick={() => {
                  setShowPropagationModal(false);
                  setPendingUpdateData(null);
                }}
                disabled={isBulkUpdating}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handlePropagationChoice(false)}
                disabled={isBulkUpdating}
              >
                This Folder Only
              </button>
              <button
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={() => handlePropagationChoice(true)}
                disabled={isBulkUpdating}
              >
                {isBulkUpdating && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                All Subfolders
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
