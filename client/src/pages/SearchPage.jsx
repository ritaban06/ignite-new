import React, { useState, useEffect } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { pdfAPI } from '../api';
import PDFCard from '../components/PDFCard';
import SecurePDFViewer from '../components/SecurePDFViewer';
import toast from 'react-hot-toast';

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState({
    department: '',
    year: ''
  });
  const [selectedPdfId, setSelectedPdfId] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });

  const departments = ['AIML', 'CSE', 'ECE', 'EEE', 'IT'];
  const years = [1, 2, 3, 4];

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsLoading(true);
      const response = await pdfAPI.searchPDFs({
        q: searchQuery,
        ...filters,
        page: 1,
        limit: 20
      });

      if (response.data.pdfs) {
        setSearchResults(response.data.pdfs);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (filterKey, value) => {
    setFilters(prev => ({
      ...prev,
      [filterKey]: value
    }));
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setFilters({ department: '', year: '' });
  };

  const handleViewPDF = (pdfId) => {
    setSelectedPdfId(pdfId);
    setIsViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setIsViewerOpen(false);
    setSelectedPdfId(null);
  };

  return (
    <div className="min-h-screen bg-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent mb-2">Search PDFs</h1>
          <p className="text-purple-700">Find the educational resources you need</p>
        </div>

        {/* Search Form */}
        <div className="bg-primary-100/80 backdrop-blur-sm rounded-lg shadow-sm p-6 mb-8 border border-primary-200">
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
                placeholder="Search by title, subject, description, or tags..."
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
                autoFocus
              />
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <select
                value={filters.department}
                onChange={(e) => handleFilterChange('department', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>

              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Years</option>
                {years.map((year) => (
                  <option key={year} value={year}>Year {year}</option>
                ))}
              </select>

              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={isLoading || !searchQuery.trim()}
                  className="flex-1 gradient-accent text-white px-4 py-2 rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                >
                  {isLoading ? 'Searching...' : 'Search'}
                </button>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-200 hover:border-primary-400 hover:text-primary-800 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Search Results */}
        <div>
          {searchQuery && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-primary-700 mb-2">
                Search Results for "{searchQuery}"
              </h2>
              {pagination.totalCount > 0 && (
                <p className="text-primary-600">
                  Found {pagination.totalCount} PDF{pagination.totalCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-primary-100/60 backdrop-blur-sm rounded-lg shadow-sm h-64 animate-pulse border border-primary-200">
                  <div className="p-4">
                    <div className="h-4 bg-primary-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-primary-200 rounded w-1/2 mb-4"></div>
                    <div className="h-3 bg-primary-200 rounded w-full mb-2"></div>
                    <div className="h-3 bg-primary-200 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map((pdf) => (
                <PDFCard
                  key={pdf._id}
                  pdf={pdf}
                  onView={handleViewPDF}
                />
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-primary-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-primary-700 mb-2">No results found</h3>
              <p className="text-primary-600">
                Try adjusting your search terms or filters.
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-primary-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-primary-700 mb-2">Start your search</h3>
              <p className="text-primary-600">
                Enter keywords to find PDFs across all subjects and departments.
              </p>
            </div>
          )}
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

export default SearchPage;
