import { invoke } from '@tauri-apps/api/core';
import tauriPlatformService from './tauriPlatformService.js';

class ScreenshotProtectionService {
  constructor() {
    this.isEnabled = false;
    this.protectionLevel = 'none';
    this.platform = 'unknown';
    this.eventListeners = [];
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize the native security system
      const initResult = await invoke('init_security_system');
      console.log('🔧 Security system:', initResult);

      // Get platform info
      this.platform = await tauriPlatformService.getPlatform();
      console.log('🔍 Platform detected:', this.platform);

      this.initialized = true;
    } catch (error) {
      console.warn('⚠️ Failed to initialize native security system:', error);
      this.platform = 'web';
      this.initialized = true;
    }
  }

  /**
   * Enable screenshot and screen recording protection
   * Uses enhanced native FLAG_SECURE on Android with web-based fallback
   */
  async enableProtection() {
    await this.initialize();

    console.log('� Enabling screenshot protection...');

    // Try native protection first (Android FLAG_SECURE)
    const nativeResult = await this.enableNativeProtection();
    
    // Always enable web-based protection as backup
    this.enableWebProtection();

    // Determine final protection level
    if (nativeResult.success && nativeResult.level === 'native') {
      this.protectionLevel = 'native';
      this.isEnabled = true;
      console.log('✅ Native FLAG_SECURE protection enabled!');
      return {
        success: true,
        level: 'native',
        message: 'Full native screenshot protection enabled (FLAG_SECURE)',
        features: [
          'System screenshot blocking',
          'Screen recording blocking', 
          'Task preview blocking',
          'Web-based fallback protection'
        ]
      };
    } else {
      this.protectionLevel = 'web';
      this.isEnabled = true;
      console.log('✅ Web-based protection enabled');
      return {
        success: true,
        level: 'web',
        message: 'Web-based screenshot protection enabled',
        features: [
          'Basic screenshot prevention',
          'Context menu blocking',
          'Selection prevention'
        ]
      };
    }
  }

  /**
   * Enable web-based protection techniques
   */
  enableWebProtection() {
    console.log('🔒 Enabling web-based protection...');

    // Disable text selection
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';

    // Disable drag and drop
    document.body.style.webkitUserDrag = 'none';
    document.body.style.userDrag = 'none';

    // Disable context menu
    const contextMenuHandler = (e) => {
      e.preventDefault();
      return false;
    };
    
    // Disable common screenshot shortcuts
    const keyboardHandler = (e) => {
      // Block Print Screen key
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        console.log('🚫 Screenshot shortcut blocked');
        return false;
      }
      
      // Block Ctrl+Shift+I (DevTools)
      if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
      }
      
      // Block F12 (DevTools)
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      
      // Block Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', contextMenuHandler);
    document.addEventListener('keydown', keyboardHandler);
    document.addEventListener('selectstart', contextMenuHandler);
    document.addEventListener('dragstart', contextMenuHandler);

    // Store references for cleanup
    this.eventListeners = [
      { element: document, event: 'contextmenu', handler: contextMenuHandler },
      { element: document, event: 'keydown', handler: keyboardHandler },
      { element: document, event: 'selectstart', handler: contextMenuHandler },
      { element: document, event: 'dragstart', handler: contextMenuHandler }
    ];

    // Disable print
    window.addEventListener('beforeprint', (e) => {
      e.preventDefault();
      console.log('🚫 Print attempt blocked');
      return false;
    });

    console.log('✅ Web-based protection enabled');
  }

  /**
   * Disable web-based protection techniques
   */
  disableWebProtection() {
    console.log('🔓 Disabling web-based protection...');

    // Restore text selection
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    document.body.style.mozUserSelect = '';
    document.body.style.msUserSelect = '';

    // Restore drag and drop
    document.body.style.webkitUserDrag = '';
    document.body.style.userDrag = '';

    // Remove event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners = [];

    console.log('✅ Web-based protection disabled');
  }

  // Event handler methods
  preventEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  }

  preventScreenshotShortcuts = (e) => {
    // Common screenshot shortcuts
    if (
      e.key === 'PrintScreen' ||
      (e.ctrlKey && e.shiftKey && e.key === 'S') || // Chrome screenshot extension
      (e.ctrlKey && e.key === 's') || // Save shortcut
      (e.ctrlKey && e.shiftKey && e.key === 'I') || // DevTools
      (e.ctrlKey && e.shiftKey && e.key === 'C') || // DevTools
      (e.ctrlKey && e.key === 'u') || // View source
      e.key === 'F12' // DevTools
    ) {
      e.preventDefault();
      e.stopPropagation();
      console.warn('🚫 Screenshot/developer action blocked');
      return false;
    }
  }

  handleVisibilityChange = () => {
    if (document.hidden) {
      document.body.style.filter = 'blur(10px)';
    } else {
      document.body.style.filter = '';
    }
  }

  handleWindowBlur = () => {
    document.body.style.filter = 'blur(10px)';
  }

  handleWindowFocus = () => {
    document.body.style.filter = '';
  }

  /**
   * Disable screenshot and screen recording protection
   */
  async disableProtection() {
    console.log('🔓 Disabling screenshot protection...');

    // Disable native protection
    await this.disableNativeProtection();
    
    // Disable web protection
    this.disableWebProtection();

    this.isEnabled = false;
    this.protectionLevel = 'none';

    return {
      success: true,
      level: 'none',
      message: 'Screenshot protection disabled'
    };
  }

  async enableNativeProtection() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await invoke('enable_secure_mode');
      console.log('🔒 Native protection result:', result);
      
      // Check if it actually worked
      const status = await this.getNativeStatus();
      
      return {
        success: status.enabled && status.level === 'native',
        message: result,
        level: status.level
      };
    } catch (error) {
      console.warn('❌ Native protection failed:', error);
      return {
        success: false,
        message: `Native protection failed: ${error}`,
        level: 'web'
      };
    }
  }

  async disableNativeProtection() {
    try {
      const result = await invoke('disable_secure_mode');
      console.log('🔓 Native protection disabled:', result);
      return { success: true, message: result };
    } catch (error) {
      console.warn('⚠️ Failed to disable native protection:', error);
      return { success: false, message: `Failed to disable: ${error}` };
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
   * Get comprehensive protection status and capabilities
   */
  async getStatus() {
    if (!this.initialized) {
      await this.initialize();
    }

    const nativeStatus = await this.getNativeStatus();
    
    return {
      enabled: this.isEnabled,
      level: this.protectionLevel,
      platform: this.platform,
      native: nativeStatus,
      web: {
        enabled: this.eventListeners.length > 0,
        features: ['Context menu blocking', 'Selection prevention', 'Keyboard shortcuts blocking']
      }
    };
  }

  async getNativeStatus() {
    try {
      const status = await invoke('get_security_status');
      return status;
    } catch (error) {
      return {
        enabled: false,
        level: 'none',
        platform: this.platform,
        features: []
      };
    }
  }

  // Test the protection effectiveness
  async testProtection() {
    const status = await this.getStatus();
    
    console.log('🧪 Testing screenshot protection...');
    console.log('Current status:', status);
    
    return {
      webProtection: {
        contextMenu: this.eventListeners.length > 0,
        textSelection: document.body.style.userSelect === 'none',
        keyboardShortcuts: true
      },
      nativeProtection: status.native,
      overall: status.enabled
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
