import React from 'react';
import { LogOut, User, Settings, Cloud, Home, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <img
                src="/newlogo.webp"
                alt="Ignite"
                className="h-8 w-auto"
              />
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
                Ignite
              </span>
            </div>
            
            {/* Navigation */}
            <nav className="flex space-x-4">
              <Link
                to="/dashboard"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/dashboard') || isActive('/')
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                }`}
              >
                <Home className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              
              <Link
                to="/search"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/search')
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                }`}
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </Link>
              
              <Link
                to="/r2-manager"
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/r2-manager')
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                }`}
              >
                <Cloud className="h-4 w-4" />
                <span>R2 Manager</span>
              </Link>
            </nav>
          </div>

          {/* User info and actions */}
          <div className="flex items-center space-x-4">
            {/* User info */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-600 to-primary-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user?.name}
                </span>
              </div>
              <div className="text-xs text-primary-600 font-medium">
                {user?.department} - Year {user?.year}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
                title="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
