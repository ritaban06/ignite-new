import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 300000, // 5 minutes
  withCredentials: true, // Enable credentials for CORS
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
// Use a consistent key for JWT token storage
function getJwtToken() {
  // Try multiple keys for compatibility
  return localStorage.getItem('jwtToken') || localStorage.getItem('authToken') || '';
}

api.interceptors.request.use(
  (config) => {
    const token = getJwtToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // if (import.meta.env.DEV && error.response?.status === 401) {
    //   // In development, ignore 401 errors and do not redirect or clear auth
    //   return Promise.resolve({ data: {} });
    // }
    if (error.response?.status === 401) {
      // Handle authentication errors
      console.log('Authentication error:', error.response.data.error);
      // Don't show a toast here as it might be confusing - let the login page handle it
      
      // Clear auth data and redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
  getProfile: () => api.get('/auth/me'),
  googleVerify: (googleData) => api.post('/auth/google-verify', googleData),
};

// PDF API
export const pdfAPI = {
  // Get PDFs with filters and pagination
  getPDFs: (params = {}) => api.get('/pdfs', { params }),
  
  // Get single PDF details
  getPDF: (pdfId) => api.get(`/pdfs/${pdfId}`),
  
  // Get secure view URL for PDF
  getViewURL: (pdfId) => api.post(`/pdfs/${pdfId}/view`),
  
  // Get PDF as base64 data (alternative for when direct fetch is blocked)
  getPDFBase64: (pdfId) => api.post(`/pdfs/${pdfId}/view-base64`),
  
  // Search PDFs
  searchPDFs: (params) => api.get('/folders/search', { params }),
  
  // Get recent PDFs
  getRecentPDFs: (limit = 10) => api.get('/pdfs/user/recent', { params: { limit } }),
  
  // Get PDF statistics (for tracking)
  getPDFStats: (pdfId) => api.get(`/pdfs/${pdfId}/stats`),
  
  // Get all PDFs from Google Drive
  getAllPDFsFromGoogleDrive: () => api.get('/pdfs/gdrive/list'),
};

// Folder API for folder-based management
export const folderAPI = {
  // Get all folders from Google Drive with hierarchy
  getFolders: () => api.get('/folders/gdrive'),
  
  // Get folders from MongoDB with metadata
  getFoldersWithMetadata: () => api.get('/folders'),
  
  // Get files in a specific folder (universal)
  getFilesInFolder: (folderId) => api.get(`/folders/${folderId}/files`),
  // Get PDFs in a specific folder
  getPdfsInFolder: (folderId) => api.get(`/folders/${folderId}/pdfs`),
  
  // Get secure view URL for any file
  getViewURL: (fileId) => api.post(`/folders/file/${fileId}/view`),
  
  // Update folder metadata (access control, etc.)
  updateFolder: (folderId, folderData) => api.put(`/folders/${folderId}`, folderData),
  
  // Cache/sync folders from Google Drive
  cacheFolders: () => api.post('/folders/gdrive/cache'),
  
  // Get Google Drive base folder ID
  getBaseFolderId: () => api.get('/folders/gdrive-base-id'),
};

// Legacy Google Drive API (kept for backward compatibility)
export const gdriveAPI = {
  getFolders: () => folderAPI.getFolders(),
  getPdfsInFolder: (folderId) => folderAPI.getPdfsInFolder(folderId),
};

// User API
export const userAPI = {
  // Get current user profile
  getProfile: () => api.get('/users/profile'),
  
  // Update user profile
  updateProfile: (userData) => api.put('/users/profile', userData),
  
  // Change password
  changePassword: (passwordData) => api.post('/users/change-password', passwordData),
  
  // Get user activity/access logs
  getActivity: (params = {}) => api.get('/users/activity', { params }),
};

// Annotation API
// export const annotationAPI = {
//   // Get annotations for a PDF for the current user
//   getAnnotations: (pdfId) => api.get(`/annotations/${pdfId}`),
//   // Save or update annotations for a PDF for the current user
//   saveAnnotations: (pdfId, annotationData) => api.post(`/annotations/${pdfId}`, { annotationData }),
// };

export default api;
