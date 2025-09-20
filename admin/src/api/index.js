// ...existing code...
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Enable credentials for CORS
  headers: {
    'Content-Type': 'application/json',
  },
});

export const folderAPI = {
  getAllFolders: () => api.get('/folders'),
  getSubjectFolders: () => api.get('/folders/subject-folders'),
  getGDriveFolders: () => api.get('/folders/gdrive'),
  getPdfsInFolder: (folderId) => api.get(`/folders/${folderId}/pdfs`),
  updateFolder: (folderId, data) => api.put(`/folders/${folderId}`, data),
  syncFoldersFromGDrive: () => api.post('/folders/gdrive/cache'),
};

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const gdriveConfigAPI = {
  getBaseFolderId: () => api.get('/folders/gdrive-base-id'),
};
export const gdriveAPI = {
  getFolders: () => api.get('/folders/gdrive'),
};

export const authAPI = {
  login: (credentials) => api.post('/auth/admin-login', credentials),
  logout: () => api.post('/auth/admin-logout'),
  getCurrentUser: () => api.get('/auth/admin/me'),
};

export const pdfAPI = {
  upload: (formData) => api.post('/admin/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  getAllPdfs: (params) => api.get('/pdfs', { params }),
  deletePdf: (id) => api.delete(`/admin/pdfs/${id}`),
  updatePdf: (id, data) => api.put(`/admin/pdfs/${id}`, data),
  getAnalytics: () => api.get('/admin/analytics'),
  fixOrphanedUploaders: () => api.post('/admin/fix-orphaned-uploaders'),
  cacheDrivePdfs: () => api.post('/pdfs/gdrive/cache'),
};

export const userAPI = {
  getAllUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  syncSheets: () => api.post('/admin/sync-sheets'),
  getSheetsStatus: () => api.get('/admin/sheets-status'),
};

export const accessTagAPI = {
  getAllTags: (params) => api.get('/access-tags', { params }),
  getTagStats: () => api.get('/access-tags/stats'),
  getAvailableTags: (params) => api.get('/access-tags/available', { params }),
  getTagsByCategory: (category) => api.get(`/access-tags/category/${category}`),
  getPopularTags: (limit) => api.get('/access-tags/popular', { params: { limit } }),
  createTag: (data) => api.post('/access-tags', data),
  updateTag: (id, data) => api.put(`/access-tags/${id}`, data),
  deleteTag: (id) => api.delete(`/access-tags/${id}`),
  bulkAction: (action, tagIds) => api.post('/access-tags/bulk', { action, tagIds }),
};

export default api;
