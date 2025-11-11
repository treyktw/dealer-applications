// src-tauri/src/docs_config.rs
// SECURITY: Specific commands for documents root path storage only
// Prevents JS from accessing arbitrary secrets via generic commands

use keyring::Entry;
use log::{error, info};
use std::sync::Mutex;

const SERVICE_NAME: &str = "net.universalautobrokers.dealersoftware";
const DOCS_ROOT_KEY: &str = "documents_root_path";

static KEYRING_LOCK: Mutex<()> = Mutex::new(());

/// Store documents root path securely in OS keyring
/// SECURITY: This command only works for documents root path - no arbitrary keys allowed
#[tauri::command]
pub async fn store_documents_root_path(path: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔐 [DOCS-CONFIG] Storing documents root path in secure storage");

    let entry = Entry::new(SERVICE_NAME, DOCS_ROOT_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    // Delete existing entry (ignore errors)
    match entry.delete_credential() {
        Ok(_) => info!("   Deleted existing entry"),
        Err(keyring::Error::NoEntry) => info!("   No existing entry to delete"),
        Err(e) => info!("   Delete error (non-critical): {}", e),
    }

    std::thread::sleep(std::time::Duration::from_millis(50));

    // Store new value
    match entry.set_password(&path) {
        Ok(_) => {
            info!("✅ [DOCS-CONFIG] Documents root path stored successfully: {}", path);
            Ok(())
        }
        Err(e) => {
            error!("❌ [DOCS-CONFIG] Failed to store documents root path: {}", e);
            Err(format!("Failed to store documents root path: {}", e))
        }
    }
}

/// Retrieve documents root path from OS keyring
/// SECURITY: This command only works for documents root path - no arbitrary keys allowed
#[tauri::command]
pub async fn get_documents_root_path() -> Result<Option<String>, String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔍 [DOCS-CONFIG] Retrieving documents root path from secure storage");

    let entry = Entry::new(SERVICE_NAME, DOCS_ROOT_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.get_password() {
        Ok(path) => {
            info!("✅ [DOCS-CONFIG] Documents root path retrieved: {}", path);
            Ok(Some(path))
        }
        Err(keyring::Error::NoEntry) => {
            info!("ℹ️ [DOCS-CONFIG] No documents root path found in secure storage");
            Ok(None)
        }
        Err(e) => {
            error!("❌ [DOCS-CONFIG] Failed to retrieve documents root path: {}", e);
            Err(format!("Failed to retrieve documents root path: {}", e))
        }
    }
}

/// Remove documents root path from OS keyring
/// SECURITY: This command only works for documents root path - no arbitrary keys allowed
#[tauri::command]
pub async fn remove_documents_root_path() -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🗑️ [DOCS-CONFIG] Removing documents root path from secure storage");

    let entry = Entry::new(SERVICE_NAME, DOCS_ROOT_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.delete_credential() {
        Ok(_) => {
            info!("✅ [DOCS-CONFIG] Documents root path removed successfully");
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            info!("ℹ️ [DOCS-CONFIG] No documents root path to remove");
            Ok(())
        }
        Err(e) => {
            error!("❌ [DOCS-CONFIG] Failed to remove documents root path: {}", e);
            Err(format!("Failed to remove documents root path: {}", e))
        }
    }
}

