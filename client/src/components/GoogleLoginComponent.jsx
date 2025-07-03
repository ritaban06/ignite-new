import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import GoogleAuthService from '../services/googleAuthService';
import { useAuth } from '../contexts/AuthContext';

const GoogleLoginComponent = () => {
  const { googleSignIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError('');

    try {
      // Send credential directly to backend for verification and approval check
      await googleSignIn(credentialResponse);

    } catch (error) {
      console.error('Google sign-in error:', error);
      setError(error.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-3 sm:space-y-4">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
            Sign in to Ignite
          </h2>
          <p className="text-sm sm:text-base text-gray-600">
            Only approved users can access this platform
          </p>
        </div>

        {error && (
          <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs sm:text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          {isLoading ? (
            <div className="flex items-center space-x-2 bg-gray-100 px-6 py-3 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
              <span className="text-gray-600">Verifying approval status...</span>
            </div>
          ) : (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              size="large"
              theme="outline"
              text="signin_with"
              shape="rectangular"
              logo_alignment="left"
            />
          )}
        </div>
      </div>

      {/* Information Box */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-start space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="space-y-1 list-disc list-inside ml-2">
              <li>Sign in with your Google account</li>
              <li>We verify you're in the approved users list</li>
              <li>If approved, you get access to the platform</li>
              <li>Your profile info comes from the approved users sheet</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleLoginComponent;
