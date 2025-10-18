// src-tauri/src/main.rs - UPDATED with all commands registered
mod security;
use security::{remove_secure, retrieve_secure, store_secure};
use tauri::{Emitter, Manager};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            // Register deep link handler for when app is already running
            #[cfg(target_os = "macos")]
            {
                use tauri_plugin_deep_link::DeepLinkExt;

                if let Err(e) = app.deep_link().register_all() {
                    eprintln!("Failed to register deep link handlers: {}", e);
                } else {
                    // Listen for deep link events
                    let app_handle = app.handle().clone();
                    app.deep_link().on_open_url(move |event| {
                        let urls = event.urls().to_vec();
                        println!("🔗 Deep link received: {:?}", urls);

                        if let Some(url) = urls.first() {
                            let url_str = url.to_string();
                            if url_str.starts_with("dealer-sign://") {
                                println!("✅ Valid dealer-sign URL detected");
                                
                                // Get the main window
                                if let Some(window) = app_handle.get_webview_window("main") {
                                    println!("✅ Main window found, emitting event");
                                    
                                    // Emit event to frontend
                                    let _ = window.emit("deep-link", &url_str);

                                    // Bring window to front
                                    let _ = window.set_focus();
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                    
                                    println!("✅ Deep link event emitted to frontend");
                                } else {
                                    eprintln!("❌ Main window not found");
                                }
                            }
                        }
                    });
                }
            }

            // Handle deep link when app is launched (cold start)
            #[cfg(target_os = "macos")]
            {
                if let Some(url) = std::env::args().nth(1) {
                    if url.starts_with("dealer-sign://") {
                        println!("🚀 App launched with deep link: {}", url);

                        // Give the window time to be created
                        let app_handle = app.handle().clone();
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_millis(500));

                            if let Some(window) = app_handle.get_webview_window("main") {
                                let _ = window.emit("deep-link", url.as_str());
                                let _ = window.set_focus();
                                println!("✅ Cold start deep link emitted");
                            } else {
                                eprintln!("❌ Window not ready for cold start deep link");
                            }
                        });
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Security/Keyring commands
            store_secure,
            retrieve_secure,
            remove_secure,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}