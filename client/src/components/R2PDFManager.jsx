import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  Download, 
  Eye, 
  RefreshCw, 
  Search, 
  Filter,
  AlertTriangle,
  Database,
  ExternalLink,
  User
} from 'lucide-react';
import { pdfAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const R2PDFManager = () => {
  const { user } = useAuth();
  const [pdfs, setPdfs] = useState([]);
  const [filteredPdfs, setFilteredPdfs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [showOrphaned, setShowOrphaned] = useState(false);
  const [stats, setStats] = useState({
    totalFiles: 0,
    accessibleFiles: 0,
    userAccess: null
  });

  const departments = ['AIML', 'CSE', 'ECE', 'EEE', 'IT'];
  const years = [1, 2, 3, 4];

  useEffect(() => {
    loadR2PDFs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [pdfs, searchQuery, selectedDepartment, selectedYear, showOrphaned]);

  const loadR2PDFs = async () => {
    try {
      setIsLoading(true);
      const response = await pdfAPI.getAllPDFsFromR2();
      
      if (response.data.pdfs) {
        setPdfs(response.data.pdfs);
        setStats({
          totalFiles: response.data.totalFiles,
          accessibleFiles: response.data.accessibleFiles,
          userAccess: response.data.userAccess
        });
        toast.success(`Loaded ${response.data.accessibleFiles} accessible files from R2 bucket`);
      }
    } catch (error) {
      console.error('Error loading R2 PDFs:', error);
      toast.error('Failed to load PDFs from R2 bucket');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...pdfs];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(pdf => 
        pdf.title.toLowerCase().includes(query) ||
        pdf.subject.toLowerCase().includes(query) ||
        pdf.fileKey.toLowerCase().includes(query)
      );
    }

    // Department filter
    if (selectedDepartment) {
      filtered = filtered.filter(pdf => pdf.department === selectedDepartment);
    }

    // Year filter
    if (selectedYear) {
      filtered = filtered.filter(pdf => pdf.year === parseInt(selectedYear));
    }

    // Orphaned files filter
    if (showOrphaned) {
      filtered = filtered.filter(pdf => pdf.isOrphaned);
    }

    setFilteredPdfs(filtered);
  };

  const handleViewPDF = (pdf) => {
    // Open PDF in new tab
    window.open(pdf.viewUrl, '_blank');
  };

  const handleDownloadPDF = (pdf) => {
    // Create download link
    const link = document.createElement('a');
    link.href = pdf.viewUrl;
    link.download = pdf.title || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Cloud className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">R2 Bucket PDF Manager</h1>
                <p className="text-gray-600">
                  Manage and view PDFs stored in Cloudflare R2
                  {stats.userAccess && (
                    <span className="block text-sm text-blue-600 mt-1">
                      Showing PDFs for {stats.userAccess.department} - Year {stats.userAccess.year}
                      {stats.userAccess.role === 'admin' && ' (Admin View)'}
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <button
              onClick={loadR2PDFs}
              disabled={isLoading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Total Files in Bucket</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{stats.totalFiles}</p>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">Accessible to You</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.accessibleFiles}</p>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-800">Your Access Level</span>
              </div>
              <p className="text-sm font-bold text-purple-600">
                {stats.userAccess?.department} - Year {stats.userAccess?.year}
                {stats.userAccess?.role === 'admin' && ' (Admin)'}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search PDFs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Department Filter - Only show if admin or for reference */}
            {(user?.role === 'admin' || stats.userAccess) && (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={user?.role !== 'admin'}
              >
                <option value="">
                  {user?.role === 'admin' ? 'All Departments' : `${stats.userAccess?.department} (Your Dept)`}
                </option>
                {user?.role === 'admin' && departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            )}

            {/* Year Filter - Only show if admin or for reference */}
            {(user?.role === 'admin' || stats.userAccess) && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={user?.role !== 'admin'}
              >
                <option value="">
                  {user?.role === 'admin' ? 'All Years' : `Year ${stats.userAccess?.year} (Your Year)`}
                </option>
                {user?.role === 'admin' && years.map(year => (
                  <option key={year} value={year}>Year {year}</option>
                ))}
              </select>
            )}

            {/* Orphaned Files Toggle - Only for admin */}
            {user?.role === 'admin' && (
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={showOrphaned}
                  onChange={(e) => setShowOrphaned(e.target.checked)}
                  className="w-4 h-4 text-yellow-600 border-gray-300 rounded focus:ring-yellow-500"
                />
                <span className="text-sm font-medium text-gray-700">Show only orphaned files</span>
              </label>
            )}

            {/* Access Level Info */}
            {user?.role !== 'admin' && stats.userAccess && (
              <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Showing only {stats.userAccess.department} Year {stats.userAccess.year} PDFs
                </span>
              </div>
            )}
          </div>
        </div>

        {/* PDF List */}
        <div className="bg-white rounded-lg shadow-sm">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading PDFs from R2...</span>
            </div>
          ) : filteredPdfs.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">No PDFs found matching your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PDF Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Department/Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPdfs.map((pdf, index) => (
                    <tr key={pdf.fileKey} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {pdf.title}
                          </p>
                          <p className="text-sm text-gray-500">{pdf.subject}</p>
                          <p className="text-xs text-gray-400 mt-1">{pdf.fileKey}</p>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>
                          <p>{pdf.department}</p>
                          <p>Year {pdf.year}</p>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>
                          <p>{formatFileSize(pdf.fileSize)}</p>
                          <p>{formatDate(pdf.createdAt)}</p>
                          <p>{pdf.viewCount || 0} views</p>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        {pdf.isOrphaned ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Orphaned
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Database className="h-3 w-3 mr-1" />
                            In Database
                          </span>
                        )}
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleViewPDF(pdf)}
                            className="flex items-center space-x-1 px-3 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View</span>
                          </button>
                          
                          {/* <button
                            onClick={() => handleDownloadPDF(pdf)}
                            className="flex items-center space-x-1 px-3 py-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Download className="h-4 w-4" />
                            <span>Download</span>
                          </button> */}
                          
                          <a
                            href={pdf.viewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 px-3 py-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>Direct Link</span>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {!isLoading && filteredPdfs.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-600">
            Showing {filteredPdfs.length} of {pdfs.length} PDFs
          </div>
        )}
      </div>
    </div>
  );
};

export default R2PDFManager;
