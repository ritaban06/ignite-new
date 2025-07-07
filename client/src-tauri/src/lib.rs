use tauri::Manager;

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

#[tauri::command]
fn enable_secure_mode(window: tauri::Window) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        use tauri::api::notification::Notification;
        // Set FLAG_SECURE to prevent screenshots and screen recording
        window
            .with_webview(|webview| {
                #[cfg(target_os = "android")]
                {
                    use jni::objects::{JClass, JObject};
                    use jni::sys::jint;
                    use jni::JNIEnv;
                    
                    let activity = webview.inner().activity();
                    let env = webview.inner().env();
                    
                    // Get the window and set FLAG_SECURE
                    let window_obj = env
                        .call_method(activity, "getWindow", "()Landroid/view/Window;", &[])
                        .map_err(|e| format!("Failed to get window: {}", e))?
                        .l()
                        .map_err(|e| format!("Failed to convert to object: {}", e))?;
                    
                    // FLAG_SECURE = 0x00002000
                    let flag_secure: jint = 0x00002000;
                    
                    env.call_method(
                        window_obj,
                        "addFlags",
                        "(I)V",
                        &[jni::objects::JValue::Int(flag_secure)],
                    )
                    .map_err(|e| format!("Failed to set secure flag: {}", e))?;
                }
            })
            .map_err(|e| format!("Failed to access webview: {}", e))?;
        
        Ok(())
    }
    #[cfg(not(target_os = "android"))]
    {
        // On non-Android platforms, this is a no-op
        println!("Secure mode is only available on Android");
        Ok(())
    }
}

#[tauri::command]
fn disable_secure_mode(window: tauri::Window) -> Result<(), String> {
    #[cfg(target_os = "android")]
    {
        window
            .with_webview(|webview| {
                #[cfg(target_os = "android")]
                {
                    use jni::objects::{JClass, JObject};
                    use jni::sys::jint;
                    use jni::JNIEnv;
                    
                    let activity = webview.inner().activity();
                    let env = webview.inner().env();
                    
                    let window_obj = env
                        .call_method(activity, "getWindow", "()Landroid/view/Window;", &[])
                        .map_err(|e| format!("Failed to get window: {}", e))?
                        .l()
                        .map_err(|e| format!("Failed to convert to object: {}", e))?;
                    
                    // FLAG_SECURE = 0x00002000
                    let flag_secure: jint = 0x00002000;
                    
                    env.call_method(
                        window_obj,
                        "clearFlags",
                        "(I)V",
                        &[jni::objects::JValue::Int(flag_secure)],
                    )
                    .map_err(|e| format!("Failed to clear secure flag: {}", e))?;
                }
            })
            .map_err(|e| format!("Failed to access webview: {}", e))?;
        
        Ok(())
    }
    #[cfg(not(target_os = "android"))]
    {
        println!("Secure mode is only available on Android");
        Ok(())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_platform_info, enable_secure_mode, disable_secure_mode])
    .setup(|app| {
      // Set FLAG_SECURE globally on Android when app starts
      #[cfg(target_os = "android")]
      {
        if let Some(window) = app.get_webview_window("main") {
          let _ = enable_secure_mode(window);
        }
      }
      
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
