import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Tag,
  Users,
  Folder,
  BarChart3,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  MoreVertical,
  Palette
} from 'lucide-react';
import toast from 'react-hot-toast';
import socketService from '../services/socketService';

const AccessTagsPage = () => {
  // Temporary: show construction message only
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <div className="text-6xl font-bold text-yellow-400 mb-6">🚧 In Construction 🚧</div>
      <div className="text-2xl text-gray-300 mb-4">Coming in V2, stay tuned!</div>
    </div>
  );
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [stats, setStats] = useState(null);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: 'other',
    color: '#3B82F6'
  });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: 'other',
    color: '#3B82F6',
    isActive: true
  });

  const categories = [
    { value: 'academic', label: 'Academic', color: '#10B981' },
    { value: 'department', label: 'Department', color: '#F59E0B' },
    { value: 'special-group', label: 'Special Group', color: '#8B5CF6' },
    { value: 'course', label: 'Course', color: '#06B6D4' },
    { value: 'project', label: 'Project', color: '#EF4444' },
    { value: 'research', label: 'Research', color: '#84CC16' },
    { value: 'temporary', label: 'Temporary', color: '#F97316' },
    { value: 'other', label: 'Other', color: '#6B7280' }
  ];

  const predefinedColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16', '#F97316',
    '#EC4899', '#6366F1', '#14B8A6', '#F43F5E'
  ];

  // API functions
  const fetchTags = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (statusFilter) params.append('active', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      params.append('sort', sortBy);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/access-tags?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (error) {
      console.error('Fetch tags error:', error);
      toast.error('Failed to load access tags');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/access-tags/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Fetch stats error:', error);
      toast.error('Failed to load statistics');
    }
  };

  const createTag = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/access-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(createForm)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tag');
      }
      
      toast.success('Access tag created successfully');
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', category: 'other', color: '#3B82F6' });
      fetchTags();
    } catch (error) {
      console.error('Create tag error:', error);
      toast.error(error.message);
    }
  };

  const updateTag = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/access-tags/${selectedTag._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify(editForm)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update tag');
      }
      
      toast.success('Access tag updated successfully');
      setShowEditModal(false);
      setSelectedTag(null);
      fetchTags();
    } catch (error) {
      console.error('Update tag error:', error);
      toast.error(error.message);
    }
  };

  const deleteTag = async (tagId) => {
    if (!confirm('Are you sure you want to delete this access tag?')) return;
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/access-tags/${tagId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete tag');
      }
      
      toast.success('Access tag deleted successfully');
      fetchTags();
    } catch (error) {
      console.error('Delete tag error:', error);
      toast.error(error.message);
    }
  };

  const bulkAction = async (action) => {
    if (selectedTags.length === 0) {
      toast.error('Please select tags to perform bulk action');
      return;
    }

    const actionText = action === 'activate' ? 'activate' : action === 'deactivate' ? 'deactivate' : 'delete';
    if (!confirm(`Are you sure you want to ${actionText} ${selectedTags.length} selected tag(s)?`)) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/access-tags/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ action, tagIds: selectedTags })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${actionText} tags`);
      }
      
      toast.success(`Successfully ${actionText}d ${selectedTags.length} tag(s)`);
      setSelectedTags([]);
      fetchTags();
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error(error.message);
    }
  };

  const handleEditTag = (tag) => {
    setSelectedTag(tag);
    setEditForm({
      name: tag.name,
      description: tag.description || '',
      category: tag.category,
      color: tag.color,
      isActive: tag.isActive
    });
    setShowEditModal(true);
  };

  const toggleTagSelection = (tagId) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const selectAllTags = () => {
    if (selectedTags.length === filteredTags.length) {
      setSelectedTags([]);
    } else {
      setSelectedTags(filteredTags.map(tag => tag._id));
    }
  };

  const getCategoryInfo = (category) => {
    return categories.find(cat => cat.value === category) || categories.find(cat => cat.value === 'other');
  };

  // Filter and sort tags
  const filteredTags = tags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (tag.description && tag.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !categoryFilter || tag.category === categoryFilter;
    const matchesStatus = !statusFilter || 
                         (statusFilter === 'active' && tag.isActive) ||
                         (statusFilter === 'inactive' && !tag.isActive);
    
    return matchesSearch && matchesCategory && matchesStatus;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'usage':
        return (b.assignedCount || 0) - (a.assignedCount || 0);
      case 'category':
        return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
      case 'created':
        return new Date(b.createdAt) - new Date(a.createdAt);
      default:
        return a.name.localeCompare(b.name);
    }
  });

  useEffect(() => {
    fetchTags();
    fetchStats();
  }, [categoryFilter, statusFilter, searchTerm, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Access Tags Management</h1>
            <p className="mt-2 text-gray-300">
              Manage predefined access tags for users and folders
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowStatsModal(true)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Statistics
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Tag
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tags..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
          
          <select
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          
          <select
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Sort by Name</option>
            <option value="usage">Sort by Usage</option>
            <option value="category">Sort by Category</option>
            <option value="created">Sort by Created Date</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTags.length > 0 && (
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-white">
              {selectedTags.length} tag(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => bulkAction('activate')}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors"
              >
                Activate
              </button>
              <button
                onClick={() => bulkAction('deactivate')}
                className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                Deactivate
              </button>
              <button
                onClick={() => bulkAction('delete')}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tags Table */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">
            Loading access tags...
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No access tags found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedTags.length === filteredTags.length && filteredTags.length > 0}
                      onChange={selectAllTags}
                      className="rounded border-gray-500 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Tag
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Usage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-600">
                {filteredTags.map((tag) => {
                  const categoryInfo = getCategoryInfo(tag.category);
                  return (
                    <tr key={tag._id} className="hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag._id)}
                          onChange={() => toggleTagSelection(tag._id)}
                          className="rounded border-gray-500 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <div>
                            <div className="text-white font-medium">{tag.name}</div>
                            {tag.description && (
                              <div className="text-gray-400 text-sm">{tag.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: categoryInfo.color + '40', borderColor: categoryInfo.color }}
                        >
                          {categoryInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-white">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{tag.assignedUsers?.length || 0}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Folder className="h-4 w-4 text-gray-400" />
                            <span>{tag.assignedFolders?.length || 0}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          tag.isActive 
                            ? 'bg-green-900 bg-opacity-40 text-green-300 border border-green-700'
                            : 'bg-red-900 bg-opacity-40 text-red-300 border border-red-700'
                        }`}>
                          {tag.isActive ? (
                            <><CheckCircle className="h-3 w-3 mr-1" />Active</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" />Inactive</>
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {new Date(tag.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditTag(tag)}
                            className="text-blue-400 hover:text-blue-300"
                            title="Edit Tag"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteTag(tag._id)}
                            className="text-red-400 hover:text-red-300"
                            title="Delete Tag"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Tag Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Create Access Tag</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <form onSubmit={createTag} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Tag Name *</label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter tag name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter tag description"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Category *</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={createForm.color}
                      onChange={(e) => setCreateForm({ ...createForm, color: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-600 bg-gray-700"
                    />
                    <div className="flex flex-wrap gap-1">
                      {predefinedColors.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCreateForm({ ...createForm, color })}
                          className={`w-6 h-6 rounded border-2 ${
                            createForm.color === color ? 'border-white' : 'border-gray-600'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                >
                  Create Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tag Modal */}
      {showEditModal && selectedTag && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Edit Access Tag</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <form onSubmit={updateTag} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Tag Name *</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter tag name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Description</label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter tag description"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Category *</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    required
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editForm.color}
                      onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-600 bg-gray-700"
                    />
                    <div className="flex flex-wrap gap-1">
                      {predefinedColors.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setEditForm({ ...editForm, color })}
                          className={`w-6 h-6 rounded border-2 ${
                            editForm.color === color ? 'border-white' : 'border-gray-600'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="rounded border-gray-500 text-primary-600 focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-gray-300">
                    Active
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                >
                  Update Tag
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Statistics Modal */}
      {showStatsModal && stats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl border border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white">Access Tags Statistics</h2>
              <button
                onClick={() => setShowStatsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{stats.total}</div>
                  <div className="text-gray-400 text-sm">Total Tags</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">{stats.active}</div>
                  <div className="text-gray-400 text-sm">Active</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">{stats.inactive}</div>
                  <div className="text-gray-400 text-sm">Inactive</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-400">{stats.usage.totalUsage}</div>
                  <div className="text-gray-400 text-sm">Total Usage</div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Category Breakdown</h3>
                <div className="space-y-2">
                  {stats.categoryBreakdown.map(item => {
                    const categoryInfo = getCategoryInfo(item._id);
                    return (
                      <div key={item._id} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: categoryInfo.color }}
                          />
                          <span className="text-white">{categoryInfo.label}</span>
                        </div>
                        <span className="text-gray-400">{item.count} tags</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessTagsPage;