import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  BookOpen,
  Clock,
  TrendingUp,
  Plus,
  Folder,
} from "lucide-react";
import { pdfAPI, folderAPI } from "../api";
import { useAuth } from "../contexts/AuthContext";
import PDFCard from "../components/PDFCard";
import SecurePDFViewer from "../components/SecurePDFViewer";
import toast from "react-hot-toast";

const DashboardPage = () => {
  const { user } = useAuth();
  const [pdfs, setPdfs] = useState([]);
  const [recentPdfs, setRecentPdfs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    // Removed department and year filters since backend handles user restrictions
    subject: "",
  });
  const [selectedPdfId, setSelectedPdfId] = useState(null);
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

  // Remove unused filter variables since backend handles user department/year restrictions

  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Load PDFs when filters change
  const loadPDFs = useCallback(async () => {
    try {
      const params = {
        page: pagination.currentPage,
        limit: 12,
      };

      if (filters.subject && filters.subject.trim()) {
        params.subject = filters.subject.trim();
      }

      // console.log("Loading PDFs with params:", params);

      const response = await pdfAPI.getPDFs(params);

      if (response.data.pdfs) {
        setPdfs(response.data.pdfs);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error loading PDFs:", error);
      toast.error("Failed to load PDFs");
    }
  }, [filters, pagination.currentPage]);

  useEffect(() => {
    loadPDFs();
  }, [loadPDFs]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Load recent PDFs and initial PDF list
      const [recentResponse, pdfsResponse] = await Promise.all([
        pdfAPI.getRecentPDFs(5),
        pdfAPI.getPDFs({ page: 1, limit: 12 }),
      ]);

      if (recentResponse.data.recentPdfs) {
        setRecentPdfs(recentResponse.data.recentPdfs);
      }

      if (pdfsResponse.data.pdfs) {
        setPdfs(pdfsResponse.data.pdfs);
        setPagination(pdfsResponse.data.pagination);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error("Please enter a search term");
      return;
    }

    try {
      setIsLoading(true);

      // Only send search query and pagination - let backend handle department/year restrictions
      const searchParams = {
        q: searchQuery.trim(),
        page: 1,
        limit: 12,
      };

      console.log("Dashboard searching with params:", searchParams);

      const response = await pdfAPI.searchPDFs(searchParams);

      if (response.data && response.data.pdfs) {
        setPdfs(response.data.pdfs);
        setPagination(
          response.data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalCount: response.data.pdfs.length,
          }
        );

        if (response.data.pdfs.length === 0) {
          toast.info("No PDFs found matching your search criteria");
        } else {
          toast.success(`Found ${response.data.pdfs.length} PDF(s)`);
        }
      } else {
        setPdfs([]);
        toast.info("No results found");
      }
    } catch (error) {
      console.error("Search error:", error);
      const errorMessage =
        error.response?.data?.error || error.message || "Search failed";
      toast.error(`Search failed: ${errorMessage}`);
      setPdfs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterKey]: value,
    }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      subject: "",
    });
    setSearchQuery("");
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    // Reload the default PDFs
    loadDashboardData();
  };

  const handleViewPDF = (pdfId) => {
    setSelectedPdfId(pdfId);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedPdfId(null);
  };

  const changePage = (newPage) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  useEffect(() => {
    // Fetch folders when component mounts
    fetchFolders();
    
    // Set up a timer to log folder hierarchy for debugging
    const debugTimer = setTimeout(() => {
      // console.log('Current folder hierarchy state:', folderHierarchy);
      // console.log('Current selected folder:', selectedFolder);
      // console.log('Current path:', currentPath);
      
      if (folderHierarchy.length === 0) {
        // console.log('No folders in hierarchy, retrying fetch...');
        fetchFolders();
      }
    }, 2000);
    
    return () => clearTimeout(debugTimer);
  }, []);

  const fetchFolders = async () => {
    try {
      setIsLoading(true);
      // console.log('Fetching folders...');
      
      // Get folders from Google Drive with hierarchy
      const gdriveResponse = await folderAPI.getFolders();
      const allFolders = gdriveResponse.data;
      
      // console.log('All folders from Google Drive:', allFolders);
      // console.log('Number of folders from Google Drive:', allFolders.length);
      
      // Get folder metadata from MongoDB for access control
      const metadataResponse = await folderAPI.getFoldersWithMetadata();
      const folderMetadata = metadataResponse.data;
      
      // console.log('Folder metadata from MongoDB:', folderMetadata);
      // console.log('Number of folder metadata records:', folderMetadata.length);
      
      // Create a map of folder metadata by gdriveId
      const metadataMap = new Map();
      folderMetadata.forEach(folder => {
        if (folder.gdriveId) {
          metadataMap.set(folder.gdriveId, folder);
        }
      });
      
      // console.log('Metadata map size:', metadataMap.size);
      
      // Filter folders based on user access control
      const userAccessibleFolders = allFolders.filter(folder => {
        const metadata = metadataMap.get(folder.id);
        if (!metadata) {
          // console.log(`No metadata found for folder: ${folder.name} (${folder.id}), allowing access by default`);
          return true; // If no metadata, allow access (default behavior)
        }
        
        // Check if user has access based on departments, years, semesters, and access control tags
        const hasAccess = checkFolderAccess(metadata, user);
        // console.log(`Access check for folder ${folder.name}: ${hasAccess ? 'Allowed' : 'Denied'}`);
        return hasAccess;
      });
      
      // console.log('User accessible folders after filtering:', userAccessibleFolders);
      // console.log('Number of accessible folders:', userAccessibleFolders.length);
      
      // Enrich folders with metadata
      const enrichedFolders = userAccessibleFolders.map(folder => {
        const metadata = metadataMap.get(folder.id);
        return {
          ...folder,
          metadata: metadata || null
        };
      });
      
      // console.log('Enriched folders with metadata:', enrichedFolders.length);
      
      // Build folder hierarchy
      const hierarchy = buildFolderHierarchy(enrichedFolders);
      
      // Log the hierarchy for debugging
      // console.log('Folder hierarchy built with root folders:', hierarchy.length);
      // console.log('Root folder names:', hierarchy.map(f => f.name));
      
      setFolderHierarchy(hierarchy);
      setAccessibleFolders(enrichedFolders);
      
      if (hierarchy.length === 0) {
        // console.warn('No folders in hierarchy after building. This might indicate a problem.');
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
      toast.error("Failed to load subjects");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if user has access to a folder based on access control
  const checkFolderAccess = (folderMetadata, user) => {
    // If no metadata exists, allow access (default behavior for unconfigured folders)
    if (!folderMetadata) return true;
    
    // If metadata exists but all access control arrays are empty, allow access
    const hasDepartmentRestrictions = folderMetadata.departments && folderMetadata.departments.length > 0;
    const hasYearRestrictions = folderMetadata.years && folderMetadata.years.length > 0;
    const hasSemesterRestrictions = folderMetadata.semesters && folderMetadata.semesters.length > 0;
    const hasAccessTagRestrictions = folderMetadata.accessControlTags && folderMetadata.accessControlTags.length > 0;
    
    // If no restrictions are set, allow access
    if (!hasDepartmentRestrictions && !hasYearRestrictions && !hasSemesterRestrictions && !hasAccessTagRestrictions) {
      return true;
    }
    
    // Check departments (only if restrictions are set)
    if (hasDepartmentRestrictions) {
      if (!user.department || !folderMetadata.departments.includes(user.department)) {
        return false;
      }
    }
    
    // Check years (only if restrictions are set)
    if (hasYearRestrictions) {
      if (!user.year || !folderMetadata.years.includes(user.year)) {
        return false;
      }
    }
    
    // Check semesters (only if restrictions are set)
    if (hasSemesterRestrictions) {
      if (!user.semester || !folderMetadata.semesters.includes(user.semester)) {
        return false;
      }
    }
    
    // Check access control tags (only if restrictions are set and user has tags)
    if (hasAccessTagRestrictions && user.accessTags && user.accessTags.length > 0) {
      const hasRequiredTag = folderMetadata.accessControlTags.some(tag => 
        user.accessTags.includes(tag)
      );
      if (!hasRequiredTag) {
        return false;
      }
    }
    
    return true;
  };
  
  // Build folder hierarchy for nested display
  const buildFolderHierarchy = (folders) => {
    // console.log('Building folder hierarchy from folders:', folders.length, 'folders');
    // console.log('Sample folder structure:', folders.length > 0 ? JSON.stringify(folders[0], null, 2) : 'No folders');
    
    const folderMap = new Map();
    const rootFolders = [];
    
    // Create a map of all folders with empty children arrays
    folders.forEach(folder => {
      // Check if folder has an id
      if (!folder.id) {
        console.warn('Found folder without ID:', folder);
        return;
      }
      
      // Initialize with empty children array if not present
      const folderWithChildren = { 
        ...folder, 
        children: Array.isArray(folder.children) ? [...folder.children] : [] 
      };
      
      folderMap.set(folder.id, folderWithChildren);
      // console.log(`Added folder to map: ${folder.name} (${folder.id}), children: ${folderWithChildren.children.length}`);
    });
    
    // console.log('Folder map created with', folderMap.size, 'entries');
    
    // Build the hierarchy by adding children to their parents
    folders.forEach(folder => {
      if (!folder.id) return; // Skip folders without ID
      
      const folderNode = folderMap.get(folder.id);
      if (!folderNode) {
        console.warn(`Folder node not found in map for ID: ${folder.id}`);
        return;
      }
      
      // Check if this folder has a parent and if that parent exists in our map
      if (folder.parent && folderMap.has(folder.parent)) {
        const parentFolder = folderMap.get(folder.parent);
        // console.log(`Adding folder '${folder.name}' as child to parent '${parentFolder.name}'`);
        
        // Ensure parent has a children array
        if (!Array.isArray(parentFolder.children)) {
          // console.warn(`Parent folder '${parentFolder.name}' has no children array, creating one`);
          parentFolder.children = [];
        }
        
        parentFolder.children.push(folderNode);
        // console.log(`Parent '${parentFolder.name}' now has ${parentFolder.children.length} children`);
      } else {
        // console.log(`Adding folder '${folder.name}' as a root folder (no parent or parent not in map)`);
        rootFolders.push(folderNode);
      }
    });
    
    // console.log('Root folders before sorting:', rootFolders.map(f => f.name));
    // console.log('Root folders count:', rootFolders.length);
    
    // Sort children alphabetically by name for better organization
    const sortFolderChildren = (folders) => {
      folders.forEach(folder => {
        if (folder.children && folder.children.length > 0) {
          // console.log(`Sorting ${folder.children.length} children of '${folder.name}'`);
          folder.children.sort((a, b) => a.name.localeCompare(b.name));
          sortFolderChildren(folder.children);
        }
      });
    };
    
    // Sort root folders and their children
    rootFolders.sort((a, b) => a.name.localeCompare(b.name));
    sortFolderChildren(rootFolders);
    
    // Log detailed information about the hierarchy
    // console.log('Final root folders:', rootFolders.map(f => ({ 
    //   name: f.name, 
    //   id: f.id, 
    //   childCount: f.children ? f.children.length : 0 
    // })));
    
    // Log the first level of children for each root folder
    rootFolders.forEach(folder => {
      if (folder.children && folder.children.length > 0) {
        // console.log(`Children of root folder '${folder.name}':`, 
        //   folder.children.map(child => ({ name: child.name, id: child.id })));
      }
    });
    
    return rootFolders;
  };

  const fetchPdfsInFolder = async (folderId) => {
    try {
      const response = await folderAPI.getPdfsInFolder(folderId);
      setPdfs(response.data);
    } catch (error) {
      console.error('Failed to load PDFs:', error);
      toast.error("Failed to load PDFs");
    }
  };
  
  // Navigate to a folder (handles both root and nested folders)
  const navigateToFolder = (folderId, folderName) => {
    // console.log(`Navigating to folder: ${folderName} (ID: ${folderId})`);
    setIsLoading(true);
    
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
    
    // If we're already in a folder, we need to check if the target folder is a child
    // of the current folder to maintain proper path
    if (selectedFolder) {
      const currentSubfolders = getCurrentSubfolders();
      // console.log('Current subfolders:', currentSubfolders.map(f => ({ id: f.id, name: f.name })));
      
      const isDirectChild = currentSubfolders && currentSubfolders.some(f => f.id === folderId);
      // console.log(`Is ${folderName} a direct child of current folder? ${isDirectChild}`);
      
      if (isDirectChild) {
        // It's a direct child, just add to the current path
        const newPath = [...currentPath, { id: folderId, name: folderName }];
        // console.log('Setting new path (direct child):', newPath);
        setCurrentPath(newPath);
      } else {
        // It's not a direct child, we need to find the complete path
        const newPath = findFolderPath(folderHierarchy, folderId);
        if (newPath) {
          console.log('Setting new path (found in hierarchy):', newPath);
          setCurrentPath(newPath);
        } else {
          // Fallback if path not found
          console.log('Path not found in hierarchy, using fallback path');
          setCurrentPath([{ id: folderId, name: folderName }]);
        }
      }
    } else {
      // We're at the root level
      // console.log('Setting path from root level');
      setCurrentPath([{ id: folderId, name: folderName }]);
    }
    
    // console.log(`Fetching PDFs for folder: ${folderName}`);
    fetchPdfsInFolder(folderId);
    setSelectedFolder(folderId);
    setIsLoading(false);
  };
  
  // Navigate back in folder hierarchy
  const navigateBack = () => {
    if (currentPath.length > 1) {
      const newPath = currentPath.slice(0, -1);
      const parentFolder = newPath[newPath.length - 1];
      setCurrentPath(newPath);
      setSelectedFolder(parentFolder.id);
      fetchPdfsInFolder(parentFolder.id);
    } else {
      // Go back to root (show all folders)
      setSelectedFolder(null);
      setPdfs([]);
      setCurrentPath([]);
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

  if (isLoading && pdfs.length === 0) {
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
  <div className="w-full max-w-7xl mx-auto mt-8 sm:mt-12 lg:mt-20 px-2 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 bg-[rgba(27,11,66,0.7)] backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-[rgba(255,255,255,0.12)]">
  <div className="text-center">
    <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white">
      Welcome back, {user?.name}
    </h1>
    <p className="mt-2 text-xs sm:text-base text-white/80">
      {user?.department} Department • Year {user?.year} • Semester {user?.semester}
    </p>
  </div>
</div>

  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="py-8">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* PDF Stat */}
        <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.25)] transition-all text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-indigo-600 to-purple-500 rounded-lg flex items-center justify-center">
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-white/80">Available PDFs</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{pagination.totalCount}</p>
            </div>
          </div>
        </div>

        {/* Year Stat */}
        <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 border border-[rgba(255,255,255,0.15)] hover:border-[rgba(255,255,255,0.25)] transition-all text-white">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-600 to-pink-500 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
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
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
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
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs sm:text-sm font-medium text-white/80">Your Department</p>
              <p className="text-xl sm:text-2xl font-bold text-white">{user?.department}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8 border border-[rgba(255,255,255,0.15)]">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search Bar */}
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

          {/* Subject Filter + Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input
              type="text"
              value={filters.subject}
              onChange={(e) => handleFilterChange("subject", e.target.value)}
              placeholder="Filter by subject (optional)"
              className="block w-full px-3 py-2 bg-transparent border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50"
            />

            <div className="flex space-x-2">
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
          </div>
        </form>

        {/* Info Text */}
        <div className="mt-3 text-sm text-white/70 text-center">
          Showing PDFs for {user?.department} Department - Year {user?.year}
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      {currentPath.length > 0 && (
        <div className="mb-4 bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl shadow-lg p-4 border border-[rgba(255,255,255,0.15)]">
          <div className="flex items-center space-x-2 text-white/80 overflow-x-auto pb-2">
            <button
              onClick={() => navigateBack()}
              className="flex items-center hover:text-white transition-colors flex-shrink-0"
            >
              ← Back
            </button>
            <span className="text-white/60 flex-shrink-0">/</span>
            <button
              onClick={() => {
                setSelectedFolder(null);
                setPdfs([]);
                setCurrentPath([]);
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
                    fetchPdfsInFolder(pathItem.id);
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

      {/* Subject Folders Grid (Google Drive style) */}
      <div className="mb-8 bg-gradient-to-br from-[#1b0b42] via-[#24125a] to-[#2d176b] rounded-xl shadow-lg border border-[rgba(255,255,255,0.12)] p-6">
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
        </div> */}
        
        {/* Display current level folders */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {getCurrentSubfolders() && getCurrentSubfolders().length > 0 ? (
            getCurrentSubfolders().map(folder => (
              <button
                key={folder.id}
                className="bg-[rgba(27,11,66,0.7)] border border-gray-700 rounded-lg p-4 flex flex-col items-center hover:bg-purple-700/80 transition-all duration-200 transform hover:scale-105"
                onClick={() => navigateToFolder(folder.id, folder.name)}
              >
                <div className="relative">
                  <Folder className="h-8 w-8 text-blue-400 mb-2" />
                  {folder.children && folder.children.length > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full w-4 h-4 flex items-center justify-center text-[10px] text-white font-bold">
                      {folder.children.length}
                    </div>
                  )}
                </div>
                <span className="text-white font-semibold text-center">{folder.name}</span>
                {folder.metadata && (
                  <div className="mt-2 text-xs text-white/60 text-center">
                    {folder.metadata.departments && folder.metadata.departments.length > 0 && (
                      <div>Dept: {folder.metadata.departments.join(', ')}</div>
                    )}
                    {folder.metadata.years && folder.metadata.years.length > 0 && (
                      <div>Year: {folder.metadata.years.join(', ')}</div>
                    )}
                    {folder.metadata.semesters && folder.metadata.semesters.length > 0 && (
                      <div>Sem: {folder.metadata.semesters.join(', ')}</div>
                    )}
                  </div>
                )}
                {folder.children && folder.children.length > 0 && (
                  <div className="mt-1 text-xs text-blue-300">
                    {folder.children.length} subfolder{folder.children.length !== 1 ? 's' : ''}
                  </div>
                )}
              </button>
            ))
          ) : (
            <div className="col-span-full text-center text-white/70 py-4">
              {isLoading ? 'Loading folders...' : 'No subfolders in this directory.'}
            </div>
          )}
        </div>
        
        {!isLoading && getCurrentSubfolders().length === 0 && !selectedFolder && (
          <div className="text-center text-white/70 py-8">
            No accessible subjects found. Please contact your administrator if you believe this is an error.
          </div>
        )}
      </div>

      {/* PDF List for selected subject/folder */}
      {selectedFolder && (
        <div className="mb-8">
          <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl shadow-lg p-6 border border-[rgba(255,255,255,0.15)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                PDFs in {currentPath.length > 0 ? currentPath[currentPath.length - 1].name : 'Selected Folder'}
              </h2>
              <div className="text-sm text-white/60">
                {pdfs.length} PDF{pdfs.length !== 1 ? 's' : ''} found
              </div>
            </div>
            
            {pdfs && pdfs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pdfs.map((pdf) => (
                  <PDFCard 
                    key={pdf._id || pdf.id || pdf.name} 
                    pdf={pdf} 
                    onView={() => handleViewPDF(pdf._id || pdf.id)} 
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-white/70 py-8">
                <BookOpen className="h-12 w-12 text-white/40 mx-auto mb-4" />
                <p>No PDFs found in this folder.</p>
                <p className="text-sm mt-2">PDFs may be located in subfolders or this folder may be empty.</p>
              </div>
            )}
          </div>
        </div>
      )}

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

  {/* PDF Viewer Modal */}
  <SecurePDFViewer
    pdfId={selectedPdfId}
    isOpen={isViewerOpen}
    onClose={handleCloseViewer}
    user={user}
  />
</div>

  );
};

export default DashboardPage;
