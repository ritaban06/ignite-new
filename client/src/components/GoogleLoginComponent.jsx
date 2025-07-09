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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1b0b42] via-[#24125a] to-[#2d176b] animate-fade-in duration-700">
      <div className="w-full max-w-md mx-auto px-4 py-8 bg-[rgba(27,11,66,0.7)] backdrop-blur-md rounded-xl shadow-lg border border-[rgba(255,255,255,0.12)] space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Sign in to Ignite
          </h2>
          <p className="text-base text-white/80">
            Only approved users can access this platform
          </p>
        </div>

        {error && (
          <div className="bg-[rgba(255,0,0,0.08)] p-3 rounded-lg border border-red-400">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-200">{error}</p>
            </div>
          </div>
        )}

        <div className="flex justify-center">
          {isLoading ? (
            <div className="flex items-center space-x-2 bg-[rgba(255,255,255,0.06)] px-6 py-3 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-white/80" />
              <span className="text-white/80">Verifying approval status...</span>
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

        {/* Information Box */}
        <div className="bg-[rgba(255,255,255,0.06)] p-4 rounded-lg border border-[rgba(255,255,255,0.15)]">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-white/80">
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
    </div>
  );
};

export default GoogleLoginComponent;
