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
      
      // Enhanced error logging to see actual error details
      console.error('❌ Error Message:', error.message);
      console.error('❌ Error Code:', error.code);
      console.error('❌ Error Name:', error.name);
      console.error('❌ Full Error Object:', error);
      
      // Try to extract more error details
      if (error.originalError) {
        console.error('❌ Original Error:', error.originalError);
      }
      if (error.details) {
        console.error('❌ Error Details:', error.details);
      }
      
      // Log current configuration for debugging
      console.error('🔧 Client ID:', this.getGoogleClientId());
      console.error('🔧 Platform:', Capacitor.getPlatform());
      console.error('🔧 Has Google Client ID:', !!import.meta.env.VITE_GOOGLE_CLIENT_ID);
      console.error('🔧 Has Android Client ID:', !!import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID);
      
      // Map specific error codes to user-friendly messages
      const errorCode = error.code || (error.message?.match(/\d+/) && parseInt(error.message.match(/\d+/)[0]));
      
      console.error('🎯 Identified Error Code:', errorCode);
      
      if (errorCode === 12501 || error.message?.includes('12501')) {
        throw new Error('OAUTH_ERROR: Sign-in was cancelled or SHA-1 fingerprint mismatch. Please check Google Cloud Console SHA-1 configuration.');
      } else if (errorCode === 10 || error.message?.includes('10')) {
        throw new Error('OAUTH_ERROR: Google Play Services not available or outdated. Please update Google Play Services on your Samsung device and try again.');
      } else if (errorCode === 7 || error.message?.includes('7')) {
        throw new Error('OAUTH_ERROR: Network error. Please check your internet connection and try again.');
      } else if (error.message?.includes('DEVELOPER_ERROR')) {
        throw new Error('OAUTH_ERROR: Configuration error. Please verify SHA-1 fingerprint and OAuth client setup in Google Cloud Console.');
      } else if (error.message?.includes('API_NOT_AVAILABLE')) {
        throw new Error('OAUTH_ERROR: Google APIs not available. Please enable Google+ API and Google Identity API in Google Cloud Console.');
      } else if (error.message?.includes('INTERNAL_ERROR')) {
        throw new Error('OAUTH_ERROR: Internal Google error. Please try again or contact support.');
      } else {
        throw new Error(`OAUTH_ERROR: ${error.message || 'Something went wrong with Google authentication. Please check your configuration.'}`);
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
