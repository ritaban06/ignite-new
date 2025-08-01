import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginPage from './components/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import AuthDebug from './components/AuthDebug';

// Get the appropriate Google OAuth Client ID based on platform
const getGoogleClientId = () => {
  const isAndroid = Capacitor.getPlatform() === 'android';
  
  if (isAndroid) {
    // For Android, use Android-specific client ID if available, fallback to web client ID
    return import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }
  
  // For web, use web client ID
  return import.meta.env.VITE_GOOGLE_CLIENT_ID;
};

const GOOGLE_CLIENT_ID = getGoogleClientId() || 'your-google-client-id-here';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-purple-700">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-purple-50">
      <Header />
      {/* <AuthDebug /> */}
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/search" element={<SearchPage />} />
          {/* <Route path="/gdrive-manager" element={<GoogleDrivePDFManager />} /> */}
          {/* Catch all other routes and redirect to dashboard */}
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <AppContent />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: 'green',
                  secondary: 'black',
                },
              },
            }}
          />
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
