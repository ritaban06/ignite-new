use super::*;

#[cfg(target_os = "android")]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    use tauri::plugin::PluginApi;
    
    Builder::new("secure-mode")
        .invoke_handler(tauri::generate_handler![enable_secure_mode, disable_secure_mode])
        .setup(|app, api| {
            // Initialize Android-specific setup
            log::info!("Secure Mode plugin initialized for Android");
            Ok(())
        })
        .build()
}

#[cfg(target_os = "ios")]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("secure-mode")
        .invoke_handler(tauri::generate_handler![enable_secure_mode, disable_secure_mode])
        .setup(|app, api| {
            log::info!("Secure Mode plugin initialized for iOS (no-op)");
            Ok(())
        })
        .build()
}
