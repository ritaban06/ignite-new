import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { AlertCircle, CheckCircle, Loader2, Info } from 'lucide-react';
import GoogleAuthService from '../services/googleAuthService';
import GoogleSheetsService from '../services/googleSheetsService';
import { useAuth } from '../contexts/AuthContext';

const GoogleLoginComponent = () => {
  const { googleSignIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [showSheetInput, setShowSheetInput] = useState(false);

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    setError('');

    try {
      // Extract user info from Google response
      const userInfo = GoogleAuthService.extractUserInfo(credentialResponse);
      
      // Validate Google user
      GoogleAuthService.validateGoogleUser(userInfo);

      // Check if user is in approved list (if sheet URL is provided)
      if (sheetUrl.trim()) {
        const approvalResult = await GoogleSheetsService.isUserApproved(
          userInfo.email, 
          sheetUrl.trim()
        );

        if (!approvalResult.approved) {
          throw new Error(
            `Sorry, your email (${userInfo.email}) is not in the approved users list. Please contact an administrator to get approval.`
          );
        }

        // Merge Google info with approved user data
        const mergedUserData = {
          ...userInfo,
          year: approvalResult.userData.year,
          department: approvalResult.userData.department,
          approvedAt: new Date().toISOString()
        };

        // Attempt to sign in with the approved user data
        await googleSignIn(mergedUserData, credentialResponse.credential);
      } else {
        setError('Please provide the approved users Google Sheet URL to continue.');
        setShowSheetInput(true);
        return;
      }

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

  const handleSheetUrlSubmit = (e) => {
    e.preventDefault();
    if (sheetUrl.trim()) {
      setShowSheetInput(false);
      setError('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sheet URL Input */}
      {(showSheetInput || !sheetUrl) && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-2 mb-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                Approved Users Google Sheet Required
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                Please provide the public Google Sheet URL containing approved users list.
                The sheet should have columns: email, name, year, department.
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSheetUrlSubmit} className="space-y-3">
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/..."
              className="w-full px-3 py-2 border border-blue-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Set Approved Users Sheet
            </button>
          </form>
        </div>
      )}

      {/* Google Sign-in Button */}
      {sheetUrl && !showSheetInput && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Sign in to Ignite
            </h2>
            <p className="text-gray-600">
              Only approved users can access this platform
            </p>
          </div>

          {error && (
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
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

          <div className="text-center">
            <button
              onClick={() => setShowSheetInput(true)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Change approved users sheet
            </button>
          </div>
        </div>
      )}

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
