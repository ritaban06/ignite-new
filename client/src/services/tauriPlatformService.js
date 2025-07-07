import { platform } from '@tauri-apps/api/os';
import { invoke } from '@tauri-apps/api/tauri';

class TauriPlatformService {
  constructor() {
    this.isTauri = typeof window !== 'undefined' && window.__TAURI__;
    this.isWeb = !this.isTauri;
    this.platformInfo = null;
    
    console.log('🔍 Platform Detection:', {
      isTauri: this.isTauri,
      isWeb: this.isWeb,
      platform: this.getPlatform()
    });

    // Initialize platform info if in Tauri
    if (this.isTauri) {
      this.initializePlatformInfo();
    }
  }

  async initializePlatformInfo() {
    try {
      this.platformInfo = await platform();
      console.log('📱 Tauri Platform Info:', this.platformInfo);
    } catch (error) {
      console.error('❌ Failed to get platform info:', error);
    }
  }

  // Get the current platform
  async getPlatform() {
    if (!this.isTauri) return 'web';
    
    try {
      if (!this.platformInfo) {
        this.platformInfo = await platform();
      }
      return this.platformInfo;
    } catch (error) {
      console.error('❌ Error getting platform:', error);
      return 'tauri';
    }
  }

  // Get the appropriate Google Client ID based on platform
  getGoogleClientId() {
    if (this.isTauri) {
      // For Tauri apps, prefer Android client ID if available
      return import.meta.env.VITE_GOOGLE_ANDROID_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID;
    }
    // For web, use web client ID
    return import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }

  // Check if we're running on mobile (will be useful after Tauri mobile setup)
  async isMobile() {
    const platformName = await this.getPlatform();
    return platformName === 'android' || platformName === 'ios';
  }

  // Check if we're running on desktop
  async isDesktop() {
    const platformName = await this.getPlatform();
    return platformName === 'windows' || platformName === 'macos' || platformName === 'linux';
  }

  // Future: Tauri-specific authentication methods
  async signInWithGoogle() {
    if (this.isWeb) {
      // Use web OAuth flow
      console.log('🌐 Using web OAuth flow');
      return null; // Let the existing web auth handle this
    }

    // TODO: Implement Tauri native auth when needed
    console.log('📱 Tauri native auth not implemented yet, falling back to web');
    return null;
  }

  async signOut() {
    if (this.isWeb) {
      console.log('🌐 Web sign out');
      return;
    }

    // TODO: Implement Tauri native sign out when needed
    console.log('📱 Tauri native sign out');
  }

  // Utility method to check for native capabilities
  hasNativeCapabilities() {
    return this.isTauri;
  }

  // Get platform-specific configuration
  getConfig() {
    return {
      platform: this.getPlatform(),
      isTauri: this.isTauri,
      isWeb: this.isWeb,
      isMobile: this.isMobile(),
      isDesktop: this.isDesktop(),
      googleClientId: this.getGoogleClientId(),
      hasNativeCapabilities: this.hasNativeCapabilities()
    };
  }
}

// Export singleton instance
export default new TauriPlatformService();
