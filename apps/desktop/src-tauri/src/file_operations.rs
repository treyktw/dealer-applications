// src-tauri/src/file_operations.rs
use log::{error, info};
use tauri::AppHandle;

use tauri_plugin_opener::OpenerExt;

/// Get the default downloads directory for the user
#[tauri::command]
pub fn get_downloads_dir() -> Result<String, String> {
    info!("📂 Getting downloads directory...");
    
    match dirs::download_dir() {
        Some(path) => {
            let path_str = path.to_string_lossy().to_string();
            info!("✅ Downloads dir: {}", path_str);
            Ok(path_str)
        }
        None => {
            error!("❌ Could not determine downloads directory");
            Err("Could not determine downloads directory".to_string())
        }
    }
}

/// Get the documents directory for the user
#[tauri::command]
pub fn get_documents_dir() -> Result<String, String> {
    info!("📂 Getting documents directory...");
    
    match dirs::document_dir() {
        Some(path) => {
            let path_str = path.to_string_lossy().to_string();
            info!("✅ Documents dir: {}", path_str);
            Ok(path_str)
        }
        None => {
            error!("❌ Could not determine documents directory");
            Err("Could not determine documents directory".to_string())
        }
    }
}

/// Open a file with the system's default application
#[tauri::command]
pub async fn open_file_with_default_app(file_path: String, app: AppHandle) -> Result<(), String> {
    info!("🚀 Opening file with default app: {}", file_path);
    
    match app.opener().open_path(&file_path, None::<&str>) {
        Ok(_) => {
            info!("✅ File opened successfully");
            Ok(())
        }
        Err(e) => {
            error!("❌ Failed to open file: {}", e);
            Err(format!("Failed to open file: {}", e))
        }
    }
}

/// Print a PDF file using the system's default PDF viewer
#[tauri::command]
pub async fn print_pdf(file_path: String) -> Result<(), String> {
    info!("🖨️  Printing PDF: {}", file_path);
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        match Command::new("cmd")
            .args(&["/C", "start", "/min", "", &file_path])
            .spawn()
        {
            Ok(_) => {
                info!("✅ PDF opened for printing (Windows)");
                Ok(())
            }
            Err(e) => {
                error!("❌ Failed to print PDF: {}", e);
                Err(format!("Failed to print PDF: {}", e))
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        match Command::new("open").arg(&file_path).spawn() {
            Ok(_) => {
                info!("✅ PDF opened for printing (macOS)");
                Ok(())
            }
            Err(e) => {
                error!("❌ Failed to print PDF: {}", e);
                Err(format!("Failed to print PDF: {}", e))
            }
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        
        // Try common Linux PDF viewers
        let viewers = vec!["xdg-open", "evince", "okular", "atril"];
        
        for viewer in viewers {
            match Command::new(viewer).arg(&file_path).spawn() {
                Ok(_) => {
                    info!("✅ PDF opened with {} (Linux)", viewer);
                    return Ok(());
                }
                Err(_) => continue,
            }
        }
        
        error!("❌ No PDF viewer found");
        Err("No PDF viewer found on system".to_string())
    }
}

/// Create a temporary directory for printing
#[tauri::command]
pub fn create_temp_print_dir() -> Result<String, String> {
    info!("📁 Creating temporary print directory...");
    
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};
    
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let temp_dir = std::env::temp_dir().join(format!("dealer-print-{}", timestamp));
    
    match fs::create_dir_all(&temp_dir) {
        Ok(_) => {
            let path_str = temp_dir.to_string_lossy().to_string();
            info!("✅ Temp dir created: {}", path_str);
            Ok(path_str)
        }
        Err(e) => {
            error!("❌ Failed to create temp dir: {}", e);
            Err(format!("Failed to create temp directory: {}", e))
        }
    }
}

/// Clean up temporary print directory
#[tauri::command]
pub fn cleanup_temp_print_dir(dir_path: String) -> Result<(), String> {
    info!("🧹 Cleaning up temp directory: {}", dir_path);
    
    use std::fs;
    
    match fs::remove_dir_all(&dir_path) {
        Ok(_) => {
            info!("✅ Temp dir cleaned up");
            Ok(())
        }
        Err(e) => {
            error!("⚠️  Failed to clean up temp dir: {}", e);
            // Don't fail, just log warning
            Ok(())
        }
    }
}

/// Batch print multiple PDFs
#[tauri::command]
pub async fn batch_print_pdfs(file_paths: Vec<String>) -> Result<usize, String> {
    info!("🖨️  Batch printing {} PDFs...", file_paths.len());
    
    let mut success_count = 0;
    
    for (i, file_path) in file_paths.iter().enumerate() {
        info!("📄 Printing file {}/{}: {}", i + 1, file_paths.len(), file_path);
        
        match print_pdf(file_path.clone()).await {
            Ok(_) => {
                success_count += 1;
                // Small delay between prints
                tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
            }
            Err(e) => {
                error!("⚠️  Failed to print {}: {}", file_path, e);
            }
        }
    }
    
    info!("✅ Successfully opened {} of {} files for printing", success_count, file_paths.len());
    Ok(success_count)
}

/// Write file data to a path (bypasses Tauri FS scope restrictions)
#[tauri::command]
pub fn write_file_to_path(file_path: String, file_data: Vec<u8>) -> Result<(), String> {
    info!("💾 Writing file to path: {}", file_path);
    
    use std::fs;
    use std::path::Path;
    
    // Get parent directory and create if it doesn't exist
    let path = Path::new(&file_path);
    if let Some(parent) = path.parent() {
        if let Err(e) = fs::create_dir_all(parent) {
            error!("❌ Failed to create directory: {}", e);
            return Err(format!("Failed to create directory: {}", e));
        }
    }
    
    match fs::write(&file_path, file_data) {
        Ok(_) => {
            info!("✅ File written successfully: {}", file_path);
            Ok(())
        }
        Err(e) => {
            error!("❌ Failed to write file: {}", e);
            Err(format!("Failed to write file: {}", e))
        }
    }
}

/// Read binary file from a path
#[tauri::command]
pub fn read_binary_file(file_path: String) -> Result<Vec<u8>, String> {
    info!("📖 Reading binary file: {}", file_path);
    
    use std::fs;
    
    match fs::read(&file_path) {
        Ok(data) => {
            info!("✅ File read successfully: {} bytes", data.len());
            Ok(data)
        }
        Err(e) => {
            error!("❌ Failed to read file: {}", e);
            Err(format!("Failed to read file: {}", e))
        }
    }
}

/// Remove/delete a file
#[tauri::command]
pub fn remove_file(file_path: String) -> Result<(), String> {
    info!("🗑️  Removing file: {}", file_path);
    
    use std::fs;
    
    match fs::remove_file(&file_path) {
        Ok(_) => {
            info!("✅ File removed successfully: {}", file_path);
            Ok(())
        }
        Err(e) => {
            error!("❌ Failed to remove file: {}", e);
            Err(format!("Failed to remove file: {}", e))
        }
    }
}

/// Join path segments
#[tauri::command]
pub fn join_path(segments: Vec<String>) -> Result<String, String> {
    use std::path::PathBuf;
    
    let mut path = PathBuf::new();
    for segment in segments {
        path.push(segment);
    }
    
    match path.to_str() {
        Some(path_str) => Ok(path_str.to_string()),
        None => Err("Invalid path encoding".to_string()),
    }
}

/// Open a URL in the system's default browser
#[tauri::command]
pub async fn open_url(url: String, app: AppHandle) -> Result<(), String> {
    info!("🌐 Opening URL in browser: {}", url);
    
    match app.opener().open_url(&url, None::<&str>) {
        Ok(_) => {
            info!("✅ URL opened successfully");
            Ok(())
        }
        Err(e) => {
            error!("❌ Failed to open URL: {}", e);
            Err(format!("Failed to open URL: {}", e))
        }
    }
}

/// Reveal file in file explorer
#[tauri::command]
pub fn reveal_in_explorer(file_path: String) -> Result<(), String> {
    info!("📂 Revealing file in explorer: {}", file_path);
    
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        
        match Command::new("explorer")
            .args(&["/select,", &file_path])
            .spawn()
        {
            Ok(_) => {
                info!("✅ File revealed in explorer");
                Ok(())
            }
            Err(e) => {
                error!("❌ Failed to reveal file: {}", e);
                Err(format!("Failed to reveal file: {}", e))
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        use std::process::Command;
        
        match Command::new("open")
            .args(&["-R", &file_path])
            .spawn()
        {
            Ok(_) => {
                info!("✅ File revealed in Finder");
                Ok(())
            }
            Err(e) => {
                error!("❌ Failed to reveal file: {}", e);
                Err(format!("Failed to reveal file: {}", e))
            }
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        use std::process::Command;
        use std::path::Path;
        
        let path = Path::new(&file_path);
        let dir = path.parent().unwrap_or(path);
        
        match Command::new("xdg-open")
            .arg(dir)
            .spawn()
        {
            Ok(_) => {
                info!("✅ Directory opened in file manager");
                Ok(())
            }
            Err(e) => {
                error!("❌ Failed to open directory: {}", e);
                Err(format!("Failed to open directory: {}", e))
            }
        }
    }
}