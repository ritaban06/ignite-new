import React, { useState, useEffect } from 'react';
import { Search, Filter, BookOpen, Clock, TrendingUp, Plus } from 'lucide-react';
import { pdfAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import PDFCard from '../components/PDFCard';
import SecurePDFViewer from '../components/SecurePDFViewer';
import toast from 'react-hot-toast';

const DashboardPage = () => {
  const { user } = useAuth();
  const [pdfs, setPdfs] = useState([]);
  const [recentPdfs, setRecentPdfs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    // Removed department and year filters since backend handles user restrictions
    subject: ''
  });
  const [selectedPdfId, setSelectedPdfId] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });

  // Remove unused filter variables since backend handles user department/year restrictions
  
  // Load initial data
  useEffect(() => {
    loadDashboardData();
  }, []);

  // Load PDFs when filters change
  useEffect(() => {
    loadPDFs();
  }, [filters, pagination.currentPage]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load recent PDFs and initial PDF list
      const [recentResponse, pdfsResponse] = await Promise.all([
        pdfAPI.getRecentPDFs(5),
        pdfAPI.getPDFs({ page: 1, limit: 12 })
      ]);

      if (recentResponse.data.recentPdfs) {
        setRecentPdfs(recentResponse.data.recentPdfs);
      }

      if (pdfsResponse.data.pdfs) {
        setPdfs(pdfsResponse.data.pdfs);
        setPagination(pdfsResponse.data.pagination);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPDFs = async () => {
    try {
      const params = {
        page: pagination.currentPage,
        limit: 12
      };

      // Only add subject filter if it has a value
      if (filters.subject && filters.subject.trim()) {
        params.subject = filters.subject.trim();
      }

      console.log('Loading PDFs with params:', params);

      const response = await pdfAPI.getPDFs(params);
      
      if (response.data.pdfs) {
        setPdfs(response.data.pdfs);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error loading PDFs:', error);
      toast.error('Failed to load PDFs');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    try {
      setIsLoading(true);
      
      // Only send search query and pagination - let backend handle department/year restrictions
      const searchParams = {
        q: searchQuery.trim(),
        page: 1,
        limit: 12
      };
      
      console.log('Dashboard searching with params:', searchParams);
      
      const response = await pdfAPI.searchPDFs(searchParams);

      if (response.data && response.data.pdfs) {
        setPdfs(response.data.pdfs);
        setPagination(response.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalCount: response.data.pdfs.length
        });
        
        if (response.data.pdfs.length === 0) {
          toast.info('No PDFs found matching your search criteria');
        } else {
          toast.success(`Found ${response.data.pdfs.length} PDF(s)`);
        }
      } else {
        setPdfs([]);
        toast.info('No results found');
      }
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Search failed';
      toast.error(`Search failed: ${errorMessage}`);
      setPdfs([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      subject: ''
    });
    setSearchQuery('');
    setPagination(prev => ({ ...prev, currentPage: 1 }));
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
    setPagination(prev => ({ ...prev, currentPage: newPage }));
  };

  if (isLoading && pdfs.length === 0) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-purple-700">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50 animate-fade-in duration-700">
      {/* Welcome Header */}
      <div className="gradient-accent shadow-sm border-b border-primary-400 mt-[-1px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <div className="text-center">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">
              Welcome back, {user?.name}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-primary-100">
              {user?.department} Department • Year {user?.year}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-primary-100/80 backdrop-blur-sm rounded-lg shadow-sm p-4 sm:p-6 border border-primary-200 hover:border-primary-300 transition-colors">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-primary-600 to-primary-500 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-primary-700">Available PDFs</p>
                  <p className="text-xl sm:text-2xl font-bold text-primary-600">{pagination.totalCount}</p>
                </div>
              </div>
            </div>

            {/* User Year Quick Stats */}
            <div className="bg-primary-100/80 backdrop-blur-sm rounded-lg shadow-sm p-4 sm:p-6 border border-purple-200 hover:border-purple-300 transition-colors">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-purple-600 to-purple-500 rounded-lg flex items-center justify-center">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
                <div className="ml-3 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-purple-700">Year</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">{user?.year}</p>
                </div>
              </div>
            </div>

            <div className="bg-primary-100/80 backdrop-blur-sm rounded-lg shadow-sm p-6 border border-blue-200 hover:border-blue-300 transition-colors">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-400 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-700">Your Department</p>
                  <p className="text-2xl font-bold text-blue-600">{user?.department}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent PDFs Section */}
          {/*
          {recentPdfs.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Recently Viewed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentPdfs.map((pdf) => (
                  <PDFCard
                    key={pdf._id}
                    pdf={pdf}
                    onView={handleViewPDF}
                    showDetails={true}
                  />
                ))}
              </div>
            </div>
          )}
          */}

          {/* Search and Filters */}
          <div className="bg-primary-100/80 backdrop-blur-sm rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8 border border-primary-200">
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search PDFs in your department..."
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
                />
              </div>

              {/* Filters - Removed department and year filters since backend handles user restrictions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <input
                  type="text"
                  value={filters.subject}
                  onChange={(e) => handleFilterChange('subject', e.target.value)}
                  placeholder="Filter by subject (optional)"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />

                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 gradient-accent text-white px-4 py-2 rounded-lg hover:shadow-md transition-all duration-200 transform hover:scale-105"
                  >
                    Search
                  </button>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-200 hover:border-primary-400 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </form>
            
            {/* Info text */}
            <div className="mt-3 text-sm text-primary-600 text-center">
              Showing PDFs for {user?.department} Department - Year {user?.year}
            </div>
          </div>

          {/* PDF Grid */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {searchQuery ? `Search Results for "${searchQuery}"` : 'All PDFs'}
              </h2>
              <p className="text-sm text-gray-600">
                {pagination.totalCount} PDFs available
              </p>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-primary-100/60 backdrop-blur-sm rounded-lg shadow-sm h-48 sm:h-64 animate-pulse border border-primary-200">
                    <div className="p-3 sm:p-4">
                      <div className="h-4 bg-primary-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-primary-200 rounded w-1/2 mb-4"></div>
                      <div className="h-3 bg-primary-200 rounded w-full mb-2"></div>
                      <div className="h-3 bg-primary-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pdfs.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {pdfs.map((pdf) => (
                    <PDFCard
                      key={pdf._id}
                      pdf={pdf}
                      onView={handleViewPDF}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center mt-8">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => changePage(pagination.currentPage - 1)}
                        disabled={!pagination.hasPrev}
                        className="px-4 py-2 border border-primary-300 rounded-lg text-primary-700 hover:bg-primary-200 hover:border-primary-400 hover:text-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Previous
                      </button>
                      
                      <span className="px-4 py-2 text-primary-700">
                        Page <span className="font-medium text-primary-800">{pagination.currentPage}</span> of <span className="font-medium text-primary-800">{pagination.totalPages}</span>
                      </span>
                      
                      <button
                        onClick={() => changePage(pagination.currentPage + 1)}
                        disabled={!pagination.hasNext}
                        className="px-4 py-2 border border-primary-300 rounded-lg text-primary-700 hover:bg-primary-200 hover:border-primary-400 hover:text-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-primary-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-primary-700 mb-2">No PDFs found</h3>
                <p className="text-primary-600">
                  {searchQuery ? 'Try adjusting your search terms.' : `No PDFs are available for ${user?.department} Department - Year ${user?.year}.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      <SecurePDFViewer
        pdfId={selectedPdfId}
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
      />
    </div>
  );
};

export default DashboardPage;
