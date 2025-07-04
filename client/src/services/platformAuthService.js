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

  // Get the appropriate Google Client ID based on platform
  getGoogleClientId() {
    if (this.isAndroid) {
      return import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID;
    }
    // For web and iOS, use the web client ID
    return import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }

  async initializeNativeGoogleAuth() {
    try {
      console.log('🚀 Initializing native Google Auth...');
      console.log('📱 Platform:', Capacitor.getPlatform());
      console.log('🔑 Client ID:', this.getGoogleClientId());
      
      // For @codetrix-studio/capacitor-google-auth, the plugin configuration
      // is handled automatically through capacitor.config.json
      // We just need to initialize without extra parameters
      await GoogleAuth.initialize();
      console.log('✅ Native Google Auth initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize native Google Auth:', error);
      console.error('❌ Initialization error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
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
      console.log('📱 Platform info:', {
        isNative: this.isNative,
        isAndroid: this.isAndroid,
        platform: Capacitor.getPlatform()
      });
      console.log('🔑 Using client ID:', this.getGoogleClientId());
      
      // Sign in with Google on native platform
      const result = await GoogleAuth.signIn();
      
      console.log('✅ Native Google sign-in successful:', {
        email: result.email,
        name: result.name,
        hasIdToken: !!result.authentication?.idToken,
        result: JSON.stringify(result, null, 2)
      });

      // Convert to format compatible with existing backend
      const credentials = {
        credential: result.authentication.idToken,
        clientId: this.getGoogleClientId()
      };

      return credentials;
    } catch (error) {
      console.error('❌ Native Google sign-in failed:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
        fullError: JSON.stringify(error, null, 2)
      });
      
      // Provide user-friendly error messages
      if (error.message?.includes('12501')) {
        throw new Error('Google sign-in was cancelled. Please try again.');
      } else if (error.message?.includes('10')) {
        throw new Error('Google Play Services not available or outdated. Please update Google Play Services.');
      } else if (error.message?.includes('7')) {
        throw new Error('Network error - please check your internet connection');
      } else if (error.message?.includes('DEVELOPER_ERROR')) {
        throw new Error('Configuration error - please check SHA-1 fingerprint in Google Cloud Console');
      } else {
        throw new Error(`Google OAuth Error: ${error.message || 'Unknown error occurred'}`);
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
    const webClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const androidClientId = import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID;
    const currentClientId = this.getGoogleClientId();
    const validation = this.validateEnvironment();
    
    return {
      isNative: this.isNative,
      isAndroid: this.isAndroid,
      isIOS: this.isIOS,
      isWeb: this.isWeb,
      platform: Capacitor.getPlatform(),
      hasGoogleClientId: !!webClientId,
      hasAndroidClientId: !!androidClientId,
      currentClientId: currentClientId ? currentClientId.substring(0, 12) + '...' : 'Not Set',
      clientIdSource: this.isAndroid && androidClientId ? 'Android' : 'Web',
      isValid: validation.isValid,
      issues: validation.issues,
      warnings: validation.warnings
    };
  }

  // Validate environment configuration
  validateEnvironment() {
    const webClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const androidClientId = import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID;
    
    const issues = [];
    
    if (!webClientId) {
      issues.push('VITE_GOOGLE_CLIENT_ID is not set');
    }
    
    if (this.isAndroid && !androidClientId) {
      console.warn('⚠️ VITE_GOOGLE_ANDROID_CLIENT_ID not set, falling back to web client ID');
    }
    
    if (this.isAndroid && !androidClientId && !webClientId) {
      issues.push('No Google Client ID configured for Android platform');
    }
    
    return {
      isValid: issues.length === 0,
      issues,
      warnings: this.isAndroid && !androidClientId ? ['Android client ID not set, using web fallback'] : []
    };
  }
}

// Export singleton instance
export default new PlatformAuthService();
