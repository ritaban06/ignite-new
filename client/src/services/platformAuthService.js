import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

class PlatformAuthService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.isAndroid = Capacitor.getPlatform() === 'android';
    this.isIOS = Capacitor.getPlatform() === 'ios';
    this.isWeb = !this.isNative;
    
    // console.log('🔍 Platform Detection:', {
    //   isNative: this.isNative,
    //   isAndroid: this.isAndroid,
    //   isIOS: this.isIOS,
    //   isWeb: this.isWeb,
    //   platform: Capacitor.getPlatform()
    // });

    // Initialize native Social Login if we're on a native platform
    if (this.isNative) {
      this.initializeNativeSocialLogin();
    }
  }

  // Get the appropriate Google Client ID based on platform
  getGoogleClientId() {
    if (this.isAndroid) {
      return import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID;
    }
    // For web and iOS, use the web client ID
    return import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }

  async initializeNativeSocialLogin() {
    try {
      console.log('🚀 Initializing native Social Login...');
      console.log('📱 Platform:', Capacitor.getPlatform());
      console.log('🔑 Client ID:', this.getGoogleClientId());
      // SocialLogin does not require explicit initialization
      console.log('✅ Native Social Login ready');
    } catch (error) {
      console.error('❌ Failed to initialize native Social Login:', error);
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
      // Sign in with Google using SocialLogin
      const result = await SocialLogin.signIn({ provider: 'google' });
      console.log('✅ Native Google sign-in successful:', result);
      // Convert to format compatible with existing backend
      const credentials = {
        credential: result.idToken || result.accessToken,
        clientId: this.getGoogleClientId()
      };
      return credentials;
    } catch (error) {
      console.error('❌ Native Google sign-in failed:', error);
      // Error handling similar to previous implementation
      const msg = error.message || '';
      if (/cancel|CANCELED|12501/.test(msg)) {
        throw new Error('OAUTH_ERROR: Sign-in was cancelled or interrupted.');
      } else if (/network|7/.test(msg)) {
        throw new Error('OAUTH_ERROR: Network error. Please check your internet connection and try again.');
      } else if (/client|certificate|package|SHA|fingerprint|console|DEVELOPER_ERROR|INVALID_CLIENT|INVALID_PACKAGE_NAME|INVALID_CERTIFICATE|INVALID_AUDIENCE/.test(msg)) {
        throw new Error(`OAUTH_ERROR: ${msg} (Likely Google Console misconfiguration)`);
      } else {
        throw new Error(`OAUTH_ERROR: ${msg || 'Something went wrong with Google authentication. Please check your configuration.'}`);
      }
    }
  }

  async signOut() {
    try {
      if (this.isNative) {
        await SocialLogin.signOut({ provider: 'google' });
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
        const result = await SocialLogin.getCurrentUser({ provider: 'google' });
        return !!result?.idToken || !!result?.accessToken;
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