import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { pdfAPI } from '../api';
import PDFCard from '../components/PDFCard';
import SecurePDFViewer from '../components/SecurePDFViewer';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const SearchPage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPdfId, setSelectedPdfId] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0
  });

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
        limit: 20
      };
      
      console.log('Searching with params:', searchParams);
      
      const response = await pdfAPI.searchPDFs(searchParams);

      console.log('Search response:', response.data);

      if (response.data && response.data.pdfs) {
        setSearchResults(response.data.pdfs);
        setPagination(response.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalCount: response.data.pdfs.length
        });
        
        if (response.data.pdfs.length === 0) {
          toast('No PDFs found matching your search criteria');
        } else {
          toast.success(`Found ${response.data.pdfs.length} PDF(s)`);
        }
      } else {
        console.log('Unexpected response format:', response.data);
        setSearchResults([]);
        toast('No results found');
      }
    } catch (error) {
      console.error('Search error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Search failed';
      toast.error(`Search failed: ${errorMessage}`);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
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
    <div className="min-h-screen bg-gradient-to-br from-[#1b0b42] via-[#24125a] to-[#2d176b] animate-fade-in duration-700 overflow-hidden">
      <div className="w-full max-w-7xl mx-auto mt-8 sm:mt-12 lg:mt-20 px-2 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 bg-[rgba(27,11,66,0.7)] backdrop-blur-md rounded-xl sm:rounded-2xl shadow-lg border border-[rgba(255,255,255,0.12)]">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-white mb-2">
            Search PDFs
          </h1>
          <p className="text-xs sm:text-base text-white/80">
            Find educational resources for {user?.department} Department - Year {user?.year}
          </p>
        </div>

        {/* Search Form */}
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
                placeholder="Search by title, subject, or tags in your department..."
                className="block w-full pl-10 pr-3 py-3 bg-transparent border border-white/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent text-white placeholder-white/60"
                autoFocus
              />
            </div>
            <div className="flex justify-end">
              <div className="flex space-x-2">
                <button
                  type="submit"
                  disabled={isLoading || !searchQuery.trim()}
                  className="bg-gradient-to-r from-indigo-600 to-purple-500 text-white px-6 py-2 rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-sm sm:text-base"
                >
                  {isLoading ? 'Searching...' : 'Search'}
                </button>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="p-2 border border-white/20 text-white/80 rounded-lg hover:bg-white/10 transition-colors"
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
            <div className="mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-2">
                Search Results for "{searchQuery}"
              </h2>
              {pagination.totalCount > 0 && (
                <p className="text-white/80">
                  Found {pagination.totalCount} PDF{pagination.totalCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[rgba(255,255,255,0.06)] backdrop-blur-md rounded-xl shadow-lg h-48 sm:h-64 animate-pulse border border-[rgba(255,255,255,0.15)]"></div>
              ))}
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {searchResults.map((pdf) => (
                <PDFCard
                  key={pdf._id}
                  pdf={pdf}
                  onView={handleViewPDF}
                />
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-8 sm:py-12">
              <Search className="h-10 w-10 sm:h-12 sm:w-12 text-white/60 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-white mb-2">No results found</h3>
              <p className="text-sm sm:text-base text-white/80">
                Try adjusting your search terms or filters.
              </p>
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12">
              <Search className="h-10 w-10 sm:h-12 sm:w-12 text-white/60 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-white mb-2">Start your search</h3>
              <p className="text-sm sm:text-base text-white/80 px-4">
                Enter keywords to find PDFs in your department ({user?.department}) and year ({user?.year}).
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
