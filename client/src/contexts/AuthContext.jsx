import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const savedUser = localStorage.getItem('user');
        // let token = localStorage.getItem('authToken');
        // let savedUser = localStorage.getItem('user');

        // // In development, inject a mock user and token if missing
        // if (import.meta.env.DEV && (!token || !savedUser)) {
        //   token = 'dev-token';
        //   savedUser = JSON.stringify({
        //     id: 'dev-user',
        //     name: 'Dev User',
        //     email: 'dev@example.com',
        //     role: 'admin',
        //   });
        //   localStorage.setItem('authToken', token);
        //   localStorage.setItem('user', savedUser);
        // }

        if (token && savedUser) {
          setUser(JSON.parse(savedUser));
          setIsAuthenticated(true);

          // Verify token is still valid
          try {
            const response = await authAPI.getProfile();
            if (response.data.user) {
              setUser(response.data.user);
              localStorage.setItem('user', JSON.stringify(response.data.user));
            }
          } catch (error) {
            // Token is invalid, clear auth state
            console.error('Token validation failed:', error);
            
            // Handle authentication errors
            if (error.response?.status === 401) {
              console.log('Session expired or invalid');
              // Don't show error toast for auth errors as login page will handle it

          // // In development, skip backend token validation
          // if (!import.meta.env.DEV) {
          //   // Verify token is still valid
          //   try {
          //     const response = await authAPI.getProfile();
          //     if (response.data.user) {
          //       setUser(response.data.user);
          //       localStorage.setItem('user', JSON.stringify(response.data.user));
          //     }
          //   } catch (error) {
          //     // Token is invalid, clear auth state
          //     console.error('Token validation failed:', error);
          //     // Check if this is a device switch error
          //     if (error.response?.data?.code === 'DEVICE_SWITCHED') {
          //       console.log('Session was terminated due to login from another device');
          //       // Don't show error toast for device switches as it's expected behavior
          //     }
          //     logout(true); // true indicates this is an automatic logout
            }
            logout(true); // true indicates this is an automatic logout
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        logout();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials) => {
    try {
      setIsLoading(true);
      const response = await authAPI.login(credentials);
      
      if (response.data.token && response.data.user) {
        const { token, user: userData } = response.data;
        
        // Save to localStorage
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update state
        setUser(userData);
        setIsAuthenticated(true);
        
        toast.success(`Welcome back, ${userData.name}!`);
        return { success: true, user: userData };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error.response?.data?.error || 'Login failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setIsLoading(true);
      const response = await authAPI.register(userData);
      
      if (response.data.token && response.data.user) {
        const { token, user: newUser } = response.data;
        
        // Save to localStorage
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(newUser));
        
        // Update state
        setUser(newUser);
        setIsAuthenticated(true);
        
        toast.success(`Welcome to Ignite, ${newUser.name}!`);
        return { success: true, user: newUser };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = error.response?.data?.error || 'Registration failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (isAutomatic = false) => {
    try {
      // Call logout API to invalidate token on server
      await authAPI.logout();
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API call fails
    } finally {
      // Clear local storage and state
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      
      // Only show success message for manual logouts
      if (!isAutomatic) {
        toast.success('Logged out successfully');
      }
    }
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const googleSignIn = async (credentialResponse) => {
    try {
      setIsLoading(true);
      
      // Send the credential token to backend for verification
      const response = await authAPI.googleVerify({
        credential: credentialResponse.credential
      });
      
      if (response.data.token && response.data.user) {
        const { token, user: backendUser } = response.data;
        
        // Save to localStorage
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify(backendUser));
        
        // Update state
        setUser(backendUser);
        setIsAuthenticated(true);
        
        toast.success(`Welcome, ${backendUser.name}!`);
        return { success: true, user: backendUser };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Google sign-in failed';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  // // In development, always treat as authenticated
  // const effectiveIsAuthenticated = import.meta.env.DEV ? true : isAuthenticated;

  const value = {
    user,
    // isAuthenticated: effectiveIsAuthenticated,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    updateUser,
    googleSignIn,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
