import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000, // 30 seconds
  withCredentials: true, // Enable credentials for CORS
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
    // if (import.meta.env.DEV && error.response?.status === 401) {
    //   // In development, ignore 401 errors and do not redirect or clear auth
    //   return Promise.resolve({ data: {} });
    // }
    if (error.response?.status === 401) {
      // Check if this is a device switch error
      if (error.response?.data?.code === 'DEVICE_SWITCHED') {
        // Show specific message for device switch
        console.log('Session terminated due to device switch:', error.response.data.error);
        // Don't show a toast here as it might be confusing - let the login page handle it
      }
      
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
  searchPDFs: (params) => api.get('/pdfs/search/query', { params }),
  
  // Get recent PDFs
  getRecentPDFs: (limit = 10) => api.get('/pdfs/user/recent', { params: { limit } }),
  
  // Get PDF statistics (for tracking)
  getPDFStats: (pdfId) => api.get(`/pdfs/${pdfId}/stats`),
  
  // Get all PDFs from R2 bucket
  getAllPDFsFromR2: () => api.get('/pdfs/r2/list'),
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
