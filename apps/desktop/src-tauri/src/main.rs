// src-tauri/src/main.rs - Proper configuration per Tauri docs
mod security;
use security::{remove_secure, retrieve_secure, store_secure};
use tauri::{Emitter, Manager};

fn main() {
    println!("🚀 Tauri app starting...");
    
    let mut builder = tauri::Builder::default();

    // IMPORTANT: Single instance plugin must be registered FIRST (desktop only)
    #[cfg(desktop)]
    {
        println!("🔧 Registering single instance plugin...");
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
            println!("📱 New app instance opened with args: {:?}", argv);
            println!("   Deep link event was already triggered by the plugin");
        }));
    }

    // Initialize shell and deep link plugins
    builder = builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            println!("🔗 Setting up deep link handler...");
            
            use tauri_plugin_deep_link::DeepLinkExt;
            
            // Register deep links at runtime for Linux/Windows (dev mode support)
            // NOTE: Do NOT do this on macOS - it's not supported and causes errors
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                println!("🔧 Registering deep links at runtime (Linux/Windows dev mode)...");
                match app.deep_link().register_all() {
                    Ok(_) => println!("✅ Runtime registration successful"),
                    Err(e) => eprintln!("⚠️  Runtime registration failed: {}", e),
                }
            }

            // Check if app was started by a deep link
            println!("🔍 Checking for startup deep link...");
            match app.deep_link().get_current() {
                Ok(Some(urls)) => {
                    println!("🚀 App started with deep link!");
                    println!("   URLs: {:?}", urls);
                }
                Ok(None) => {
                    println!("   No startup deep link (normal launch)");
                }
                Err(e) => {
                    eprintln!("⚠️  Failed to get current deep link: {}", e);
                }
            }
            
            // Listen for deep link events when app is running
            let app_handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls().to_vec();
                
                println!("═══════════════════════════════════");
                println!("🔗 DEEP LINK RECEIVED!");
                println!("═══════════════════════════════════");
                println!("📦 URLs: {:?}", urls);
                println!("📦 Count: {}", urls.len());

                if let Some(url) = urls.first() {
                    let url_str = url.to_string();
                    println!("🔍 Processing URL: {}", url_str);
                    
                    if url_str.starts_with("dealer-sign://") {
                        println!("✅ Valid dealer-sign:// protocol detected");
                        
                        // Get main window
                        match app_handle.get_webview_window("main") {
                            Some(window) => {
                                println!("✅ Main window found");
                                println!("📤 Emitting 'deep-link' event to frontend...");
                                println!("   Payload: {}", url_str);
                                
                                match window.emit("deep-link", &url_str) {
                                    Ok(_) => {
                                        println!("✅ Event emitted successfully!");
                                        
                                        // Bring window to front
                                        if let Err(e) = window.set_focus() {
                                            eprintln!("⚠️  Failed to focus: {}", e);
                                        }
                                        if let Err(e) = window.show() {
                                            eprintln!("⚠️  Failed to show: {}", e);
                                        }
                                        if let Err(e) = window.unminimize() {
                                            eprintln!("⚠️  Failed to unminimize: {}", e);
                                        }
                                        
                                        println!("✅ Window brought to front");
                                    }
                                    Err(e) => {
                                        eprintln!("❌ Failed to emit event: {}", e);
                                    }
                                }
                            }
                            None => {
                                eprintln!("❌ Main window not found!");
                                eprintln!("   Available windows: {:?}", 
                                    app_handle.webview_windows().keys().collect::<Vec<_>>());
                            }
                        }
                    } else {
                        println!("⚠️  URL doesn't start with dealer-sign://");
                        println!("   Actual prefix: {}", 
                            url_str.chars().take(20).collect::<String>());
                    }
                } else {
                    eprintln!("⚠️  No URLs in event (empty list)");
                }
            });

            println!("✅ Deep link handler setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            store_secure,
            retrieve_secure,
            remove_secure,
        ]);

    println!("🚀 Starting Tauri runtime...");
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}