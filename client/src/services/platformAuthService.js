import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';
import { isPlatform } from '@ionic/vue';

class PlatformAuthService {
  constructor() {
    this.isNative = isPlatform('capacitor');
    this.isAndroid = isPlatform('android');
    this.isIOS = isPlatform('ios');
    this.isWeb = isPlatform('web');

    console.log('[PlatformAuthService] isNative:', this.isNative, 'isAndroid:', this.isAndroid, 'isIOS:', this.isIOS, 'isWeb:', this.isWeb);

    if (this.isNative) {
      this.initializeNativeSocialLogin();
    }
  }

  isDebugBuild() {
    return import.meta.env.PROD !== true;
  }

  getGoogleClientId() {
    if (this.isAndroid) {
      const debug = this.isDebugBuild();
      const clientId = debug
        ? import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID_DEBUG
        : import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID_RELEASE;

      if (!clientId) {
        console.error('❌ Missing Android client ID for build type:', debug ? 'debug' : 'release');
      }
      return clientId;
    }
    
    return import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }

  async initializeNativeSocialLogin() {
    try {
      console.log('🚀 Initializing native Social Login...');
      const webClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!webClientId) {
        throw new Error('Web client ID is missing. Check your .env file.');
      }

      await SocialLogin.initialize({
        google: { webClientId },
      });
      console.log('✅ Native Social Login initialized');
    } catch (error) {
      console.error('❌ Failed to initialize native Social Login:', error);
    }
  }

  async signInWithGoogle() {
    try {
      if (!this.isNative) {
        throw new Error('Native sign-in only available on mobile platforms. Use web OAuth instead.');
      }
      
      const { idToken } = await this.nativeGoogleSignIn();
      
      // Perform server-side validation to check if the user is active
      const serverAuthResponse = await this.validateUserOnServer(idToken);
      
      // The server response should indicate successful login and be returned
      return serverAuthResponse;

    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  }

  async nativeGoogleSignIn() {
    try {
      console.log('🔐 Starting native Google sign-in...');
      const clientId = this.getGoogleClientId();

      const result = await SocialLogin.login({
        provider: 'google',
        clientId,
        options: {
          scopes: ['email', 'profile'],
        },
      });
      console.log('✅ Native Google sign-in successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Native Google sign-in failed:', error);
      const msg = error.message || '';
      if (/cancel|CANCELED|12501/.test(msg)) {
        throw new Error('OAUTH_ERROR: Sign-in was cancelled or interrupted.');
      } else if (/network|7/.test(msg)) {
        throw new Error('OAUTH_ERROR: Network error. Please check your internet connection and try again.');
      } else if (/client|certificate|package|SHA|fingerprint|console|DEVELOPER_ERROR|INVALID_CLIENT|INVALID_PACKAGE_NAME|INVALID_CERTIFICATE|INVALID_AUDIENCE/.test(msg)) {
        throw new Error(`OAUTH_ERROR: ${msg} (Likely Google Console misconfiguration)`);
      } else {
        throw new Error(`OAUTH_ERROR: ${msg || 'Something went wrong with Google authentication.'}`);
      }
    }
  }
  
  /**
   * Sends the ID token to the backend for verification and checks the user's status.
   * Throws an error if the user is not found or is not active.
   * @param {string} idToken The Google ID token.
   * @returns {Promise<object>} The server's authentication response.
   */
  async validateUserOnServer(idToken) {
    try {
      const response = await fetch('YOUR_BACKEND_API/auth/validate-google-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Assume the backend sends an error message for inactive accounts.
        // For example: { "message": "Account is deactivated" }
        const errorMessage = errorData.message || 'Server validation failed.';

        if (errorMessage.includes('deactivated')) {
            throw new Error(`ACCOUNT_INACTIVE_ERROR: ${errorMessage}`);
        } else {
            throw new Error(`SERVER_VALIDATION_ERROR: ${errorMessage}`);
        }
      }

      const serverAuthResponse = await response.json();
      console.log('✅ Server validation successful:', serverAuthResponse);
      return serverAuthResponse;
    } catch (error) {
      console.error('❌ Server validation error:', error);
      throw error;
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

  async isSignedIn() {
    try {
      if (this.isNative) {
        const result = await SocialLogin.getCurrentUser({ provider: 'google' });
        return !!result?.idToken || !!result?.accessToken;
      }
      return false;
    } catch {
      return false;
    }
  }

  getPlatformInfo() {
    let platform = 'web';
    if (this.isAndroid) platform = 'android';
    else if (this.isIOS) platform = 'ios';
    else if (this.isNative) platform = 'native';
    
    if (this.isNative && !this.isAndroid && !this.isIOS && !this.isWeb) {
       platform = 'native';
    }

    return {
      isNative: this.isNative,
      isAndroid: this.isAndroid,
      isIOS: this.isIOS,
      isWeb: this.isWeb,
      platform,
      currentClientId: this.getGoogleClientId ? (this.getGoogleClientId()?.slice(0, 12) + '...') : 'N/A',
      buildType: this.isDebugBuild() ? 'debug' : 'release',
    };
  }
}

export default new PlatformAuthService();
