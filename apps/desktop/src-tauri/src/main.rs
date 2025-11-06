// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod encryption;
mod file_permissions;
mod security;
mod file_operations;
mod storage;
mod license;

use encryption::{decrypt_data, encrypt_data, generate_encryption_key};
use file_permissions::{check_file_permissions, get_storage_file_path, set_file_permissions};
use file_operations::{
    batch_print_pdfs, cleanup_temp_print_dir, create_temp_print_dir, get_documents_dir,
    get_downloads_dir, open_file_with_default_app, print_pdf, reveal_in_explorer,
    write_file_to_path,
};
use license::{
    get_app_version, get_hostname, get_machine_id, get_machine_info, get_platform,
    get_stored_license, remove_stored_license, store_license,
};
use log::{error, info};
use security::{remove_secure, retrieve_secure, store_secure};
use storage::{
    cleanup_cache, get_all_storage_paths, get_backup_path, get_cache_path,
    get_database_path, get_documents_storage_path, get_logs_path, get_storage_stats,
};
use tauri::{Emitter, Manager};

fn main() {
    info!("🚀 Tauri app starting...");

    let mut builder = tauri::Builder::default().plugin(tauri_plugin_fs::init());

    // Single instance plugin (must be first)
    #[cfg(desktop)]
    {
        info!("🔧 Registering single instance plugin...");
        builder = builder.plugin(tauri_plugin_single_instance::init(|_app, argv, _cwd| {
            info!("📱 New app instance: {:?}", argv);
        }));
    }

    // Initialize plugins in correct order
    builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            info!("🔗 Setting up deep link handler...");

            use tauri_plugin_deep_link::DeepLinkExt;

            // Register deep links at runtime for Linux/Windows dev
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                info!("🔧 Registering deep links at runtime...");
                match app.deep_link().register_all() {
                    Ok(_) => info!("✅ Runtime registration successful"),
                    Err(e) => error!("⚠️  Runtime registration failed: {}", e),
                }
            }

            // Check for startup deep link
            info!("🔍 Checking for startup deep link...");
            match app.deep_link().get_current() {
                Ok(Some(urls)) => {
                    info!("🚀 App started with deep link: {:?}", urls);
                }
                Ok(None) => {
                    info!("   No startup deep link");
                }
                Err(e) => {
                    error!("⚠️  Failed to get current deep link: {}", e);
                }
            }

            // Listen for deep link events
            let app_handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls().to_vec();

                info!("═══════════════════════════════════");
                info!("🔗 DEEP LINK RECEIVED!");
                info!("═══════════════════════════════════");
                info!("📦 URLs: {:?}", urls);

                if let Some(url) = urls.first() {
                    let url_str = url.to_string();
                    info!("🔍 URL: {}", url_str);

                    if url_str.starts_with("dealer-sign://") {
                        info!("✅ Valid dealer-sign protocol");

                        if let Some(window) = app_handle.get_webview_window("main") {
                            info!("✅ Main window found");
                            info!("📤 Emitting to frontend...");

                            match window.emit("deep-link", &url_str) {
                                Ok(_) => {
                                    info!("✅ Event emitted!");
                                    let _ = window.set_focus();
                                    let _ = window.show();
                                    let _ = window.unminimize();
                                }
                                Err(e) => error!("❌ Emit failed: {}", e),
                            }
                        } else {
                            error!("❌ Window not found");
                        }
                    }
                }
            });

            info!("✅ Deep link handler setup complete");
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
            // File operations
            get_downloads_dir,
            get_documents_dir,
            open_file_with_default_app,
            print_pdf,
            batch_print_pdfs,
            create_temp_print_dir,
            cleanup_temp_print_dir,
            reveal_in_explorer,
            write_file_to_path,
            // Storage paths
            get_database_path,
            get_documents_storage_path,
            get_cache_path,
            get_logs_path,
            get_backup_path,
            get_all_storage_paths,
            cleanup_cache,
            get_storage_stats,
            // License management
            get_machine_id,
            get_platform,
            get_app_version,
            get_hostname,
            get_machine_info,
            store_license,
            get_stored_license,
            remove_stored_license,
        ]);

    info!("🚀 Starting Tauri runtime...");
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}