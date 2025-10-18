// src-tauri/src/main.rs - With hybrid secure storage
mod security;
mod encryption;
mod file_permissions;

use security::{remove_secure, retrieve_secure, store_secure};
use encryption::{generate_encryption_key, encrypt_data, decrypt_data};
use file_permissions::{set_file_permissions, check_file_permissions, get_storage_file_path};
use tauri::{Emitter, Manager};

fn main() {
    println!("🚀 Tauri app starting...");
    
    let mut builder = tauri::Builder::default();

    // Single instance plugin (must be first)
    #[cfg(desktop)]
    {
        println!("🔧 Registering single instance plugin...");
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
            println!("📱 New app instance: {:?}", argv);
        }));
    }

    // Initialize plugins
    builder = builder
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::default().build()) // ✅ For encrypted storage file
        .setup(|app| {
            println!("🔗 Setting up deep link handler...");
            
            use tauri_plugin_deep_link::DeepLinkExt;
            
            // Register deep links at runtime for Linux/Windows dev
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                println!("🔧 Registering deep links at runtime...");
                match app.deep_link().register_all() {
                    Ok(_) => println!("✅ Runtime registration successful"),
                    Err(e) => eprintln!("⚠️  Runtime registration failed: {}", e),
                }
            }

            // Check for startup deep link
            println!("🔍 Checking for startup deep link...");
            match app.deep_link().get_current() {
                Ok(Some(urls)) => {
                    println!("🚀 App started with deep link: {:?}", urls);
                }
                Ok(None) => {
                    println!("   No startup deep link");
                }
                Err(e) => {
                    eprintln!("⚠️  Failed to get current deep link: {}", e);
                }
            }
            
            // Listen for deep link events
            let app_handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls().to_vec();
                
                println!("═══════════════════════════════════");
                println!("🔗 DEEP LINK RECEIVED!");
                println!("═══════════════════════════════════");
                println!("📦 URLs: {:?}", urls);

                if let Some(url) = urls.first() {
                    let url_str = url.to_string();
                    println!("🔍 URL: {}", url_str);
                    
                    if url_str.starts_with("dealer-sign://") {
                        println!("✅ Valid dealer-sign protocol");
                        
                        if let Some(window) = app_handle.get_webview_window("main") {
                            println!("✅ Main window found");
                            println!("📤 Emitting to frontend...");
                            
                            match window.emit("deep-link", &url_str) {
                                Ok(_) => {
                                    println!("✅ Event emitted!");
                                    let _ = window.set_focus();
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                }
                                Err(e) => eprintln!("❌ Emit failed: {}", e)
                            }
                        } else {
                            eprintln!("❌ Window not found");
                        }
                    }
                }
            });

            println!("✅ Deep link handler setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Security (OS Keychain) - for encryption key
            store_secure,
            retrieve_secure,
            remove_secure,
            // Encryption (AES-256)
            generate_encryption_key,
            encrypt_data,
            decrypt_data,
            // File permissions
            set_file_permissions,
            check_file_permissions,
            get_storage_file_path,
        ]);

    println!("🚀 Starting Tauri runtime...");
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}