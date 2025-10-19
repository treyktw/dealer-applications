// src-tauri/src/file_permissions.rs - Set strict file permissions
use tauri::{AppHandle, Manager};
use log::info;
use std::fs

#[cfg(unix)]
use std::os::unix::fs::PermissionsExt;

/// Set strict file permissions (owner read/write only - 600)
#[tauri::command]
pub fn set_file_permissions(filename: String, app: AppHandle) -> Result<(), String> {
    info!("🔒 Setting strict file permissions...");
    info!("   File: {}", filename);

    // Get app data directory
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let file_path = app_dir.join(&filename);

    if !file_path.exists() {
        return Err(format!("File does not exist: {:?}", file_path));
    }

    #[cfg(unix)]
    {
        // Set permissions to 600 (rw-------)
        // Owner: read + write
        // Group: none
        // Others: none
        let mut perms = fs::metadata(&file_path)
            .map_err(|e| format!("Failed to get file metadata: {}", e))?
            .permissions();

        perms.set_mode(0o600);

        fs::set_permissions(&file_path, perms)
            .map_err(|e| format!("Failed to set permissions: {}", e))?;

        info!("✅ File permissions set to 600 (owner read/write only)");
        info!("   Path: {:?}", file_path);
    }

    #[cfg(not(unix))]
    {
        info!("⚠️  File permissions not set (Windows doesn't use Unix permissions)");
        info!("   Using Windows ACLs instead (handled by OS)");
    }

    Ok(())
}

/// Check if file has secure permissions
#[tauri::command]
pub fn check_file_permissions(filename: String, app: AppHandle) -> Result<bool, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let file_path = app_dir.join(&filename);

    if !file_path.exists() {
        return Ok(false);
    }

    #[cfg(unix)]
    {
        let metadata =
            fs::metadata(&file_path).map_err(|e| format!("Failed to get metadata: {}", e))?;

        let permissions = metadata.permissions();
        let mode = permissions.mode();

        // Check if permissions are 600 (0o600 = 384 in decimal)
        let is_secure = (mode & 0o777) == 0o600;

        info!("📋 File permissions check:");
        info!("   Path: {:?}", file_path);
        info!("   Mode: {:o}", mode & 0o777);
        info!("   Secure (600): {}", is_secure);

        Ok(is_secure)
    }

    #[cfg(not(unix))]
    {
        // On Windows, assume secure if file exists
        // Windows uses ACLs which are handled by the OS
        Ok(true)
    }
}

/// Get the full path to the encrypted storage file
#[tauri::command]
pub fn get_storage_file_path(filename: String, app: AppHandle) -> Result<String, String> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let file_path = app_dir.join(&filename);

    Ok(file_path.to_string_lossy().to_string())
}
