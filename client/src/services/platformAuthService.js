import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

class PlatformAuthService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.isAndroid = Capacitor.getPlatform() === 'android';
    this.isIOS = Capacitor.getPlatform() === 'ios';
    this.isWeb = !this.isNative;
    
    console.log('🔍 Platform Detection:', {
      isNative: this.isNative,
      isAndroid: this.isAndroid,
      isIOS: this.isIOS,
      isWeb: this.isWeb,
      platform: Capacitor.getPlatform()
    });

    // Initialize native Google Auth if we're on a native platform
    if (this.isNative) {
      this.initializeNativeGoogleAuth();
    }
  }

  async initializeNativeGoogleAuth() {
    try {
      // Initialize Google Auth for native platforms
      await GoogleAuth.initialize({
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });
      console.log('✅ Native Google Auth initialized');
    } catch (error) {
      console.error('❌ Failed to initialize native Google Auth:', error);
    }
  }

  async signInWithGoogle() {
    try {
      if (this.isNative) {
        return await this.nativeGoogleSignIn();
      } else {
        throw new Error('Native sign-in only available on mobile platforms. Use web OAuth instead.');
      }
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  }

  async nativeGoogleSignIn() {
    try {
      console.log('🔐 Starting native Google sign-in...');
      
      // Sign in with Google on native platform
      const result = await GoogleAuth.signIn();
      
      console.log('✅ Native Google sign-in successful:', {
        email: result.email,
        name: result.name,
        hasIdToken: !!result.authentication?.idToken
      });

      // Convert to format compatible with existing backend
      const credentials = {
        credential: result.authentication.idToken,
        clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID
      };

      return credentials;
    } catch (error) {
      console.error('❌ Native Google sign-in failed:', error);
      
      // Provide user-friendly error messages
      if (error.message?.includes('12501')) {
        throw new Error('Google sign-in was cancelled');
      } else if (error.message?.includes('10')) {
        throw new Error('Google Play Services not available or outdated');
      } else if (error.message?.includes('7')) {
        throw new Error('Network error - please check your internet connection');
      } else {
        throw new Error(error.message || 'Failed to sign in with Google');
      }
    }
  }

  async signOut() {
    try {
      if (this.isNative) {
        await GoogleAuth.signOut();
        console.log('✅ Native Google sign-out successful');
      }
    } catch (error) {
      console.error('❌ Native Google sign-out failed:', error);
      throw error;
    }
  }

  // Check if user is currently signed in (native platforms only)
  async isSignedIn() {
    try {
      if (this.isNative) {
        const result = await GoogleAuth.refresh();
        return !!result?.accessToken;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Get platform info for debugging
  getPlatformInfo() {
    return {
      isNative: this.isNative,
      isAndroid: this.isAndroid,
      isIOS: this.isIOS,
      isWeb: this.isWeb,
      platform: Capacitor.getPlatform(),
      hasGoogleClientId: !!import.meta.env.VITE_GOOGLE_CLIENT_ID
    };
  }
}

// Export singleton instance
export default new PlatformAuthService();
