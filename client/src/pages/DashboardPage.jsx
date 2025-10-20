import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  MoveUp,
  BookOpen,
  GraduationCap,
  Notebook,
  TrendingUp,
  
  Folder,
} from "lucide-react";
import { pdfAPI, folderAPI } from "../api";
import { useAuth } from "../contexts/AuthContext";
import PDFCard from "../components/PDFCard";
import SecurePDFViewer from "../components/SecurePDFViewer";
import FileViewer from "../components/FileViewer";
import toast from "react-hot-toast";
import socketService from "../services/socketService";

// Custom debounce function
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

// Simple loading spinner
const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-4 border-t-blue-500 mx-auto"></div>
    <span className="ml-4 text-white/80">Loading...</span>
  </div>
);

const DashboardPage = () => {
  // Academic year calculation (e.g., 25-26)
  const getAcademicYear = () => {
    const now = new Date();
    let year = now.getFullYear();
    let startYear, endYear;
    // Academic year starts in July (adjust as needed)
    if (now.getMonth() >= 6) {
      startYear = year % 100;
      endYear = (year + 1) % 100;
    } else {
      startYear = (year - 1) % 100;
      endYear = year % 100;
    }
    return `${startYear.toString().padStart(2, '0')}-${endYear.toString().padStart(2, '0')}`;
  };
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [recentFiles, setRecentFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({});
  const [selectedFile, setSelectedFile] = useState(null); // { id, url, name, type }
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  });
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderHierarchy, setFolderHierarchy] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [accessibleFolders, setAccessibleFolders] = useState([]);
  const isProgrammaticNavigation = useRef(false);
  
  let isLoadingDashboardData = false;

  const loadDashboardData = async () => {
    if (isLoadingDashboardData) return; // Prevent duplicate requests

    isLoadingDashboardData = true;
    try {
      setIsLoading(true);

      // Load recent PDFs and initial PDF list
      const [recentResponse, filesResponse] = await Promise.all([
        pdfAPI.getRecentPDFs(5),
        pdfAPI.getPDFs({ page: 1, limit: 12 }),
      ]);

      if (recentResponse.data.recentPdfs) {
        setRecentFiles(recentResponse.data.recentPdfs);
      }

      if (filesResponse.data.pdfs) {
        setFiles(filesResponse.data.pdfs);
        setPagination(filesResponse.data.pagination);
      }

      // Fetch folder structure
      await fetchFolders();
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
      isLoadingDashboardData = false;
    }
  };

  const debouncedLoadDashboardData = debounce(loadDashboardData, 300);

  // Load files (all types) when filters change - defined before it's used
  const loadFiles = useCallback(async () => {
    try {
      const params = {
        page: pagination.currentPage,
        limit: 12
        // No subject/folder filter
      };

      const response = await pdfAPI.getPDFs(params); // This API should return all file types

      if (response.data.pdfs) {
        setFiles(response.data.pdfs);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error loading files:", error);
      toast.error("Failed to load files");
    }
  }, [pagination.currentPage]);

  // Handle modal state for body class
  useEffect(() => {
    if (isViewerOpen) {
      document.body.classList.add('modal-open');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    };
  }, [isViewerOpen]);

  // Get URL params and location
  const { folderId } = useParams();
  const location = useLocation();
  
  // Load initial data and handle direct folder access from URL
  useEffect(() => {
    if (folderId) {
      // If we have a folder ID in the URL, wait for folder hierarchy to load first
      const loadFolderFromUrl = async () => {
        await loadDashboardData();
        // Find the folder info from hierarchy by matching the folder ID
        const findFolderById = (folders, targetId) => {
          for (const folder of folders) {
            if (folder.id === targetId) {
              return folder;
            }
            if (folder.children && folder.children.length > 0) {
              const found = findFolderById(folder.children, targetId);
              if (found) return found;
            }
          }
          return null;
        };
        
        const folderInfo = findFolderById(folderHierarchy, folderId);
        if (folderInfo) {
          navigateToFolder(folderInfo.id, folderInfo.name);
        } else {
          // If folder not found, navigate back to dashboard
          isProgrammaticNavigation.current = true;
          navigate('/dashboard');
        }
      };
      loadFolderFromUrl();
    } else {
      loadDashboardData();
    }
  }, [folderId]);
  
  // Set up socket.io listeners for real-time updates
  useEffect(() => {
    const handleFolderUpdate = (folderData) => {
      console.log('Folder updated in dashboard:', folderData);
      // Refresh folder hierarchy and current files if the updated folder is related
      loadDashboardData();
    };
    
    const handlePdfUpdate = (pdfData) => {
      console.log('PDF updated in dashboard:', pdfData);
      // Refresh file list
      loadFiles();
      // If this PDF is in the recent files list, refresh that too
      const isInRecentFiles = recentFiles.some(file => file._id === pdfData.pdfId);
      if (isInRecentFiles) {
        loadDashboardData();
      }
    };
    
    // Register socket event listeners
    socketService.on('folder:updated', handleFolderUpdate);
    socketService.on('pdf:updated', handlePdfUpdate);
    
    // Clean up listeners when component unmounts
    return () => {
      socketService.off('folder:updated');
      socketService.off('pdf:updated');
    };
  }, [loadFiles, recentFiles]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  // Handle back/forward navigation
  const handleLocationChange = useCallback(() => {
      // If this is a programmatic navigation, reset the flag and don't process
      if (isProgrammaticNavigation.current) {
        isProgrammaticNavigation.current = false;
        return;
      }
      
      const path = location.pathname;
      
      if (path === '/dashboard') {
        // Only update if we're not already at the root
        if (selectedFolder !== null || currentPath.length > 0) {
          setSelectedFolder(null);
          setFiles([]);
          setCurrentPath([]);
          loadDashboardData();
        }
        return;
      }
      
      if (path.startsWith('/dashboard/folder/')) {
        // Make sure folder hierarchy is loaded
        if (folderHierarchy.length === 0) {
          return;
        }
        
        // Extract the folder ID from URL
        const urlFolderId = path.replace('/dashboard/folder/', '');
        
        // Don't update if we're already on this folder
        if (urlFolderId === selectedFolder) {
          return;
        }
        
        // Find folder by ID and build path
        const findFolderAndBuildPath = (folders, targetId, currentPath = []) => {
          for (const folder of folders) {
            if (folder.id === targetId) {
              return [...currentPath, { id: folder.id, name: folder.name }];
            }
            if (folder.children && folder.children.length > 0) {
              const path = findFolderAndBuildPath(folder.children, targetId, [...currentPath, { id: folder.id, name: folder.name }]);
              if (path) return path;
            }
          }
          return null;
        };
        
        const folderPath = findFolderAndBuildPath(folderHierarchy, urlFolderId);
        if (folderPath) {
          setSelectedFolder(urlFolderId);
          setCurrentPath(folderPath);
          fetchFilesInFolder(urlFolderId);
        }
      }
  }, [folderHierarchy, selectedFolder, currentPath, loadDashboardData]);

  useEffect(() => {
    handleLocationChange();
  }, [location.pathname, handleLocationChange]);

        // Listen for refresh event from Header logo click
        useEffect(() => {
          const refreshHandler = () => {
            debouncedLoadDashboardData();
          };
          window.addEventListener('refresh-available-subjects', refreshHandler);
          // Listen for dashboard-home event to reset folder state and refresh subjects
          const homeHandler = () => {
            setSelectedFolder(null);
            setFiles([]);
            setCurrentPath([]);
            debouncedLoadDashboardData();
          };
          window.addEventListener('dashboard-home', homeHandler);
          return () => {
            window.removeEventListener('refresh-available-subjects', refreshHandler);
            window.removeEventListener('dashboard-home', homeHandler);
          };
        }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    try {
      setIsLoading(true);

      // Include search query and pagination only
      const searchParams = {
        q: searchQuery.trim(),
        page: 1,
        limit: 12
      };

      console.log("Dashboard searching with params:", searchParams);

      const response = await pdfAPI.searchPDFs(searchParams);

      if (response.data?.files) {
        const files = Array.isArray(response.data.files) ? response.data.files : [];
        setFiles(files);
        // Use response pagination if available, otherwise calculate based on results
        setPagination({
          currentPage: response.data.pagination?.currentPage || 1,
          totalPages: response.data.pagination?.totalPages || Math.ceil(files.length / 12),
          totalCount: response.data.pagination?.totalCount || files.length,
        });

        if (!response.data.files || response.data.files.length === 0) {
          toast(`No files found matching your search criteria`);
        } else {
          toast.success(`Found ${response.data.files.length} file(s)`);
          // If only one file is found, navigate to its folder/subfolder
          if (response.data.files.length === 1) {
            const file = response.data.files[0];
            // Try to find the folder/subfolder in the hierarchy
            if (file.parents && file.parents.length > 0) {
              // Use the first parent as the folder ID
              const parentId = file.parents[0];
              // Find the folder name from the hierarchy
              const findFolderName = (folders, id) => {
                for (const folder of folders) {
                  if (folder.id === id) return folder.name;
                  if (folder.children && folder.children.length > 0) {
                    const name = findFolderName(folder.children, id);
                    if (name) return name;
                  }
                }
                return null;
              };
              const folderName = findFolderName(folderHierarchy, parentId) || "Folder";
              navigateToFolder(parentId, folderName);
            }
          }
        }
      } else {
        setFiles([]);
        setPagination({ currentPage: 1, totalPages: 1, totalCount: 0 });
        toast("No results found");
      }
    } catch (error) {
      console.error("Search error:", error);
      const errorMessage =
        error.response?.data?.error || error.message || "Search failed";
      toast.error(`Search failed: ${errorMessage}`);
      setFiles([]);
      setPagination({ currentPage: 1, totalPages: 1, totalCount: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery("");
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    // Reload the default PDFs
    loadDashboardData();
  };

  // Handles view for any file type
  const handleViewFile = (file) => {
    setSelectedFile(file);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedFile(null);
  };

  const changePage = (newPage) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  useEffect(() => {
    // Fetch folders when component mounts
    fetchFolders();
  }, []);

  const fetchFolders = async () => {
      // Attach metadata to all folders and subfolders recursively using provided map
      const attachMetadataRecursively = (folders, metadataMap) => {
        return folders.map(folder => {
          const metadata = metadataMap.get(folder.gdriveId) || null;
          let children = [];
          if (Array.isArray(folder.children) && folder.children.length > 0) {
            children = attachMetadataRecursively(folder.children, metadataMap);
          }
          return {
            ...folder,
            metadata,
            children
          };
        });
      };
      // Debug: log metadata attachment
      const debugLogMetadata = (folders, level = 0) => {
        folders.forEach(folder => {
          const indent = ' '.repeat(level * 2);
          console.log(`${indent}Folder: ${folder.name}, gdriveId: ${folder.gdriveId}, hasMetadata: ${!!folder.metadata}`);
          if (folder.children && folder.children.length > 0) {
            debugLogMetadata(folder.children, level + 1);
          }
        });
      };
    try {
      // Get folders from Google Drive with hierarchy
      const gdriveResponse = await folderAPI.getFolders();
      const allFolders = gdriveResponse.data;
      // Get folder metadata from MongoDB for access control
      const metadataResponse = await folderAPI.getFoldersWithMetadata();
      const folderMetadata = metadataResponse.data;
      // Create a map of folder metadata by gdriveId
      const metadataMap = new Map();
      const addToMapRecursively = (node) => {
        if (!node || typeof node !== 'object') return;
        if (node.gdriveId) {
          metadataMap.set(node.gdriveId, node);
        }
        if (Array.isArray(node.children) && node.children.length > 0) {
          node.children.forEach(addToMapRecursively);
        }
      };
      folderMetadata.forEach(addToMapRecursively);
      // Attach metadata and debug log after allFolders is defined
      const foldersWithMetadata = attachMetadataRecursively(allFolders, metadataMap);
      // Step 1: First pass to collect all accessible folders regardless of hierarchy
      const accessibleFolderIds = new Set();
      const collectAccessibleFolders = (folders) => {
        folders.forEach(folder => {
          const metadata = folder.metadata;
          const hasAccess = metadata && checkFolderAccess(metadata, user);
          if (hasAccess) {
            accessibleFolderIds.add(folder.id);
          }
          if (Array.isArray(folder.children) && folder.children.length > 0) {
            collectAccessibleFolders(folder.children);
          }
        });
      };
      collectAccessibleFolders(foldersWithMetadata);
      // Step 2: Second pass to build a modified hierarchy
      const filterFoldersRecursively = (folders, parentIsAccessible = true) => {
        const result = [];
        for (const folder of folders) {
          const hasAccess = accessibleFolderIds.has(folder.id);
          const metadata = folder.metadata;
          let children = [];
          if (Array.isArray(folder.children) && folder.children.length > 0) {
            children = filterFoldersRecursively(folder.children, hasAccess);
          }
          if (hasAccess) {
            result.push({
              ...folder,
              metadata: metadata || null,
              children: children
            });
          } else if (!parentIsAccessible && children.length > 0) {
            // Recursively promote all accessible descendants to root
            const promoted = children.filter(child => accessibleFolderIds.has(child.id) || (child.children && child.children.length > 0));
            promoted.forEach(promotedFolder => {
              console.log(`Promoting folder to root: ${promotedFolder.name} (gdriveId: ${promotedFolder.gdriveId}) due to inaccessible parent: ${folder.name}`);
              result.push(promotedFolder);
            });
          } else if (parentIsAccessible && children.length > 0) {
            result.push({
              ...folder,
              metadata: metadata || null,
              children: children,
              isPlaceholder: true
            });
          }
        }
        return result;
      };
      const filteredFolders = filterFoldersRecursively(foldersWithMetadata);
      // Build folder hierarchy
      const hierarchy = buildFolderHierarchy(filteredFolders);
      // Flatten hierarchy to get accessible folders for quick access
      const flattenFolders = (folders) => {
        let result = [];
        folders.forEach(folder => {
          result.push(folder);
          if (folder.children && folder.children.length > 0) {
            result = result.concat(flattenFolders(folder.children));
          }
        });
        return result;
      };
      const accessibleFoldersFlat = flattenFolders(hierarchy);
      setFolderHierarchy(hierarchy);
      setAccessibleFolders(accessibleFoldersFlat);
      if (hierarchy.length === 0) {
        // No folders in hierarchy after building
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
      toast.error("Failed to load subjects");
    }
  };
  
  // Check if user has access to a folder based on access control
  const checkFolderAccess = (folderMetadata, user) => {
    // Only allow access for year 1-4 and semester 1-8
    const userYear = parseInt(user.year);
    const userSemester = parseInt(user.semester);
    if (isNaN(userYear) || userYear < 1 || userYear > 4) {
      // console.log(`Access DENIED: Year ${userYear} is not in allowed range 1-4.`);
      return false;
    }
    if (isNaN(userSemester) || userSemester < 1 || userSemester > 8) {
      // console.log(`Access DENIED: Semester ${userSemester} is not in allowed range 1-8.`);
      return false;
    }
    // Hide folders with no metadata
    if (!folderMetadata) {
      // console.log('Access DENIED: No metadata for folder');
      return false;
    }
    // All three must match if metadata is present
    const userDepartment = String(user.department || '').trim();
    const hasDepartmentRestrictions = folderMetadata.departments && folderMetadata.departments.length > 0;
    const hasYearRestrictions = folderMetadata.years && folderMetadata.years.length > 0;
    const hasSemesterRestrictions = folderMetadata.semesters && folderMetadata.semesters.length > 0;
    // If any restriction is missing, deny access
    if (!hasDepartmentRestrictions || !hasYearRestrictions || !hasSemesterRestrictions) {
      // console.log('Access DENIED: Missing department/year/semester restrictions in metadata');
      return false;
    }
    // If year or semester is [0] (only 0, not mixed), do not show folder
    const onlyYearZero = folderMetadata.years.length === 1 && folderMetadata.years[0] === 0;
    const onlySemesterZero = folderMetadata.semesters.length === 1 && folderMetadata.semesters[0] === 0;
    if (onlyYearZero || onlySemesterZero) {
      // console.log('Access DENIED: Year or Semester is only 0 (do not show to any user)');
      return false;
    }
    // Check department
    const departmentCheck = userDepartment && folderMetadata.departments.some(dept => 
      String(dept).trim().toLowerCase() === userDepartment.toLowerCase()
    );
    if (!departmentCheck) {
      // console.log('Access DENIED: Department does not match');
      return false;
    }
    // Check year
    let yearCheck = false;
    if (folderMetadata.years.includes(0)) {
      yearCheck = userYear >= 1 && userYear <= 4;
    } else {
      yearCheck = folderMetadata.years.includes(userYear);
    }
    if (!yearCheck) {
      // console.log('Access DENIED: Year does not match');
      return false;
    }
    // Check semester
    let semesterCheck = false;
    if (folderMetadata.semesters.includes(0)) {
      semesterCheck = userSemester >= 1 && userSemester <= 8;
    } else {
      semesterCheck = folderMetadata.semesters.includes(userSemester);
    }
    if (!semesterCheck) {
      // console.log('Access DENIED: Semester does not match');
      return false;
    }
    // Access tags (optional)
    const hasAccessTagRestrictions = folderMetadata.accessControlTags && folderMetadata.accessControlTags.length > 0;
    if (hasAccessTagRestrictions && user.accessTags && user.accessTags.length > 0) {
      const hasRequiredTag = folderMetadata.accessControlTags.some(tag => 
        user.accessTags.includes(tag)
      );
      if (!hasRequiredTag) {
        // console.log('Access DENIED: Access tag does not match');
        return false;
      }
    }
    // All checks passed
    return true;
  }
  
  // Build folder hierarchy for nested display
  const buildFolderHierarchy = (folders) => {
    // Debug: log promoted folders
    const debugLogPromoted = (folders, level = 0) => {
      folders.forEach(folder => {
        const indent = ' '.repeat(level * 2);
        // console.log(`${indent}Promoted/Root: ${folder.name}, id: ${folder.id}, hasMetadata: ${!!folder.metadata}`);
        if (folder.children && folder.children.length > 0) {
          debugLogPromoted(folder.children, level + 1);
        }
      });
    };
    // Helper: use unified access check for current user
    const isAccessibleFolder = (folder) => {
      return checkFolderAccess(folder.metadata, user);
    };

    // Recursively build hierarchy, promoting accessible children if parent is not accessible
    const promoteAccessibleFolders = (folders) => {
      let result = [];
      folders.forEach(folder => {
        const children = Array.isArray(folder.children) ? promoteAccessibleFolders(folder.children) : [];
        if (isAccessibleFolder(folder)) {
          // Accessible parent, keep as is
          result.push({ ...folder, children });
        } else if (children.length > 0) {
          // Inaccessible parent, promote accessible children to this level
          result = result.concat(children);
        }
        // If not accessible and no accessible children, skip
      });
      return result;
    };

    // Build hierarchy as before
    const folderMap = new Map();
    const rootFolders = [];
    folders.forEach(folder => {
      if (!folder.id) return;
      const folderWithChildren = { 
        ...folder, 
        children: Array.isArray(folder.children) ? [...folder.children] : [] 
      };
      folderMap.set(folder.id, folderWithChildren);
    });
    folders.forEach(folder => {
      if (!folder.id) return;
      const folderNode = folderMap.get(folder.id);
      if (!folderNode) return;
      if (folder.parent && folderMap.has(folder.parent)) {
        const parentFolder = folderMap.get(folder.parent);
        if (!Array.isArray(parentFolder.children)) parentFolder.children = [];
        parentFolder.children.push(folderNode);
      } else {
        rootFolders.push(folderNode);
      }
    });
    // Promote accessible folders to root if parent is not accessible
  let promoted = promoteAccessibleFolders(rootFolders);
  debugLogPromoted(promoted);
    // Sort children alphabetically
    const sortFolderChildren = (folders) => {
      folders.forEach(folder => {
        if (folder.children && folder.children.length > 0) {
          folder.children.sort((a, b) => a.name.localeCompare(b.name));
          sortFolderChildren(folder.children);
        }
      });
    };
    promoted.sort((a, b) => a.name.localeCompare(b.name));
    sortFolderChildren(promoted);
    return promoted;
  };

  const fetchFilesInFolder = async (folderId) => {
    try {
      setIsLoading(true);
      const response = await folderAPI.getFilesInFolder(folderId);
      setFiles(response.data);
    } catch (error) {
      console.error('Failed to load files:', error);
      toast.error("Failed to load files");
    } finally {
      setIsLoading(false);
    }
  };
  
  const navigate = useNavigate();
  
  // Navigate to a folder (handles both root and nested folders)
  const navigateToFolder = (folderId, folderName) => {
    // Find the complete path to this folder
    const findFolderPath = (folders, targetId, currentPath = []) => {
      for (const folder of folders) {
        if (folder.id === targetId) {
          return [...currentPath, { id: folder.id, name: folder.name }];
        }
        if (folder.children && folder.children.length > 0) {
          const path = findFolderPath(folder.children, targetId, [...currentPath, { id: folder.id, name: folder.name }]);
          if (path) return path;
        }
      }
      return null;
    };
    
    // Always find the complete path from root to target folder
    const completePath = findFolderPath(folderHierarchy, folderId);
    
    if (completePath) {
      setCurrentPath(completePath);
      setSelectedFolder(folderId);
      isProgrammaticNavigation.current = true;
      navigate(`/dashboard/folder/${folderId}`);
      fetchFilesInFolder(folderId);
    } else {
      // Fallback for edge cases
      const fallbackPath = [{ id: folderId, name: folderName }];
      setCurrentPath(fallbackPath);
      setSelectedFolder(folderId);
      isProgrammaticNavigation.current = true;
      navigate(`/dashboard/folder/${folderId}`);
      fetchFilesInFolder(folderId);
    }
  };
  
  // Navigate back in folder hierarchy
  const navigateBack = () => {
    if (currentPath.length > 1) {
      const newPath = currentPath.slice(0, -1);
      const parentFolder = newPath[newPath.length - 1];
      setCurrentPath(newPath);
      setSelectedFolder(parentFolder.id);
      
      isProgrammaticNavigation.current = true;
      navigate(`/dashboard/folder/${parentFolder.id}`);
      fetchFilesInFolder(parentFolder.id);
    } else {
      // Go back to root (show all folders)
      setSelectedFolder(null);
      setFiles([]);
      setCurrentPath([]);
      isProgrammaticNavigation.current = true;
      navigate('/dashboard');
      loadDashboardData();
    }
  };
  
  // Get current folder's subfolders
  const getCurrentSubfolders = () => {
    if (!selectedFolder) return folderHierarchy;
    
    const findFolder = (folders, targetId) => {
      for (const folder of folders) {
        if (folder.id === targetId) return folder;
        if (folder.children && folder.children.length > 0) {
          const found = findFolder(folder.children, targetId);
          if (found) return found;
        }
      }
      return null;
    };
    
    const currentFolder = findFolder(folderHierarchy, selectedFolder);
    
    // Debug information
    // console.log('Current folder:', currentFolder);
    if (currentFolder && currentFolder.children) {
      // console.log('Subfolders found:', currentFolder.children.length);
      // console.log('Subfolder details:', JSON.stringify(currentFolder.children, null, 2));
    } else {
      console.log('No subfolders found for folder ID:', selectedFolder);
    }
    
    // Make sure we return an array even if children is undefined
    return (currentFolder && Array.isArray(currentFolder.children)) ? currentFolder.children : [];
  };

  if (isLoading && files.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1b0b42] via-[#24125a] to-[#2d176b] flex items-center justify-center">
        <div className="text-center bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl px-6 py-8 shadow-lg border border-[rgba(255,255,255,0.15)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white/80">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#1b0b42] via-[#24125a] to-[#2d176b] animate-fade-in duration-700 pt-2"
    >
  {/* Welcome Header */}
  <div className="w-full max-w-7xl mx-auto mt-2 sm:mt-4 lg:mt-8 px-2 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 bg-[rgba(27,11,66,0.7)] backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-[rgba(255,255,255,0.12)]">
  <div className="text-center">
    <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white">
      Welcome back, {user?.name}
    </h1>
    <p className="mt-2 text-xs sm:text-base text-white/80">
      {/* {user?.department} Dept • Year {user?.year} • Semester {user?.semester} */}
    </p>
  </div>
</div>

  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="py-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">

        {/* Year Stat */}
        <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.25)] transition-all text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-600 to-pink-500 rounded-lg flex items-center justify-center">
                <MoveUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-white/80">Year</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{user?.year}</p>
            </div>
          </div>
        </div>

        {/* Semester Stat */}
        <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.25)] transition-all text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-green-600 to-teal-500 rounded-lg flex items-center justify-center">
                <Notebook className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-white/80">Semester</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{user?.semester}</p>
            </div>
          </div>
        </div>

        {/* Department Stat */}
        <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.25)] transition-all text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-white/80">Your Department</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{user?.department}</p>
            </div>
          </div>
        </div>

        {/* Academic Year Stat */}
        <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.25)] transition-all text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-indigo-600 to-purple-500 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-white/80">Academic Year</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{getAcademicYear()}</p>
            </div> 
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      {/*KAJER JINIS THIS IS GOOD WORK HAVE TO FIX IT LATER*/}
      {/*<div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 border border-[rgba(255,255,255,0.15)]">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Bar 
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-white/60" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PDFs in your department..."
              className="block w-full pl-10 pr-3 py-3 bg-transparent border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent text-white placeholder-white/60"
            />
          </div>

          {/* Search Buttons 
          <div className="flex justify-end space-x-2 mt-4">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-500 text-white px-4 py-2 rounded-lg hover:shadow-md transition-all duration-200 transform hover:scale-105"
            >
              Search
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 border border-white/20 text-white/80 rounded-lg hover:bg-white/10 transition-colors"
            >
              Clear
            </button>
          </div>
        </form>

        {/* Info Text 
        <div className="mt-3 text-sm text-white/70 text-center">
          {/* Showing PDFs for {user?.department} Department - Year {user?.year} - Sem {user?.semester} 
        </div>
      </div>*/}

      {/* Breadcrumb Navigation */}
      {currentPath.length > 0 && (
        <div className="mb-4 bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl shadow-lg p-4 border border-[rgba(255,255,255,0.15)]">
          <div className="flex items-center space-x-2 text-white/80 overflow-x-auto pb-2">
            {/* <button
              onClick={() => navigateBack()}
              className="flex items-center hover:text-white transition-colors flex-shrink-0"
            >
              ← Back
            </button> */}
            <span className="text-white/60 flex-shrink-0">/</span>
            <button
              onClick={() => {
                setSelectedFolder(null);
                setFiles([]);
                setCurrentPath([]);
                isProgrammaticNavigation.current = true;
                navigate('/dashboard');
                loadDashboardData();
              }}
              className="hover:text-white transition-colors flex-shrink-0"
            >
              Home
            </button>
            {currentPath.map((pathItem, index) => (
              <React.Fragment key={pathItem.id}>
                <span className="text-white/60 flex-shrink-0">/</span>
                <button
                  onClick={() => {
                    if (index === currentPath.length - 1) return; // Current folder, no action
                    const newPath = currentPath.slice(0, index + 1);
                    setCurrentPath(newPath);
                    setSelectedFolder(pathItem.id);
                    
                    isProgrammaticNavigation.current = true;
                    navigate(`/dashboard/folder/${pathItem.id}`);
                    fetchFilesInFolder(pathItem.id);
                  }}
                  className={`hover:text-white transition-colors flex-shrink-0 ${
                    index === currentPath.length - 1 ? 'text-white font-semibold' : ''
                  }`}
                >
                  {pathItem.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8 bg-gradient-to-br from-[#1b0b42] via-[#24125a] to-[#2d176b] rounded-xl shadow-lg border border-[rgba(255,255,255,0.12)] p-6">

      {/* Subject Folders Grid (Google Drive style) */}
      <div className="">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">
            {selectedFolder ? 'Subfolders' : 'Available Subjects'}
          </h2>
          {selectedFolder && (
            <button
              onClick={navigateBack}
              className="bg-gradient-to-r from-purple-600 to-pink-500 text-white px-4 py-2 rounded-lg hover:shadow-md transition-all duration-200 transform hover:scale-105"
            >
              ← Back
            </button>
          )}
        </div>
        
        {/* Debug info */}
        {/* <div className="mb-4 p-2 bg-black/30 rounded text-xs text-white/70 overflow-auto">
          <div>Current folder: {selectedFolder || 'None (root level)'}</div>
          <div>Path: {currentPath.map(p => p.name).join(' > ') || 'Root'}</div>
          <div>Subfolders count: {getCurrentSubfolders().length}</div>
          <div>Folder hierarchy length: {folderHierarchy.length}</div>
          <div>Is loading: {isLoading ? 'Yes' : 'No'}</div>
        </div> */}
        
        {/* Display current level folders */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {isLoading ? (
            <div className="col-span-full">
              <LoadingSpinner />
            </div>
          ) : getCurrentSubfolders() && getCurrentSubfolders().length > 0 ? (
            getCurrentSubfolders().map(folder => (
              <button
                key={folder.id}
                className={`bg-[rgba(27,11,66,0.7)] border ${folder.isPlaceholder ? 'border-yellow-700 border-dashed' : 'border-gray-700'} rounded-lg p-4 flex flex-col items-center hover:bg-purple-700/80 transition-all duration-200 transform hover:scale-105`}
                onClick={() => navigateToFolder(folder.id, folder.name)}
              >
                <div className="relative">
                  <Folder className={`h-8 w-8 ${folder.isPlaceholder ? 'text-yellow-400' : 'text-blue-400'} mb-2`} />
                  {folder.children && folder.children.length > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-white font-bold">
                      {folder.children.length}
                    </div>
                  )}
                </div>
                <span className="text-white font-semibold text-center">
                  {folder.name}
                  {/* {folder.isPlaceholder && <span className="text-xs block text-yellow-400">(Contains accessible content)</span>} */}
                </span>
                {folder.metadata && (
                  <div className="mt-2 text-xs text-white/60 text-center">
                    {/* {folder.metadata.departments && folder.metadata.departments.length > 0 && (
                      <div>Dept: {folder.metadata.departments.join(', ')}</div>
                    )}
                    {folder.metadata.years && folder.metadata.years.length > 0 && (
                      <div>Year: {folder.metadata.years.join(', ')}</div>
                    )}
                    {folder.metadata.semesters && folder.metadata.semesters.length > 0 && (
                      <div>Sem: {folder.metadata.semesters.join(', ')}</div>
                    )} */}
                  </div>
                )}
                {/* {folder.children && folder.children.length > 0 && (
                  <div className="mt-1 text-xs text-blue-300">
                    {folder.children.length} subfolder{folder.children.length !== 1 ? 's' : ''}
                  </div>
                )} */}
              </button>
            ))
          ) : (
            <div className="col-span-full text-center text-white/70 py-4">
              No subfolders in this directory.
            </div>
          )}
        </div>
        
        {!isLoading && getCurrentSubfolders().length === 0 && !selectedFolder && (
          <div className="text-center text-white/70 py-8">
            No accessible subjects found. Please contact your administrator if you believe this is an error.
          </div>
        )}
      </div>

      {/* File List for selected subject/folder */}
      {selectedFolder && (
        <div className="mt-10">
          <div className="">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                Files in {currentPath.length > 0 ? currentPath[currentPath.length - 1].name : 'Selected Folder'}
              </h2>
              {/* <div className="text-sm text-white/60">
                {isLoading ? 'Loading...' : `${files.length} file${files.length !== 1 ? 's' : ''} found`}
              </div> */}
            </div>
            {/* Show loading spinner inside the Files in section */}
            {isLoading ? (
              <div className="py-8">
                <LoadingSpinner />
              </div>
            ) : files && files.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {files
                  .filter(file => !file.mimeType?.startsWith('application/vnd.google-apps.folder'))
                  .map((file) => {
                    // Determine file type and url
                    const fileName = file.fileName || file.name || file.title || "file";
                    
                    // Use backend's fileType if available, otherwise extract from filename
                    let fileType = file.fileType;
                    if (!fileType && fileName.includes('.')) {
                      fileType = fileName.split('.').pop().toLowerCase();
                    }
                    
                    // For files without extensions, try to infer from mimeType
                    if (!fileType && file.mimeType) {
                      if (file.mimeType === 'application/pdf') fileType = 'pdf';
                      else if (file.mimeType.startsWith('image/')) fileType = file.mimeType.split('/')[1];
                      else if (file.mimeType.startsWith('text/')) fileType = 'txt';
                    }
                    
                    // Default to 'unknown' if we still can't determine the type
                    if (!fileType) fileType = 'unknown';
                    
                    const fileUrl = file.url || file.fileUrl || file.downloadUrl || file.link || file.path;
                    return (
                      <PDFCard
                        key={file._id || file.id || file.name}
                        pdf={file}
                        onView={() => handleViewFile({
                          id: file._id || file.id,
                          url: file._id || file.id,
                          name: fileName,
                          type: fileType,
                          user: user,
                        })}
                      />
                    );
                  })}
              </div>
            ) : (
              !isLoading && (
                <div className="text-center text-white/70 py-8">
                  <BookOpen className="h-12 w-12 text-white/40 mx-auto mb-4" />
                  <p>No files found in this folder.</p>
                  <p className="text-sm mt-2">Files may be located in subfolders or this folder may be empty.</p>
                </div>
              )
            )}
          </div>
        </div>
      )}

</div>

      {/* Recent PDFs */}
      {/* <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Recently Added PDFs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentPdfs && recentPdfs.length > 0 ? (
            recentPdfs.map((pdf) => (
              <PDFCard key={pdf._id} pdf={pdf} onView={() => handleViewPDF(pdf._id)} />
            ))
          ) : (
            <div className="text-white/70">No recent PDFs found.</div>
          )}
        </div>
      </div> */}

      {/* PDF List */}
      {/* <div>
        <h2 className="text-lg font-semibold text-white mb-4">All PDFs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pdfs && pdfs.length > 0 ? (
            pdfs.map((pdf) => (
              <PDFCard key={pdf._id} pdf={pdf} onView={() => handleViewPDF(pdf._id)} />
            ))
          ) : (
            <div className="text-white/70">No PDFs found.</div>
          )
        }
        </div>
      </div> */}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => changePage(pagination.currentPage - 1)}
            disabled={pagination.currentPage === 1}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="mx-2 text-white/70">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <button
            onClick={() => changePage(pagination.currentPage + 1)}
            disabled={pagination.currentPage === pagination.totalPages}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  </div>

  {/* File Viewer Modal */}
  {isViewerOpen && selectedFile && (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60 pt-20 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full p-4 relative max-h-[85vh] overflow-auto">
        <button
          className="absolute top-2 right-2 text-gray-700 hover:text-red-500 text-xl font-bold"
          onClick={handleCloseViewer}
        >
          &times;
        </button>
        {selectedFile.type === "pdf" ? (
          <SecurePDFViewer
            pdfId={selectedFile.id}
            isOpen={isViewerOpen}
            onClose={handleCloseViewer}
            user={user}
          />
        ) : (
          <FileViewer fileUrl={selectedFile.url} fileName={selectedFile.name} />
        )}
      </div>
    </div>
  )}
</div>

  );
};

export default DashboardPage;
