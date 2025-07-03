import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import GoogleAuthService from '../services/googleAuthService';
import { useAuth } from '../contexts/AuthContext';

const GoogleLoginComponent = () => {
  const { googleSignIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCapacitor, setIsCapacitor] = useState(false);

  useEffect(() => {
    // Check if we're running in Capacitor
    if (window.Capacitor?.isNativePlatform) {
      setIsCapacitor(window.Capacitor.isNativePlatform());
    }
  }, []);

  const handleNativeGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      // For now, show instructions for native setup
      setError('Native Google Sign-In setup required. Please ensure Google Services are configured in your Android project.');
    } catch (error) {
      console.error('Native Google sign-in error:', error);
      setError(error.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
          ) : isCapacitor ? (
            // Native button for Capacitor
            <button
              onClick={handleNativeGoogleSignIn}
              className="flex items-center space-x-3 bg-white border border-gray-300 rounded-lg px-6 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Sign in with Google</span>
            </button>
          ) : (
            // Web Google OAuth button
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

        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 text-center">
            <p>Environment: {isCapacitor ? 'Capacitor/Native' : 'Web'}</p>
            <p>Client ID: {import.meta.env.VITE_GOOGLE_CLIENT_ID ? 'Set' : 'Not Set'}</p>
          </div>
        )}
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
