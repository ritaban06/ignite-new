import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon,
  Search,
  Filter,
  Edit,
  Trash2,
  Shield,
  Calendar,
  Mail,
  MoreVertical,
  Tags,
  X,
  Check
} from 'lucide-react';
import { userAPI, accessTagAPI } from '../api';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [editForm, setEditForm] = useState({ accessTags: '' });

  // Debounce searchTerm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [currentPage, debouncedSearch, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: 10,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(roleFilter !== 'all' && { role: roleFilter }),
      };
      const response = await userAPI.getAllUsers(params);
      setUsers(response.data.users);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    try {
      await userAPI.updateUser(userId, { role: newRole });
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (error) {
      console.error('Role update error:', error);
      toast.error('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await userAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete user');
    }
  };

  const handleEditAccessTags = async (user) => {
    setSelectedUser(user);
    setSelectedTags(user.accessTags || []);
    setEditForm({
      accessTags: Array.isArray(user.accessTags) ? user.accessTags.join(', ') : ''
    });
    
    // Fetch available tags
    try {
      const response = await accessTagAPI.getAvailableTags();
      setAvailableTags(response.data || []);
    } catch (error) {
      console.error('Failed to fetch available tags:', error);
      toast.error('Failed to load available tags');
      setAvailableTags([]);
    }
    
    setShowEditModal(true);
  };

  const handleUpdateAccessTags = async (e) => {
    e.preventDefault();
    try {
      await userAPI.updateUser(selectedUser._id, { accessTags: selectedTags });
      toast.success('Access tags updated successfully');
      setShowEditModal(false);
      setSelectedUser(null);
      setSelectedTags([]);
      fetchUsers();
    } catch (error) {
      console.error('Update access tags error:', error);
      toast.error('Failed to update access tags');
    }
  };

  const toggleTagSelection = (tagName) => {
    setSelectedTags(prev => 
      prev.includes(tagName)
        ? prev.filter(tag => tag !== tagName)
        : [...prev, tagName]
    );
  };

  const getCategoryColor = (category) => {
    const colors = {
      'academic': '#10B981',
      'department': '#F59E0B', 
      'special-group': '#8B5CF6',
      'course': '#06B6D4',
      'project': '#EF4444',
      'research': '#84CC16',
      'temporary': '#F97316',
      'other': '#6B7280'
    };
    return colors[category] || colors.other;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRoleBadgeColor = (role) => {
    return role === 'admin' 
      ? 'bg-red-100 text-red-800' 
      : 'bg-green-100 text-green-800';
  };

  const getDarkRoleBadgeColor = (role) => {
    return role === 'admin' 
      ? 'bg-red-900 bg-opacity-40 text-red-300 border border-red-700' 
      : 'bg-green-900 bg-opacity-40 text-green-300 border border-green-700';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">User Management</h1>
        <p className="mt-2 text-gray-300">
          Manage user accounts and permissions
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
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          {/* <div>
            <select
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all" className="bg-gray-700 text-white">All Roles</option>
              <option value="user" className="bg-gray-700 text-white">Users</option>
              <option value="admin" className="bg-gray-700 text-white">Admins</option>
            </select>
          </div> */}
        </div>
      </div>

      {/* Users List */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-300">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center">
            <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-16 py-4"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {/* Role */}
                  </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Year
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Semester
                    </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Access Tags
                  </th> */}
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Joined
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th> */}
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-600">
                {users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {user.picture ? (
                          <img 
                            src={user.picture} 
                            alt={user.name}
                            className="h-10 w-10 rounded-full object-cover"
                            onError={(e) => {
                              // Fallback to default avatar if image fails to load
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`h-10 w-10 bg-primary-900 bg-opacity-40 rounded-full flex items-center justify-center ${user.picture ? 'hidden' : ''}`}>
                          <span className="text-primary-300 font-medium text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">{user.name}</div>
                          <div className="flex items-center text-sm text-gray-400">
                            <Mail className="h-4 w-4 mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center"></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {/* <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDarkRoleBadgeColor(user.role)}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {user.role}
                      </span> */}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white text-center">
                      {user.year || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white text-center">
                      {user.semester || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white text-center">
                      {user.department || 'N/A'}
                    </td>
                    {/* <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {user.accessTags && user.accessTags.length > 0 ? (
                          user.accessTags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-900 bg-opacity-40 text-blue-300 border border-blue-700"
                            >
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-400 text-xs">No tags</span>
                        )}
                      </div>
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center text-sm text-white">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">/ */}
                      <div className="flex items-center justify-end space-x-2">
                        {/* <button
                          onClick={() => handleEditAccessTags(user)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Edit Access Tags"
                        >
                          <Tags className="h-4 w-4" />
                        </button> */}
                        {/* <button
                          onClick={() => handleRoleToggle(user._id, user.role)}
                          className="text-primary-600 hover:text-primary-900"
                          title={`Make ${user.role === 'admin' ? 'User' : 'Admin'}`}
                        >
                          <Shield className="h-4 w-4" />
                        </button> */}
                        {/* <button
                          onClick={() => handleDeleteUser(user._id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete User"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button> */}
                      </div>
                    {/* </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Intelligent Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <div className="text-sm text-white">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                {/* First Page Button */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="First Page"
                >
                  First
                </button>
                
                {/* Previous Page Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous Page"
                >
                  Previous
                </button>

                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {(() => {
                    const pages = [];
                    const maxVisiblePages = 5;
                    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                    
                    // Adjust start page if we're near the end
                    if (endPage - startPage + 1 < maxVisiblePages) {
                      startPage = Math.max(1, endPage - maxVisiblePages + 1);
                    }

                    // Add ellipsis at the beginning if needed
                    if (startPage > 1) {
                      pages.push(
                        <button
                          key="1"
                          onClick={() => setCurrentPage(1)}
                          className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white hover:bg-gray-600 transition-colors"
                        >
                          1
                        </button>
                      );
                      if (startPage > 2) {
                        pages.push(
                          <span key="start-ellipsis" className="px-2 text-gray-400">
                            ...
                          </span>
                        );
                      }
                    }

                    // Add visible page numbers
                    for (let i = startPage; i <= endPage; i++) {
                      pages.push(
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i)}
                          className={`px-3 py-2 text-sm border rounded-md transition-colors font-medium ${
                            currentPage === i
                              ? 'bg-primary-600 border-primary-500 text-white shadow-lg ring-2 ring-primary-300 ring-opacity-50 scale-105 transform'
                              : 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500'
                          }`}
                        >
                          {i}
                        </button>
                      );
                    }

                    // Add ellipsis at the end if needed
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push(
                          <span key="end-ellipsis" className="px-2 text-gray-400">
                            ...
                          </span>
                        );
                      }
                      pages.push(
                        <button
                          key={totalPages}
                          onClick={() => setCurrentPage(totalPages)}
                          className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white hover:bg-gray-600 transition-colors"
                        >
                          {totalPages}
                        </button>
                      );
                    }

                    return pages;
                  })()}
                </div>

                {/* Next Page Button */}
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next Page"
                >
                  Next
                </button>
                
                {/* Last Page Button */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded-md text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Last Page"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Access Tags Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Edit Access Tags</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateAccessTags} className="p-6">
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">
                  User: <span className="font-semibold text-white">{selectedUser.name}</span>
                </label>
                <label className="block text-gray-300 mb-3">Select Access Tags</label>
                
                {/* Selected Tags Display */}
                {selectedTags.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-700 rounded-lg">
                    <div className="text-sm text-gray-300 mb-2">Selected Tags:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTags.map(tagName => {
                        const tag = availableTags.find(t => t.name === tagName);
                        return (
                          <span
                            key={tagName}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white border"
                            style={{ 
                              backgroundColor: tag?.color + '40' || '#3B82F640',
                              borderColor: tag?.color || '#3B82F6'
                            }}
                          >
                            {tagName}
                            <button
                              type="button"
                              onClick={() => toggleTagSelection(tagName)}
                              className="ml-1 text-white hover:text-red-300"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Available Tags */}
                <div className="max-h-64 overflow-y-auto border border-gray-600 rounded-lg">
                  {availableTags.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      No predefined tags available. Create tags in Access Tags Management.
                    </div>
                  ) : (
                    <div className="p-2">
                      {availableTags.map(tag => (
                        <div
                          key={tag._id}
                          className={`flex items-center p-2 rounded-lg cursor-pointer hover:bg-gray-600 ${
                            selectedTags.includes(tag.name) ? 'bg-gray-600' : ''
                          }`}
                          onClick={() => toggleTagSelection(tag.name)}
                        >
                          <div className="flex items-center flex-1">
                            <div
                              className="w-3 h-3 rounded-full mr-3"
                              style={{ backgroundColor: tag.color }}
                            />
                            <div className="flex-1">
                              <div className="text-white text-sm font-medium">{tag.name}</div>
                              {tag.description && (
                                <div className="text-gray-400 text-xs">{tag.description}</div>
                              )}
                              <div className="text-gray-500 text-xs capitalize">{tag.category.replace('-', ' ')}</div>
                            </div>
                          </div>
                          {selectedTags.includes(tag.name) && (
                            <Check className="h-4 w-4 text-green-400" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <p className="text-xs text-gray-400 mt-2">
                  These tags control access to folders with access control restrictions
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  Update Tags
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
