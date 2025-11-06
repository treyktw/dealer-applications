// src-tauri/src/storage.rs
//
// Local data storage paths and configuration for standalone operation
// Ensures data is stored in platform-appropriate directories

use dirs;
use log::{error, info};
use std::path::PathBuf;
use tauri::command;

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
#[command]
pub fn get_database_path() -> Result<String, String> {
    let data_dir = get_app_data_dir()?;
    let db_path = data_dir.join("database");

    // Create directory if it doesn't exist
    if !db_path.exists() {
        std::fs::create_dir_all(&db_path)
            .map_err(|e| format!("Failed to create database directory: {}", e))?;
        info!("Created database directory: {:?}", db_path);
    }

    db_path
        .to_str()
        .ok_or_else(|| "Invalid path encoding".to_string())
        .map(|s| s.to_string())
}

/// Get the documents storage path
#[command]
pub fn get_documents_storage_path() -> Result<String, String> {
    let data_dir = get_app_data_dir()?;
    let docs_path = data_dir.join("documents");

    // Create directory if it doesn't exist
    if !docs_path.exists() {
        std::fs::create_dir_all(&docs_path)
            .map_err(|e| format!("Failed to create documents directory: {}", e))?;
        info!("Created documents directory: {:?}", docs_path);
    }

    docs_path
        .to_str()
        .ok_or_else(|| "Invalid path encoding".to_string())
        .map(|s| s.to_string())
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
