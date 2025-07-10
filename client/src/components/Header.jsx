import React, { useState, useEffect } from "react";
import {
  LogOut,
  User,
  Settings,
  Cloud,
  Home,
  Search,
  Menu,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
    // Cleanup on unmount
    return () => document.body.classList.remove('overflow-hidden');
  }, [isMobileMenuOpen]);

  return (
   <header className="fixed top-0 left-0 right-0 z-50 bg-purple-700/100 backdrop-blur-md shadow-lg border-b border-purple-200/20 animate-slide-down duration-700">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex justify-between items-center h-16">
      
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
        <img src="/newlogo.webp" alt="Ignite" className="h-6 w-auto sm:h-8" />
        <span className="ml-2 text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          Ignite
        </span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex space-x-4">
        <Link
          to="/dashboard"
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive('/dashboard') || isActive('/')
              ? 'bg-purple-500/20 text-white'
              : 'text-white/80 hover:text-white hover:bg-purple-500/20'
          }`}
        >
          <Home className="h-4 w-4" />
          <span>Dashboard</span>
        </Link>

        <Link
          to="/search"
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive('/search')
              ? 'bg-purple-500/20 text-white'
              : 'text-white/80 hover:text-white hover:bg-purple-500/20'
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Search</span>
        </Link>

        <Link
          to="/r2-manager"
          className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isActive('/r2-manager')
              ? 'bg-purple-500/20 text-white'
              : 'text-white/80 hover:text-white hover:bg-purple-500/20'
          }`}
        >
          <Cloud className="h-4 w-4" />
          <span>R2 Manager</span>
        </Link>
      </nav>

      {/* Desktop User Info and Actions */}
      <div className="hidden md:flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className={`w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full flex items-center justify-center ${
                user?.picture ? 'hidden' : ''
              }`}
            >
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="hidden lg:block">
              <div className="text-sm font-medium text-white">{user?.name}</div>
              <div className="text-xs text-white/70 font-medium">
                {user?.department} - Year {user?.year}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            className="p-2 text-white/70 hover:text-white hover:bg-purple-500/20 rounded-md transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-100/10 rounded-md transition-colors"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium hidden lg:block">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center space-x-2">
        <div className="flex items-center">
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user.name}
              className="w-6 h-6 rounded-full object-cover"
            />
          ) : (
            <div className="w-6 h-6 bg-gradient-to-r from-indigo-600 to-purple-500 rounded-full flex items-center justify-center">
              <User className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-white/70 hover:text-white hover:bg-purple-500/20 rounded-md transition-colors"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>

    {/* Mobile Menu */}
    {isMobileMenuOpen && (
      <div className="md:hidden bg-gradient-to-br from-purple-800 via-purple-700 to-purple-900 backdrop-blur-md border border-purple-200/20 ">
        <div className="px-2 pt-2 pb-3 space-y-1">
          {/* User Info */}
          <div className="px-3 py-2 text-center border-b border-white/10 mb-2">
            <div className="text-sm font-medium text-white">{user?.name}</div>
            <div className="text-xs text-white/70">
              {user?.department} - Year {user?.year}
            </div>
          </div>

          {/* Navigation */}
          <Link
            to="/dashboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
              isActive('/dashboard') || isActive('/')
                ? 'bg-purple-500/20 text-white'
                : 'text-white/80 hover:text-white hover:bg-purple-500/20'
            }`}
          >
            <Home className="h-5 w-5" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/search"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
              isActive('/search')
                ? 'bg-purple-500/20 text-white'
                : 'text-white/80 hover:text-white hover:bg-purple-500/20'
            }`}
          >
            <Search className="h-5 w-5" />
            <span>Search</span>
          </Link>

          <Link
            to="/r2-manager"
            onClick={() => setIsMobileMenuOpen(false)}
            className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors ${
              isActive('/r2-manager')
                ? 'bg-purple-500/20 text-white'
                : 'text-white/80 hover:text-white hover:bg-purple-500/20'
            }`}
          >
            <Cloud className="h-5 w-5" />
            <span>R2 Manager</span>
          </Link>

          {/* Actions */}
          <div className="border-t border-white/10 pt-2 mt-2">
            <button
              className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-white/80 hover:text-white hover:bg-purple-500/20 transition-colors w-full text-left"
              title="Settings"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium text-red-500 hover:text-red-600 hover:bg-red-100/10 transition-colors w-full text-left"
            >
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    )}
  </div>
</header>


  );
};

export default Header;
