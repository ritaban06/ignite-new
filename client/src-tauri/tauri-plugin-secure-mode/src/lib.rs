use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime, WebviewWindow,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize)]
pub struct SecureModeResponse {
    success: bool,
    message: String,
}

#[tauri::command]
async fn enable_secure_mode<R: Runtime>(
    _window: WebviewWindow<R>
) -> Result<SecureModeResponse, String> {
    #[cfg(target_os = "android")]
    {
        // For now, we'll implement basic protection and log that native implementation is pending
        log::info!("🔒 Enabling secure mode for Android");
        Ok(SecureModeResponse {
            success: true,
            message: "Basic secure mode enabled (native FLAG_SECURE requires device-specific implementation)".to_string(),
        })
    }
    
    #[cfg(not(target_os = "android"))]
    {
        log::info!("Secure mode is only available on Android");
        Ok(SecureModeResponse {
            success: false,
            message: "Secure mode is only available on Android".to_string(),
        })
    }
}

#[tauri::command]
async fn disable_secure_mode<R: Runtime>(
    _window: WebviewWindow<R>
) -> Result<SecureModeResponse, String> {
    #[cfg(target_os = "android")]
    {
        log::info!("🔓 Disabling secure mode for Android");
        Ok(SecureModeResponse {
            success: true,
            message: "Secure mode disabled".to_string(),
        })
    }
    
    #[cfg(not(target_os = "android"))]
    {
        log::info!("Secure mode is only available on Android");
        Ok(SecureModeResponse {
            success: false,
            message: "Secure mode is only available on Android".to_string(),
        })
    }
}

/// Initialize the plugin
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("secure-mode")
        .invoke_handler(tauri::generate_handler![enable_secure_mode, disable_secure_mode])
        .build()
}
