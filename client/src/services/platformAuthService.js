import { SocialLogin } from '@capgo/capacitor-social-login';
import { Capacitor } from '@capacitor/core';

class PlatformAuthService {
  /**
   * Constructor for PlatformAuthService
   * 
   * This service handles platform detection and authentication for both web and native environments.
   * It uses a multi-layered approach to reliably detect the platform:
   * 
   * 1. Primary detection: Capacitor's built-in methods (isNativePlatform, getPlatform)
   * 2. Secondary verification: User agent string analysis
   * 3. Fallback mechanisms: When primary detection fails
   * 
   * The detection logic prioritizes reliability over simplicity to handle edge cases
   * where Capacitor's detection might not be fully initialized or accurate.
   */
  constructor() {
    // Log Capacitor platform detection methods
    console.log('[PlatformAuthService] Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
    console.log('[PlatformAuthService] Capacitor.getPlatform():', Capacitor.getPlatform());
    
    // Get user agent for more reliable platform detection
    const userAgent = navigator.userAgent.toLowerCase();
    console.log('[PlatformAuthService] User Agent:', userAgent);
    
    // PRIMARY DETECTION: Check if we're running in a native environment (Capacitor container)
    // For Android, we need to be more aggressive with detection since Capacitor.isNativePlatform()
    // might not always be reliable on some Android devices
    const isAndroidUA = userAgent.indexOf('android') > -1;
    const isIOSUA = /iphone|ipad|ipod/.test(userAgent);
    
    // Capacitor platform detection
    const capacitorPlatform = Capacitor.getPlatform();
    const isAndroidCapacitor = capacitorPlatform === 'android';
    const isIOSCapacitor = capacitorPlatform === 'ios';
    
    // Set isNative based on both Capacitor and user agent
    // This ensures we don't miss native environments even if Capacitor detection fails
    this.isNative = Capacitor.isNativePlatform() || isAndroidUA || isIOSUA;
    
    // Prioritize user agent detection for native apps, but use both methods
    // This provides the most reliable platform detection across different scenarios
    if (this.isNative) {
      // If we're in a native container, user agent is very reliable
      if (isAndroidUA) {
        this.isAndroid = true;
        this.isIOS = false;
        console.log('[PlatformAuthService] Detected Android via user agent');
      } else if (isIOSUA) {
        this.isAndroid = false;
        this.isIOS = true;
        console.log('[PlatformAuthService] Detected iOS via user agent');
      } else {
        // FALLBACK MECHANISM: Use Capacitor detection if user agent doesn't clearly indicate platform
        this.isAndroid = isAndroidCapacitor;
        this.isIOS = isIOSCapacitor;
        console.log('[PlatformAuthService] Using Capacitor platform detection as fallback');
      }
    } else {
      // For web, we're not on a native platform
      this.isAndroid = false;
      this.isIOS = false;
    }
    
    this.isWeb = !this.isNative;

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
        : import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID;

      if (!clientId) {
        console.error('❌ Missing Android client ID for build type:', debug ? 'debug' : 'release');
        // Fall back to the default client ID
        return import.meta.env.VITE_GOOGLE_CLIENT_ID;
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

  /**
   * Gets comprehensive platform information for the current environment
   * 
   * This method provides a unified way to access platform detection results.
   * It performs additional verification checks to ensure the most accurate
   * platform detection possible, especially for Android devices which may
   * sometimes be misidentified by Capacitor's initial detection.
   * 
   * The detection logic follows this priority:
   * 1. Check if already identified as Android or iOS
   * 2. Perform additional user agent verification for Android
   * 3. Fall back to generic 'native' for unidentified native platforms
   * 4. Default to 'web' for non-native environments
   * 
   * @returns {Object} Platform information including:
   *   - platform: 'android', 'ios', 'native', or 'web'
   *   - isNative: Whether running in a native container
   *   - isAndroid: Whether running on Android
   *   - isIOS: Whether running on iOS
   *   - isWeb: Whether running in a web browser
   *   - buildType: 'debug' or 'release'
   *   - currentClientId: The Google client ID being used
   */
  getPlatformInfo() {
    // Get user agent for debugging
    const userAgent = navigator.userAgent.toLowerCase();
    console.log('[PlatformAuthService] User Agent:', userAgent);
    
    // Always check user agent again to ensure we don't miss Android devices
    // This is especially important for devices where Capacitor detection might be unreliable
    const isAndroidUA = userAgent.indexOf('android') > -1;
    
    // If user agent indicates Android but our initial detection didn't catch it,
    // update our internal state
    if (isAndroidUA && !this.isAndroid) {
      console.log('[PlatformAuthService] Late detection of Android via user agent');
      this.isNative = true;
      this.isAndroid = true;
      this.isIOS = false;
      this.isWeb = false;
    }
    
    // Determine platform based on our detection logic
    let platform = 'web';
    if (this.isAndroid) platform = 'android';
    else if (this.isIOS) platform = 'ios';
    else if (this.isNative) platform = 'native';
    
    // Double-check Android detection using user agent as a final verification
    // This ensures we don't miss Android devices even if other detection methods fail
    if (this.isNative && isAndroidUA && platform !== 'android') {
      console.log('[PlatformAuthService] Correcting platform to Android based on user agent');
      platform = 'android';
      this.isAndroid = true;
      this.isIOS = false;
    }
    
    // For any native platform that wasn't identified as Android or iOS
    if (this.isNative && !this.isAndroid && !this.isIOS && !this.isWeb) {
       platform = 'native';
    }
    
    console.log('[PlatformAuthService] Determined platform:', platform, 
                'isNative:', this.isNative, 
                'isAndroid:', this.isAndroid, 
                'isIOS:', this.isIOS);

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
