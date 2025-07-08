import React, { useState, useEffect } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle, CheckCircle, Loader2, Smartphone, Globe } from 'lucide-react';
import PlatformAuthService from '../services/platformAuthService';
import { useAuth } from '../contexts/AuthContext';

const HybridGoogleLogin = () => {
  const { googleSignIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [platformInfo, setPlatformInfo] = useState(null);

  useEffect(() => {
    // Get platform information
    const info = PlatformAuthService.getPlatformInfo();
    setPlatformInfo(info);
    console.log('🔍 Platform Info:', info);
  }, []);

  const handleWebGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError('');

    try {
      await googleSignIn(credentialResponse);
    } catch (error) {
      console.error('Web Google sign-in error:', error);
      setError(error.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNativeGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Use native Google Auth service
      const credentials = await PlatformAuthService.signInWithGoogle();
      
      // Send to backend using the same flow as web
      await googleSignIn(credentials);
    } catch (error) {
      console.error('Native Google sign-in error:', error);
      setError(error.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google sign-in was cancelled or failed. Please try again.');
  };

  if (!platformInfo) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
      </div>
    );
  }

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
          
          {/* Platform indicator */}
          <div className="mt-2 flex items-center justify-center space-x-2 text-xs text-gray-500">
            {platformInfo.isNative ? (
              <>
                <Smartphone className="h-3 w-3" />
                <span>Mobile App ({platformInfo.platform})</span>
              </>
            ) : (
              <>
                <Globe className="h-3 w-3" />
                <span>Web Browser</span>
              </>
            )}
          </div>
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
          ) : platformInfo.isNative ? (
            <button
              onClick={handleNativeGoogleSignIn}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow"
            >
              <Smartphone className="h-5 w-5" />
              <span>Sign in with Google (Mobile)</span>
            </button>
          ) : (
            <GoogleLogin
              onSuccess={handleWebGoogleSuccess}
              onError={handleGoogleError}
              size="large"
              theme="outline"
              text="signin_with"
              shape="rectangular"
              logo_alignment="left"
            />
          )}
        </div>

        {/* Debug info for development - commented out since platformInfo is disabled */}
        {import.meta.env.DEV && (
          <div className="text-xs text-gray-500 text-center space-y-1 bg-yellow-50 p-2 rounded border">
            <p className="font-semibold">Debug Info:</p>
            <p>Platform: {platformInfo.platform}</p>
            <p>Native: {platformInfo.isNative ? 'Yes' : 'No'}</p>
            <p>Web Client ID: {platformInfo.hasGoogleClientId ? 'Set' : 'Not Set'}</p>
            <p>Android Client ID: {platformInfo.hasAndroidClientId ? 'Set' : 'Not Set'}</p>
            <p>Using: {platformInfo.clientIdSource} Client ID</p>
            <p>Current ID: {platformInfo.currentClientId}</p>
            {platformInfo.warnings && platformInfo.warnings.length > 0 && (
              <div className="text-orange-600">
                <p className="font-semibold">Warnings:</p>
                {platformInfo.warnings.map((warning, i) => (
                  <p key={i}>• {warning}</p>
                ))}
              </div>
            )}
            {platformInfo.issues && platformInfo.issues.length > 0 && (
              <div className="text-red-600">
                <p className="font-semibold">Issues:</p>
                {platformInfo.issues.map((issue, i) => (
                  <p key={i}>• {issue}</p>
                ))}
              </div>
            )}
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
              <li>Your profile info comes from the approved users list</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HybridGoogleLogin;
