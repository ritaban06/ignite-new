import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Settings } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-gray-800 shadow-sm border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-white">PDF Admin Dashboard</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {user?.picture ? (
                <img 
                  src={user.picture} 
                  alt={user.name || user.email}
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e) => {
                    // Fallback to default avatar if image fails to load
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`h-8 w-8 bg-primary-900 rounded-full flex items-center justify-center ${user?.picture ? 'hidden' : ''}`}>
                <User className="h-4 w-4 text-primary-300" />
              </div>
              <span className="text-sm font-medium text-gray-300">{user?.email}</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
