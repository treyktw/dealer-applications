// src-tauri/src/dealership_auth.rs
// SECURITY: Specific commands for dealership auth token storage only
// Prevents JS from accessing arbitrary secrets via generic commands

use keyring::Entry;
use log::{error, info};

use std::sync::Mutex;

const SERVICE_NAME: &str = "net.universalautobrokers.dealersoftware";
const DEALERSHIP_AUTH_TOKEN_KEY: &str = "dealer_auth_token";

static KEYRING_LOCK: Mutex<()> = Mutex::new(());

/// Store dealership auth token securely in OS keyring
/// SECURITY: This command only works for dealership auth tokens - no arbitrary keys allowed
#[tauri::command]
pub async fn store_dealership_auth_token(token: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔐 [DEALERSHIP-AUTH] Storing auth token in secure storage");

    let entry = Entry::new(SERVICE_NAME, DEALERSHIP_AUTH_TOKEN_KEY)
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
            info!("✅ [DEALERSHIP-AUTH] Auth token stored successfully");
            Ok(())
        }
        Err(e) => {
            error!("❌ [DEALERSHIP-AUTH] Failed to store auth token: {}", e);
            Err(format!("Failed to store auth token: {}", e))
        }
    }
}

/// Retrieve dealership auth token from OS keyring
/// SECURITY: This command only works for dealership auth tokens - no arbitrary keys allowed
#[tauri::command]
pub async fn get_dealership_auth_token() -> Result<Option<String>, String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔍 [DEALERSHIP-AUTH] Retrieving auth token from secure storage");

    let entry = Entry::new(SERVICE_NAME, DEALERSHIP_AUTH_TOKEN_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.get_password() {
        Ok(token) => {
            info!("✅ [DEALERSHIP-AUTH] Auth token found");
            Ok(Some(token))
        }
        Err(keyring::Error::NoEntry) => {
            info!("⚠️  [DEALERSHIP-AUTH] No auth token found (normal on first launch or after logout)");
            Ok(None)
        }
        Err(e) => {
            error!("❌ [DEALERSHIP-AUTH] Failed to retrieve auth token: {}", e);
            Err(format!("Failed to retrieve auth token: {}", e))
        }
    }
}

/// Remove dealership auth token from OS keyring
/// SECURITY: This command only works for dealership auth tokens - no arbitrary keys allowed
#[tauri::command]
pub async fn remove_dealership_auth_token() -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🗑️ [DEALERSHIP-AUTH] Removing auth token from secure storage");

    let entry = Entry::new(SERVICE_NAME, DEALERSHIP_AUTH_TOKEN_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.delete_credential() {
        Ok(_) => {
            info!("✅ [DEALERSHIP-AUTH] Auth token removed successfully");
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            info!("⚠️  [DEALERSHIP-AUTH] No auth token to remove (already removed)");
            Ok(())
        }
        Err(e) => {
            error!("❌ [DEALERSHIP-AUTH] Failed to remove auth token: {}", e);
            Err(format!("Failed to remove auth token: {}", e))
        }
    }
}

