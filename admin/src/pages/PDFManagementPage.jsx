import React, { useState, useEffect } from 'react';
import { 
  Search,
  Filter,
  Edit,
  Trash2,
  Download,
  Eye,
  MoreVertical,
  FileText,
  Calendar,
  User,
  Tag,
  ExternalLink
} from 'lucide-react';
import { pdfAPI } from '../api';
import { folderAPI } from '../api';
import toast from 'react-hot-toast';

const DEPARTMENTS = [
  'All', 'CSE', 'CSBS', 'AIML', 'CSDS', 'IT', 'CSCS', 'ECE', 'EIE', 'IOT', 'ECS', 'EE', 'CE', 'FT', 'ME', 'BCA', 'BBA', 'BHM', 'BMS'
];

const YEARS = ['All', '1', '2', '3', '4'];

export default function PDFManagementPage() {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    folder: 'All',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const response = await folderAPI.getAllFolders();
        setFolders(response.data);
      } catch (error) {
        toast.error('Failed to load folders');
      }
    };
    fetchFolders();
  }, []);
    fetchPdfs();
  }, [currentPage, searchTerm, filters]);

  const fetchPdfs = async () => {
    setLoading(true);
    try {
    const params = {
      page: currentPage,
      limit: 10,
      ...(filters.folder !== 'All' && { folder: filters.folder }),
    };
    if (searchTerm.trim()) params.search = searchTerm.trim();
    const response = await pdfAPI.getAllPdfs(params);
    setFiles(response.data.files);
    setTotalPages(response.data.pagination ? response.data.pagination.totalPages : 1);
    } catch (error) {
      console.error('Failed to fetch PDFs:', error);
      toast.error('Failed to load PDFs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pdfId) => {
    if (!confirm('Are you sure you want to delete this PDF?')) return;
    
    try {
      await pdfAPI.deletePdf(pdfId);
      toast.success('PDF deleted successfully');
      fetchPdfs();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete PDF');
    }
  };

  const handleEdit = (pdf) => {
    setSelectedPdf(pdf);
    setShowEditModal(true);
  };

  const handleUpdate = async (updatedData) => {
    try {
      await pdfAPI.updatePdf(selectedPdf._id, updatedData);
      toast.success('PDF updated successfully');
      setShowEditModal(false);
      setSelectedPdf(null);
      fetchPdfs();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Failed to update PDF');
    }
  };

  const handleFixOrphanedUploaders = async () => {
    if (!confirm('This will assign orphaned PDFs to an admin user. Continue?')) return;
    
    try {
      const response = await pdfAPI.fixOrphanedUploaders();
      toast.success(`Fixed ${response.data.orphanedCount} orphaned PDFs`);
      fetchPdfs(); // Refresh the list
    } catch (error) {
      console.error('Fix orphaned uploaders error:', error);
      toast.error('Failed to fix orphaned uploaders');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Manage PDFs</h1>
        <p className="mt-2 text-gray-300">
          View, edit, and manage all uploaded PDF documents
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search PDFs..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-4">
            <select
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={filters.folder}
              onChange={(e) => setFilters(prev => ({ ...prev, folder: e.target.value }))}
            >
              <option value="All" className="bg-gray-700 text-white">All Folders</option>
              {folders.map(folder => (
                <option key={folder._id} value={folder._id} className="bg-gray-700 text-white">
                  {folder.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* PDF List */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-300">Loading PDFs...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300">No PDFs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    PDF Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Department & Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Upload Info
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-600">
                {files.map((pdf) => (
                  <tr key={pdf._id} className="hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-start">
                        <FileText className="h-5 w-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-white">{pdf.title}</p>
                          <p className="text-sm text-gray-300">{pdf.subject}</p>
                          {pdf.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                              {pdf.description}
                            </p>
                          )}
                          {pdf.tags && pdf.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {pdf.tags.slice(0, 3).map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-900 text-primary-200 border border-primary-700"
                                >
                                  <Tag className="h-3 w-3 mr-1" />
                                  {tag}
                                </span>
                              ))}
                              {pdf.tags.length > 3 && (
                                <span className="text-xs text-gray-400">+{pdf.tags.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white">
                        {Array.isArray(pdf.departments) ? pdf.departments.join(', ') : pdf.department}
                      </div>
                      <div className="text-sm text-gray-400">Year {pdf.year}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-green-400">
                        <User className="h-4 w-4 mr-1" />
                        {pdf.uploadedBy?.name || pdf.uploadedByName || (
                          <span className="text-yellow-400 italic">System Admin</span>
                        )}
                      </div>
                      {pdf.uploadedBy?.email && (
                        <div className="text-xs text-gray-400">{pdf.uploadedBy.email}</div>
                      )}
                      <div className="flex items-center text-sm text-gray-400">
                        <Calendar className="h-4 w-4 mr-1" />
                        {pdf.uploadedAt ? formatDate(pdf.uploadedAt) : formatDate(pdf.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                      {formatFileSize(pdf.fileSize)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(pdf)}
                          className="text-primary-600 hover:text-primary-900"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pdf._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {/* Always show Google Drive link for debugging */}
                        <a
                          href={pdf.googleDriveFolderId
                            ? `https://drive.google.com/drive/folders/${pdf.googleDriveFolderId}`
                            : (pdf.googleDriveFileId
                                ? `https://drive.google.com/file/d/${pdf.googleDriveFileId}/view`
                                : 'https://drive.google.com/drive/my-drive')}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={pdf.googleDriveFolderId
                            ? "Open containing folder in Google Drive"
                            : (pdf.googleDriveFileId
                                ? "Open file in Google Drive"
                                : "No linked Drive file. Open Drive.")}
                        >
                          <ExternalLink className="h-4 w-4 mr-1 text-yellow-400" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-600">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-300">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-600 rounded-md bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-600 rounded-md bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedPdf && (
        <EditPDFModal
          pdf={selectedPdf}
          onClose={() => {
            setShowEditModal(false);
            setSelectedPdf(null);
          }}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}

// Edit PDF Modal Component
function EditPDFModal({ pdf, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    title: pdf.title,
    description: pdf.description || '',
    departments: Array.isArray(pdf.departments) ? pdf.departments : (pdf.department ? [pdf.department] : []),
    year: (pdf.year === null || pdf.year === undefined) ? '' : String(pdf.year),
    subject: pdf.subject,
    tags: pdf.tags ? pdf.tags.join(', ') : '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ensure no value is empty before submitting
    const cleanedData = { ...formData };
    if (!cleanedData.departments || cleanedData.departments.length === 0) cleanedData.departments = [DEPARTMENTS[1]];
    if (!cleanedData.year) cleanedData.year = YEARS[1];
    if (!cleanedData.title) cleanedData.title = pdf.title;
    if (!cleanedData.subject) cleanedData.subject = pdf.subject;
    if (!cleanedData.description) cleanedData.description = '';
    cleanedData.tags = cleanedData.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
    onUpdate(cleanedData);
  };

  const handleChange = (e) => {
    const { name, value, options } = e.target;
    if (name === 'departments') {
      const selected = Array.from(options).filter(opt => opt.selected).map(opt => opt.value);
      setFormData(prev => ({ ...prev, departments: selected }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-4">Edit PDF</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Title
              </label>
              <input
                type="text"
                name="title"
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                required
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={formData.subject}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Departments
                </label>
                <div className="flex flex-col gap-2">
                  {DEPARTMENTS.slice(1).map(dept => (
                    <label key={dept} className="inline-flex items-center">
                      <input
                        type="checkbox"
                        name="departments"
                        value={dept}
                        checked={formData.departments.includes(dept)}
                        onChange={e => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              departments: [...prev.departments, dept]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              departments: prev.departments.filter(d => d !== dept)
                            }));
                          }
                        }}
                        className="form-checkbox h-4 w-4 text-primary-600"
                      />
                      <span className="ml-2 text-gray-200">{dept}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Year
                </label>
                <select
                  name="year"
                  required
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  value={formData.year}
                  onChange={handleChange}
                >
                  {YEARS.slice(1).map(year => (
                    <option key={year} value={year} className="bg-gray-700 text-white">Year {year}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <textarea
                name="description"
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={formData.description}
                onChange={handleChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tags
              </label>
              <input
                type="text"
                name="tags"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                placeholder="Separate tags with commas"
                value={formData.tags}
                onChange={handleChange}
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors border border-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
              >
                Update PDF
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
