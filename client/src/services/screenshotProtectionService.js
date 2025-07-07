import { invoke } from '@tauri-apps/api/core';
import tauriPlatformService from './tauriPlatformService.js';

class ScreenshotProtectionService {
  constructor() {
    this.isProtectionEnabled = false;
    this.platform = tauriPlatformService;
  }

  /**
   * Enable screenshot and screen recording protection
   * Only works on Android devices with Tauri
   */
  async enableProtection() {
    try {
      if (!this.platform.isTauri) {
        console.warn('🚫 Screenshot protection only available in Tauri native apps');
        return { success: false, reason: 'Not running in Tauri' };
      }

      const platformName = await this.platform.getPlatform();
      if (platformName !== 'android') {
        console.warn('🚫 Screenshot protection only available on Android');
        return { success: false, reason: 'Not running on Android' };
      }

      await invoke('enable_secure_mode');
      this.isProtectionEnabled = true;
      
      console.log('🔒 Screenshot protection enabled');
      return { success: true, message: 'Screenshot protection enabled' };
      
    } catch (error) {
      console.error('❌ Failed to enable screenshot protection:', error);
      return { success: false, reason: error.message || 'Unknown error' };
    }
  }

  /**
   * Disable screenshot and screen recording protection
   */
  async disableProtection() {
    try {
      if (!this.platform.isTauri) {
        console.warn('🚫 Screenshot protection only available in Tauri native apps');
        return { success: false, reason: 'Not running in Tauri' };
      }

      await invoke('disable_secure_mode');
      this.isProtectionEnabled = false;
      
      console.log('🔓 Screenshot protection disabled');
      return { success: true, message: 'Screenshot protection disabled' };
      
    } catch (error) {
      console.error('❌ Failed to disable screenshot protection:', error);
      return { success: false, reason: error.message || 'Unknown error' };
    }
  }

  /**
   * Check if screenshot protection is currently enabled
   */
  isEnabled() {
    return this.isProtectionEnabled;
  }

  /**
   * Check if screenshot protection is available on this platform
   */
  async isAvailable() {
    if (!this.platform.isTauri) return false;
    
    try {
      const platformName = await this.platform.getPlatform();
      return platformName === 'android';
    } catch {
      return false;
    }
  }

  /**
   * Get protection status and capabilities
   */
  async getStatus() {
    const available = await this.isAvailable();
    const platformName = this.platform.isTauri ? await this.platform.getPlatform() : 'web';
    
    return {
      available,
      enabled: this.isProtectionEnabled,
      platform: platformName,
      isTauri: this.platform.isTauri,
      supportsProtection: available
    };
  }

  /**
   * Auto-enable protection when viewing sensitive content
   */
  async enableForSensitiveContent() {
    const status = await this.getStatus();
    
    if (status.available && !status.enabled) {
      return await this.enableProtection();
    }
    
    return { success: true, message: 'Protection already enabled or not available' };
  }

  /**
   * Get user-friendly message about protection status
   */
  async getProtectionMessage() {
    const status = await this.getStatus();
    
    if (!status.isTauri) {
      return '🌐 Web version - Limited protection available';
    }
    
    if (!status.available) {
      return '📱 Screenshot protection not available on this platform';
    }
    
    if (status.enabled) {
      return '🔒 Screenshots and screen recording are blocked';
    }
    
    return '🔓 Screenshots and screen recording are allowed';
  }
}

// Export singleton instance
export default new ScreenshotProtectionService();
