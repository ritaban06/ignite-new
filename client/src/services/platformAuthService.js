import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

class PlatformAuthService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.isAndroid = Capacitor.getPlatform() === 'android';
    this.isIOS = Capacitor.getPlatform() === 'ios';
    this.isWeb = !this.isNative;

    if (this.isNative) {
      this.initializeNativeSocialLogin();
    }
  }

  // Detect whether this is a debug or release build
  isDebugBuild() {
    return import.meta.env.RELEASE !== 'true';
  }

  getGoogleClientId() {
    if (this.isAndroid) {
      const debug = this.isDebugBuild();
      return debug
        ? import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID_DEBUG
        : import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID_RELEASE;
    }
    return import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }

  async initializeNativeSocialLogin() {
    try {
      console.log('🚀 Initializing native Social Login...');
      await SocialLogin.initialize({
        google: {
          webClientId: this.getGoogleClientId(),
        },
      });
      console.log('✅ Native Social Login initialized');
    } catch (error) {
      console.error('❌ Failed to initialize native Social Login:', error);
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
      const clientId = this.getGoogleClientId();
      const result = await SocialLogin.login({
        provider: 'google',
        clientId,
        options: {
          scopes: ['email', 'profile'],
        },
      });
      console.log('✅ Native Google sign-in successful:', result);
      return {
        credential: result.idToken,
        clientId
      };
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
    return {
      isNative: this.isNative,
      isAndroid: this.isAndroid,
      isIOS: this.isIOS,
      isWeb: this.isWeb,
      platform: Capacitor.getPlatform(),
      currentClientId: this.getGoogleClientId()?.slice(0, 12) + '...',
      buildType: this.isDebugBuild() ? 'debug' : 'release'
    };
  }
}

export default new PlatformAuthService();
