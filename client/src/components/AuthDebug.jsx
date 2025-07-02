import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const AuthDebug = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  const checkAuthState = () => {
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    
    console.log('=== CLIENT AUTH DEBUG ===');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('isLoading:', isLoading);
    console.log('user from context:', user);
    console.log('token in localStorage:', token ? 'Present' : 'Missing');
    console.log('token length:', token?.length);
    console.log('token preview:', token ? token.substring(0, 20) + '...' : 'No token');
    console.log('user in localStorage:', savedUser ? 'Present' : 'Missing');
    console.log('API URL:', import.meta.env.VITE_API_URL || '/api');
    console.log('Current URL:', window.location.href);
    console.log('========================');
  };

  return (
    <div className="fixed top-4 right-4 z-50 bg-primary-100/90 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-primary-200 max-w-sm">
      <h3 className="font-bold text-sm mb-2 text-primary-800">Auth Debug</h3>
      <div className="text-xs space-y-1 text-primary-700">
        <div>Status: {isLoading ? 'Loading...' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
        <div>User: {user?.name || 'None'}</div>
        <div>Token: {localStorage.getItem('authToken') ? 'Present' : 'Missing'}</div>
      </div>
      <button
        onClick={checkAuthState}
        className="mt-2 px-2 py-1 bg-primary-600 text-white text-xs rounded hover:bg-primary-700"
      >
        Debug Console
      </button>
    </div>
  );
};

export default AuthDebug;
