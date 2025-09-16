import React, { useEffect } from 'react';
import { getMaintenanceConfig } from '../utils/maintenanceMode';

const MaintenancePage = () => {
  const currentYear = new Date().getFullYear();
  const maintenanceConfig = getMaintenanceConfig();

  // Auto-refresh the page to check if maintenance is complete
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      window.location.reload();
    }, maintenanceConfig.autoRefreshInterval);

    return () => clearInterval(refreshInterval);
  }, [maintenanceConfig.autoRefreshInterval]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Maintenance Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-32 h-32 bg-purple-200 rounded-full mb-6 animate-pulse">
            <svg 
              className="w-16 h-16 text-purple-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-purple-800 mb-4">Under Maintenance</h1>
        </div>

        {/* Message */}
        <div className="mb-8">
          <p className="text-purple-700 text-xl mb-4 font-medium">
            {maintenanceConfig.message}
          </p>
          <p className="text-purple-600 text-lg mb-6">
            Our system is currently undergoing scheduled maintenance. We'll be back online shortly.
          </p>
          
          {/* Estimated time */}
          <div className="bg-white rounded-lg p-6 shadow-md border border-purple-200 mb-6">
            <h3 className="text-purple-700 font-semibold mb-2">Estimated Duration</h3>
            <p className="text-purple-600">
              This maintenance is expected to complete within {maintenanceConfig.estimatedDuration}.
            </p>
          </div>
        </div>

        {/* Status Updates */}
        <div className="bg-purple-600 text-white rounded-lg p-6 shadow-lg mb-8">
          <h3 className="font-semibold mb-2 flex items-center justify-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            What's happening?
          </h3>
          <div className="text-left space-y-2 text-purple-100">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
              <span>Server updates</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3"></div>
              <span>Database optimization</span>
            </div>
            <div className="flex items-center">
              <div className="w-2 h-2 bg-gray-400 rounded-full mr-3"></div>
              <span>Security enhancements</span>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="text-center">
          <p className="text-purple-600 text-sm mb-4">
            For urgent matters, please contact our support team.
          </p>
          <div className="flex justify-center space-x-4 text-sm text-purple-500">
            <span>© {currentYear} Ignite</span>
            <span>•</span>
            <span>Thank you for your patience</span>
          </div>
        </div>

        {/* Auto refresh note */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-blue-700 text-sm">
            💡 This page will automatically refresh every 5 minutes to check if maintenance is complete.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;