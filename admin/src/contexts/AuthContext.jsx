import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI } from '../api';
import socketService from '../services/socketService';

const AuthContext = createContext();

const initialState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        error: null,
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('adminToken');
      if (token) {
        try {
          const response = await authAPI.getCurrentUser();
          if (response.data.user.role === 'admin') {
            dispatch({ type: 'LOGIN_SUCCESS', payload: response.data.user });
            
            // Initialize socket connection for real-time updates
            socketService.connect();
          } else {
            localStorage.removeItem('adminToken');
            dispatch({ type: 'LOGIN_FAILURE', payload: 'Access denied' });
          }
        } catch (error) {
          localStorage.removeItem('adminToken');
          dispatch({ type: 'LOGIN_FAILURE', payload: 'Session expired' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initAuth();
  }, []);

  const login = async (credentials) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;
      
      if (user.role !== 'admin') {
        throw new Error('Access denied. Admin privileges required.');
      }
      
      localStorage.setItem('adminToken', token);
      dispatch({ type: 'LOGIN_SUCCESS', payload: user });
      
      // Initialize socket connection for real-time updates
      socketService.connect();
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.error || error.message || 'Login failed';
      dispatch({ type: 'LOGIN_FAILURE', payload: message });
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('adminToken');
      dispatch({ type: 'LOGOUT' });
      
      // Disconnect socket
      socketService.disconnect();
    }
  };

  const value = {
    ...state,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
