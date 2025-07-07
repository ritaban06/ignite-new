// Tauri Native Android Security - Main Library Entry Point
// Provides cross-platform screenshot/screen recording protection with native Android FLAG_SECURE support

use std::sync::Mutex;
use serde::{Deserialize, Serialize};
use log::{info, error};

// Import our security modules
mod android_security;
mod android_jni;

use android_security::AndroidSecurity;

/// Global security manager for thread-safe access across the application
static SECURITY_MANAGER: Mutex<Option<AndroidSecurity>> = Mutex::new(None);

/// Security status response structure for JS frontend
#[derive(Debug, Serialize, Deserialize)]
struct SecurityStatus {
    enabled: bool,
    level: String,
    platform: String,
    features: Vec<String>,
}

/// Get the current platform information
#[tauri::command]
fn get_platform_info() -> String {
    #[cfg(target_os = "android")]
    return "android".to_string();
    
    #[cfg(target_os = "ios")]
    return "ios".to_string();
    
    #[cfg(target_os = "windows")]
    return "windows".to_string();
    
    #[cfg(target_os = "macos")]
    return "macos".to_string();
    
    #[cfg(target_os = "linux")]
    return "linux".to_string();
    
    #[cfg(not(any(target_os = "android", target_os = "ios", target_os = "windows", target_os = "macos", target_os = "linux")))]
    return "unknown".to_string();
}

/// Enable secure mode - native FLAG_SECURE on Android, web-based on other platforms
#[tauri::command]
fn enable_secure_mode() -> Result<String, String> {
    info!("🔒 Enable secure mode requested");
    
    let mut security_manager = SECURITY_MANAGER.lock().map_err(|e| {
        error!("Failed to acquire security manager lock: {}", e);
        "Failed to acquire security manager lock".to_string()
    })?;
    
    // Initialize security manager if not already done
    if security_manager.is_none() {
        info!("Initializing security manager");
        *security_manager = Some(AndroidSecurity::new());
    }
    
    if let Some(ref mut _manager) = *security_manager {
        #[cfg(target_os = "android")]
        {
            info!("🔒 Enabling native FLAG_SECURE protection on Android");
            _manager.enable_flag_secure()
        }
        
        #[cfg(not(target_os = "android"))]
        {
            info!("🔒 Non-Android platform - using web-based protection");
            Ok("Web-based protection enabled (native FLAG_SECURE only available on Android)".to_string())
        }
    } else {
        error!("Failed to initialize security manager");
        Err("Failed to initialize security manager".to_string())
    }
}

/// Disable secure mode
#[tauri::command]
fn disable_secure_mode() -> Result<String, String> {
    info!("🔓 Disable secure mode requested");
    
    let mut security_manager = SECURITY_MANAGER.lock().map_err(|e| {
        error!("Failed to acquire security manager lock: {}", e);
        "Failed to acquire security manager lock".to_string()
    })?;
    
    if let Some(ref mut _manager) = *security_manager {
        #[cfg(target_os = "android")]
        {
            info!("🔓 Disabling native FLAG_SECURE protection on Android");
            _manager.disable_flag_secure()
        }
        
        #[cfg(not(target_os = "android"))]
        {
            info!("🔓 Non-Android platform - disabling web-based protection");
            Ok("Web-based protection disabled".to_string())
        }
    } else {
        info!("Security manager not initialized - nothing to disable");
        Ok("Security manager not initialized".to_string())
    }
}

/// Get current security status and capabilities
#[tauri::command]
fn get_security_status() -> SecurityStatus {
    let security_manager = SECURITY_MANAGER.lock().unwrap_or_else(|e| {
        error!("Failed to acquire security manager lock for status: {}", e);
        panic!("Security manager lock poisoned");
    });
    
    if let Some(ref manager) = *security_manager {
        let info = manager.get_security_info();
        SecurityStatus {
            enabled: info.flag_secure_enabled,
            level: info.protection_level,
            platform: info.platform,
            features: info.features,
        }
    } else {
        // Return default status when not initialized
        SecurityStatus {
            enabled: false,
            level: "none".to_string(),
            platform: get_platform_info(),
            features: vec!["Web-based protection available".to_string()],
        }
    }
}

/// Initialize the security system manually (optional - also done on startup)
#[tauri::command]
fn init_security_system() -> Result<String, String> {
    info!("🔧 Manual security system initialization requested");
    
    let mut security_manager = SECURITY_MANAGER.lock().map_err(|e| {
        error!("Failed to acquire security manager lock for init: {}", e);
        "Failed to acquire security manager lock".to_string()
    })?;
    
    *security_manager = Some(AndroidSecurity::new());
    
    #[cfg(target_os = "android")]
    {
        info!("🔧 Security system initialized for Android with native FLAG_SECURE support");
        Ok("Android security system initialized with FLAG_SECURE support".to_string())
    }
    
    #[cfg(not(target_os = "android"))]
    {
        info!("🔧 Security system initialized for non-Android platform");
        Ok("Security system initialized with web-based protection".to_string())
    }
}

/// Main Tauri application entry point with mobile support
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_platform_info, 
            enable_secure_mode, 
            disable_secure_mode,
            get_security_status,
            init_security_system
        ])
        .setup(|app| {
            // Initialize logging for debug builds
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            
            // Initialize security system on startup
            #[cfg(target_os = "android")]
            {
                info!("🚀 Initializing Android security system with FLAG_SECURE support");
                let mut security_manager = SECURITY_MANAGER.lock().unwrap();
                *security_manager = Some(AndroidSecurity::new());
                info!("✅ Android security system ready");
            }
            
            #[cfg(not(target_os = "android"))]
            {
                info!("🚀 Initializing security system for non-Android platform");
                let mut security_manager = SECURITY_MANAGER.lock().unwrap();
                *security_manager = Some(AndroidSecurity::new());
                info!("✅ Cross-platform security system ready");
            }
            
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
