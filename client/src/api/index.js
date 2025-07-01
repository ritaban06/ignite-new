import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
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
    if (error.response?.status === 401) {
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
  getProfile: () => api.get('/auth/profile'),
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
  
  // Search PDFs
  searchPDFs: (params) => api.get('/pdfs/search/query', { params }),
  
  // Get recent PDFs
  getRecentPDFs: (limit = 10) => api.get('/pdfs/user/recent', { params: { limit } }),
  
  // Get PDF statistics (for tracking)
  getPDFStats: (pdfId) => api.get(`/pdfs/${pdfId}/stats`),
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

export default api;
