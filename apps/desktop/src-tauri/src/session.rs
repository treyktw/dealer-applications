// src-tauri/src/session.rs
// SECURITY: Specific commands for session token storage only
// Prevents JS from accessing arbitrary secrets via generic commands

use keyring::Entry;
use log::{error, info};

use std::sync::Mutex;

const SERVICE_NAME: &str = "net.universalautobrokers.dealersoftware";
const SESSION_TOKEN_KEY: &str = "standalone_session_token";

static KEYRING_LOCK: Mutex<()> = Mutex::new(());

/// Store session token securely in OS keyring
/// SECURITY: This command only works for session tokens - no arbitrary keys allowed
#[tauri::command]
pub async fn store_session_token(token: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔐 [SESSION] Storing session token in secure storage");

    let entry = Entry::new(SERVICE_NAME, SESSION_TOKEN_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    // Delete existing entry (ignore errors)
    match entry.delete_credential() {
        Ok(_) => info!("   Deleted existing entry"),
        Err(keyring::Error::NoEntry) => info!("   No existing entry to delete"),
        Err(e) => info!("   Delete error (non-critical): {}", e),
    }

    std::thread::sleep(std::time::Duration::from_millis(50));

    // Store new value
    match entry.set_password(&token) {
        Ok(_) => {
            info!("✅ [SESSION] Session token stored successfully");
            Ok(())
        }
        Err(e) => {
            error!("❌ [SESSION] Failed to store session token: {}", e);
            Err(format!("Failed to store session token: {}", e))
        }
    }
}

/// Retrieve session token from OS keyring
/// SECURITY: This command only works for session tokens - no arbitrary keys allowed
#[tauri::command]
pub async fn get_session_token() -> Result<Option<String>, String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔍 [SESSION] Retrieving session token from secure storage");

    let entry = Entry::new(SERVICE_NAME, SESSION_TOKEN_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.get_password() {
        Ok(token) => {
            info!("✅ [SESSION] Session token found");
            Ok(Some(token))
        }
        Err(keyring::Error::NoEntry) => {
            info!("⚠️  [SESSION] No session token found (normal on first launch or after logout)");
            Ok(None)
        }
        Err(e) => {
            error!("❌ [SESSION] Failed to retrieve session token: {}", e);
            Err(format!("Failed to retrieve session token: {}", e))
        }
    }
}

/// Remove session token from OS keyring
/// SECURITY: This command only works for session tokens - no arbitrary keys allowed
#[tauri::command]
pub async fn remove_session_token() -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🗑️ [SESSION] Removing session token from secure storage");

    let entry = Entry::new(SERVICE_NAME, SESSION_TOKEN_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.delete_credential() {
        Ok(_) => {
            info!("✅ [SESSION] Session token removed successfully");
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            info!("⚠️  [SESSION] No session token to remove (already removed)");
            Ok(())
        }
        Err(e) => {
            error!("❌ [SESSION] Failed to remove session token: {}", e);
            Err(format!("Failed to remove session token: {}", e))
        }
    }
}

