// src-tauri/src/storage.rs
//
// Local data storage paths and configuration for standalone operation
// Ensures data is stored in platform-appropriate directories

use dirs;
use log::{error, info};
use std::path::PathBuf;
use tauri::command;
use tauri_plugin_dialog::DialogExt;

/// Get the application data directory
/// Platform-specific paths:
/// - Windows: C:\Users\{user}\AppData\Local\dealer-software
/// - macOS: ~/Library/Application Support/net.universalautobrokers.dealersoftware
/// - Linux: ~/.local/share/dealer-software
pub fn get_app_data_dir() -> Result<PathBuf, String> {
    let app_name = "dealer-software";

    #[cfg(target_os = "macos")]
    let base_dir = dirs::data_local_dir()
        .ok_or_else(|| "Could not determine local data directory".to_string())?;

    #[cfg(not(target_os = "macos"))]
    let base_dir = dirs::data_dir()
        .ok_or_else(|| "Could not determine data directory".to_string())?;

    let app_dir = base_dir.join(app_name);

    // Create directory if it doesn't exist
    if !app_dir.exists() {
        std::fs::create_dir_all(&app_dir)
            .map_err(|e| format!("Failed to create app data directory: {}", e))?;
        info!("Created app data directory: {:?}", app_dir);
    }

    Ok(app_dir)
}

/// Get the database storage path
/// In development: uses db/ folder in app root
/// In production: uses app data directory
#[command]
pub fn get_database_path() -> Result<String, String> {
    #[cfg(debug_assertions)]
    {
        // Development: use db/ folder in app root
        let mut db_path = std::env::current_exe()
            .map_err(|e| format!("Failed to get current exe: {}", e))?;
        
        // Navigate to app root (go up from target/debug or target/release)
        while db_path.file_name().and_then(|n| n.to_str()) != Some("dealer-software") {
            if !db_path.pop() {
                break;
            }
        }
        
        // If we're in src-tauri/target, go up to src-tauri
        if db_path.ends_with("target") {
            db_path.pop();
        }
        
        // Go up to app root
        db_path.pop();
        db_path.push("db");
        
        // Create directory if it doesn't exist
        if !db_path.exists() {
            std::fs::create_dir_all(&db_path)
                .map_err(|e| format!("Failed to create database directory: {}", e))?;
            info!("Created database directory: {:?}", db_path);
        }
        
        let db_file = db_path.join("dealer.db");
        return db_file
            .to_str()
            .ok_or_else(|| "Invalid path encoding".to_string())
            .map(|s| s.to_string());
    }
    
    #[cfg(not(debug_assertions))]
    {
        // Production: use app data directory
        let data_dir = get_app_data_dir()?;
        let db_path = data_dir.join("dealer.db");
        
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create database directory: {}", e))?;
                info!("Created database directory: {:?}", parent);
            }
        }
        
        return db_path
            .to_str()
            .ok_or_else(|| "Invalid path encoding".to_string())
            .map(|s| s.to_string());
    }
}

/// Get the documents storage path (default fallback)
/// Default: AppData/DealerDocs/
/// Note: User-chosen path is stored in secure storage and checked by TypeScript
#[command]
pub fn get_documents_storage_path() -> Result<String, String> {
    // Default fallback: AppData/DealerDocs/
    let data_dir = get_app_data_dir()?;
    let docs_path = data_dir.join("DealerDocs");

    if !docs_path.exists() {
        std::fs::create_dir_all(&docs_path)
            .map_err(|e| format!("Failed to create documents directory: {}", e))?;
        info!("Created default documents directory: {:?}", docs_path);
    }

    docs_path
        .to_str()
        .ok_or_else(|| "Invalid path encoding".to_string())
        .map(|s| s.to_string())
}

/// Prompt user to select documents root directory
/// Returns the selected path or None if cancelled
/// Uses callback-based API from tauri-plugin-dialog
#[command]
pub async fn prompt_select_documents_directory(
    app: tauri::AppHandle,
) -> Result<Option<String>, String> {
    info!("📂 [DOCS-CONFIG] Prompting user to select documents directory");

    use tokio::sync::oneshot;
    
    let (tx, rx) = oneshot::channel();
    
    // Use file dialog in directory selection mode with callback
    app.dialog()
        .file()
        .set_title("Select Documents Storage Location")
        .pick_folder(move |path_opt| {
            let _ = tx.send(path_opt);
        });

    // Wait for the result from the callback (non-blocking in async context)
    let result = rx.await.map_err(|e| format!("Failed to receive dialog result: {}", e))?;

    match result {
        Some(file_path) => {
            // Convert FilePath to PathBuf via string conversion
            let path_str = file_path.to_string();
            let path_buf = PathBuf::from(&path_str);
            info!("✅ [DOCS-CONFIG] User selected directory: {}", path_str);
            
            // Ensure directory exists
            if !path_buf.exists() {
                std::fs::create_dir_all(&path_buf)
                    .map_err(|e| format!("Failed to create directory: {}", e))?;
            }
            
            Ok(Some(path_str))
        }
        None => {
            info!("ℹ️ [DOCS-CONFIG] User cancelled directory selection");
            Ok(None)
        }
    }
}

/// Set custom documents storage path (user-chosen)
#[command]
pub fn set_custom_documents_path(path: String) -> Result<String, String> {
    let custom_path = PathBuf::from(&path);
    
    if !custom_path.exists() {
        std::fs::create_dir_all(&custom_path)
            .map_err(|e| format!("Failed to create custom documents directory: {}", e))?;
        info!("Created custom documents directory: {:?}", custom_path);
    }
    
    // Store the custom path in settings (we'll add this to the database later)
    Ok(path)
}

/// Get the cache storage path
#[command]
pub fn get_cache_path() -> Result<String, String> {
    let cache_dir = dirs::cache_dir()
        .ok_or_else(|| "Could not determine cache directory".to_string())?;

    let app_cache = cache_dir.join("dealer-software");

    // Create directory if it doesn't exist
    if !app_cache.exists() {
        std::fs::create_dir_all(&app_cache)
            .map_err(|e| format!("Failed to create cache directory: {}", e))?;
        info!("Created cache directory: {:?}", app_cache);
    }

    app_cache
        .to_str()
        .ok_or_else(|| "Invalid path encoding".to_string())
        .map(|s| s.to_string())
}

/// Get the logs storage path
#[command]
pub fn get_logs_path() -> Result<String, String> {
    let data_dir = get_app_data_dir()?;
    let logs_path = data_dir.join("logs");

    // Create directory if it doesn't exist
    if !logs_path.exists() {
        std::fs::create_dir_all(&logs_path)
            .map_err(|e| format!("Failed to create logs directory: {}", e))?;
        info!("Created logs directory: {:?}", logs_path);
    }

    logs_path
        .to_str()
        .ok_or_else(|| "Invalid path encoding".to_string())
        .map(|s| s.to_string())
}

/// Get the backup storage path
#[command]
pub fn get_backup_path() -> Result<String, String> {
    let data_dir = get_app_data_dir()?;
    let backup_path = data_dir.join("backups");

    // Create directory if it doesn't exist
    if !backup_path.exists() {
        std::fs::create_dir_all(&backup_path)
            .map_err(|e| format!("Failed to create backup directory: {}", e))?;
        info!("Created backup directory: {:?}", backup_path);
    }

    backup_path
        .to_str()
        .ok_or_else(|| "Invalid path encoding".to_string())
        .map(|s| s.to_string())
}

/// Get all storage paths
#[command]
pub fn get_all_storage_paths() -> Result<serde_json::Value, String> {
    let paths = serde_json::json!({
        "database": get_database_path()?,
        "documents": get_documents_storage_path()?,
        "cache": get_cache_path()?,
        "logs": get_logs_path()?,
        "backup": get_backup_path()?,
    });

    Ok(paths)
}

/// Clean up old cache files
#[command]
pub fn cleanup_cache() -> Result<String, String> {
    let cache_path = get_cache_path()?;
    let path = PathBuf::from(cache_path);

    if !path.exists() {
        return Ok("Cache directory does not exist".to_string());
    }

    // Get cache size before cleanup
    let size_before = get_directory_size(&path)?;

    // Remove files older than 30 days
    let cutoff_time = std::time::SystemTime::now()
        - std::time::Duration::from_secs(30 * 24 * 60 * 60);

    let mut removed_count = 0;
    let mut failed_count = 0;

    if let Ok(entries) = std::fs::read_dir(&path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(modified) = metadata.modified() {
                    if modified < cutoff_time {
                        match std::fs::remove_file(entry.path()) {
                            Ok(_) => {
                                removed_count += 1;
                                info!("Removed old cache file: {:?}", entry.path());
                            }
                            Err(e) => {
                                failed_count += 1;
                                error!("Failed to remove cache file: {:?} - {}", entry.path(), e);
                            }
                        }
                    }
                }
            }
        }
    }

    let size_after = get_directory_size(&path)?;
    let freed = size_before.saturating_sub(size_after);

    Ok(format!(
        "Removed {} files, {} failed. Freed {} bytes.",
        removed_count, failed_count, freed
    ))
}

/// Get directory size in bytes
fn get_directory_size(path: &PathBuf) -> Result<u64, String> {
    let mut size: u64 = 0;

    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if metadata.is_file() {
                    size += metadata.len();
                } else if metadata.is_dir() {
                    size += get_directory_size(&entry.path())?;
                }
            }
        }
    }

    Ok(size)
}

/// Get storage usage statistics
#[command]
pub fn get_storage_stats() -> Result<serde_json::Value, String> {
    let database_path = PathBuf::from(get_database_path()?);
    let documents_path = PathBuf::from(get_documents_storage_path()?);
    let cache_path = PathBuf::from(get_cache_path()?);
    let logs_path = PathBuf::from(get_logs_path()?);

    let stats = serde_json::json!({
        "database_size": get_directory_size(&database_path).unwrap_or(0),
        "documents_size": get_directory_size(&documents_path).unwrap_or(0),
        "cache_size": get_directory_size(&cache_path).unwrap_or(0),
        "logs_size": get_directory_size(&logs_path).unwrap_or(0),
    });

    Ok(stats)
}
