import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
  const navigate = useNavigate();

  const handleGoHome = () => {
    navigate('/dashboard');
  };

  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-purple-100 rounded-full mb-4">
            <svg 
              className="w-12 h-12 text-purple-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.220 0-4.239.852-5.728 2.246m0 0A7.975 7.975 0 004 12c0-4.418 3.582-8 8-8s8 3.582 8 8a7.930 7.930 0 01-2.272 5.272"
              />
            </svg>
          </div>
          <h1 className="text-6xl font-bold text-purple-800 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-purple-700 mb-4">Page Not Found</h2>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <p className="text-purple-600 text-lg mb-2">
            Oops! The page you're looking for doesn't exist.
          </p>
          <p className="text-purple-500 text-sm">
            The page might have been moved, deleted, or you entered the wrong URL.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleGoHome}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition duration-200 ease-in-out transform hover:scale-105 shadow-md"
          >
            Go to Dashboard
          </button>
          
          <button
            onClick={handleGoBack}
            className="w-full bg-white hover:bg-purple-50 text-purple-600 font-medium py-3 px-6 rounded-lg border-2 border-purple-600 transition duration-200 ease-in-out transform hover:scale-105 shadow-md"
          >
            Go Back
          </button>
        </div>

        {/* Additional Help */}
        <div className="mt-8 pt-6 border-t border-purple-200">
          <p className="text-purple-500 text-sm">
            Need help? Contact support or check our documentation.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;