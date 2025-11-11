// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod encryption;
mod file_permissions;
mod file_operations;
mod storage;
mod license;
mod database;
mod session;
mod dealership_auth;
mod docs_config;
mod aws_config;
mod s3_service;

use encryption::{decrypt_data, encrypt_data, generate_encryption_key};
use file_permissions::{check_file_permissions, get_storage_file_path, set_file_permissions};
use file_operations::{
    batch_print_pdfs, cleanup_temp_print_dir, create_temp_print_dir, get_documents_dir,
    get_downloads_dir, join_path, open_file_with_default_app, open_url, print_pdf,
    read_binary_file, remove_file, reveal_in_explorer, write_file_to_path,
};
use license::{
    get_app_version, get_hostname, get_machine_id, get_machine_info, get_platform,
    get_stored_license, remove_stored_license, store_license,
};
use log::{error, info};
use session::{get_session_token, remove_session_token, store_session_token};
use dealership_auth::{get_dealership_auth_token, remove_dealership_auth_token, store_dealership_auth_token};
use docs_config::{get_documents_root_path, remove_documents_root_path, store_documents_root_path};
use aws_config::{
    get_aws_access_key_id, get_aws_bucket_name, get_aws_region, get_aws_secret_access_key,
    store_aws_access_key_id, store_aws_bucket_name, store_aws_region, store_aws_secret_access_key,
};
use s3_service::{
    s3_delete_document, s3_document_exists, s3_download_document, s3_upload_document,
};
use storage::{
    cleanup_cache, get_all_storage_paths, get_backup_path, get_cache_path,
    get_database_path, get_documents_storage_path, get_logs_path, get_storage_stats,
    prompt_select_documents_directory, set_custom_documents_path,
};
use database::{
    // Client commands
    db_create_client, db_get_client, db_get_all_clients, db_update_client,
    db_delete_client, db_search_clients,
    // Vehicle commands
    db_create_vehicle, db_get_vehicle, db_get_all_vehicles, db_get_vehicle_by_vin,
    db_get_vehicle_by_stock, db_update_vehicle, db_delete_vehicle,
    db_search_vehicles, db_get_vehicles_by_status,
    // Deal commands
    db_create_deal, db_get_deal, db_get_all_deals, db_get_deals_by_client,
    db_get_deals_by_vehicle, db_get_deals_by_status, db_update_deal,
    db_delete_deal, db_search_deals, db_get_deals_stats,
    // Document commands
    db_create_document, db_get_document, db_get_documents_by_deal,
    db_update_document, db_delete_document,
    // Database utility
    db_clear_all_data,
    // Database - Settings
    db_get_setting,
    db_set_setting,
    // Database initialization
    init_database,
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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            info!("🔗 Setting up deep link handler...");
            
            // Initialize SQLite database early in Tauri startup
            info!("💾 Initializing SQLite database...");
            match init_database() {
                Ok(_) => {
                    info!("✅ SQLite database initialized successfully");
                }
                Err(e) => {
                    error!("❌ Failed to initialize SQLite database: {}", e);
                    // Don't fail the app startup, but log the error
                }
            }

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
            // Session token storage (OS Keyring) - SECURITY: Scoped to session tokens only
            store_session_token,
            get_session_token,
            remove_session_token,
            // Dealership auth token storage (OS Keyring) - SECURITY: Scoped to dealership auth tokens only
            store_dealership_auth_token,
            get_dealership_auth_token,
            remove_dealership_auth_token,
            // Documents root path storage (OS Keyring) - SECURITY: Scoped to documents root path only
            store_documents_root_path,
            get_documents_root_path,
            remove_documents_root_path,
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
            open_url,
            print_pdf,
            batch_print_pdfs,
            create_temp_print_dir,
            cleanup_temp_print_dir,
            reveal_in_explorer,
            write_file_to_path,
            read_binary_file,
            remove_file,
            join_path,
            // Storage paths
            get_database_path,
            get_documents_storage_path,
            prompt_select_documents_directory,
            set_custom_documents_path,
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
            // Database - Clients
            db_create_client,
            db_get_client,
            db_get_all_clients,
            db_update_client,
            db_delete_client,
            db_search_clients,
            // Database - Vehicles
            db_create_vehicle,
            db_get_vehicle,
            db_get_all_vehicles,
            db_get_vehicle_by_vin,
            db_get_vehicle_by_stock,
            db_update_vehicle,
            db_delete_vehicle,
            db_search_vehicles,
            db_get_vehicles_by_status,
            // Database - Deals
            db_create_deal,
            db_get_deal,
            db_get_all_deals,
            db_get_deals_by_client,
            db_get_deals_by_vehicle,
            db_get_deals_by_status,
            db_update_deal,
            db_delete_deal,
            db_search_deals,
            db_get_deals_stats,
            // Database - Documents
            db_create_document,
            db_get_document,
            db_get_documents_by_deal,
            db_update_document,
            db_delete_document,
            // Database - Utility
            db_clear_all_data,
            // Database - Settings
            db_get_setting,
            db_set_setting,
            // AWS Configuration (OS Keyring) - SECURITY: Scoped to AWS credentials only
            store_aws_access_key_id,
            get_aws_access_key_id,
            store_aws_secret_access_key,
            get_aws_secret_access_key,
            store_aws_region,
            get_aws_region,
            store_aws_bucket_name,
            get_aws_bucket_name,
            // S3 Service
            s3_upload_document,
            s3_download_document,
            s3_delete_document,
            s3_document_exists,
        ]);

    info!("🚀 Starting Tauri runtime...");
    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}