// src-tauri/src/security.rs - FIXED: Accept dynamic key names
use keyring::Entry;
use log::{info, error};

use std::sync::Mutex;

const SERVICE_NAME: &str = "net.universalautobrokers.dealersoftware";

static KEYRING_LOCK: Mutex<()> = Mutex::new(());

#[tauri::command]
pub async fn store_secure(key: String, value: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("═══════════════════════════════════");
    info!("🔐 STORE_SECURE CALLED");
    info!("═══════════════════════════════════");
    info!("   Service: {}", SERVICE_NAME);
    info!("   Account: {}", key); // ✅ Use the key parameter!
    info!("   Value length: {}", value.len());
    info!("   Value preview: {}...", &value[..20.min(value.len())]);

    // ✅ Create entry with dynamic key
    let entry =
        Entry::new(SERVICE_NAME, &key).map_err(|e| format!("Failed to create entry: {}", e))?;

    // Delete existing entry (ignore errors)
    info!("🗑️ Attempting to delete existing entry...");
    match entry.delete_credential() {
        Ok(_) => info!("   Deleted existing entry"),
        Err(keyring::Error::NoEntry) => info!("   No existing entry to delete"),
        Err(e) => info!("   Delete error (non-critical): {}", e),
    }

    std::thread::sleep(std::time::Duration::from_millis(50));

    // Store new value
    info!("💾 Storing new value...");
    match entry.set_password(&value) {
        Ok(_) => info!("✅ set_password() succeeded"),
        Err(e) => {
            error!("❌ set_password() FAILED: {}", e);
            return Err(format!("Store failed: {}", e));
        }
    }

    info!("⏳ Waiting 100ms...");
    std::thread::sleep(std::time::Duration::from_millis(100));

    // Verify storage
    info!("🔍 Verifying storage...");
    match entry.get_password() {
        Ok(stored) => {
            info!("✅ VERIFICATION SUCCESS");

            let matches = stored == value;
            info!("   Values match: {}", matches);

            if !matches {
                error!("❌ VALUE MISMATCH!");
                return Err("Verification failed: value mismatch".to_string());
            }

            info!("✅ Token stored and verified successfully");
            Ok(())
        }
        Err(e) => {
            error!("❌ VERIFICATION FAILED: {}", e);
            Err(format!("Verification failed: {}", e))
        }
    }
}

#[tauri::command]
pub async fn retrieve_secure(key: String) -> Result<Option<String>, String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("═══════════════════════════════════");
    info!("🔍 RETRIEVE_SECURE CALLED");
    info!("═══════════════════════════════════");
    info!("   Service: {}", SERVICE_NAME);
    info!("   Account: {}", key); // ✅ Use the key parameter!

    std::thread::sleep(std::time::Duration::from_millis(50));

    // ✅ Create entry with dynamic key
    let entry =
        Entry::new(SERVICE_NAME, &key).map_err(|e| format!("Failed to create entry: {}", e))?;

    info!("📡 Calling get_password()...");
    match entry.get_password() {
        Ok(password) => {
            info!("✅ TOKEN FOUND!");
            info!("   Length: {}", password.len());
            info!("   Preview: {}...", &password[..20.min(password.len())]);
            Ok(Some(password))
        }
        Err(keyring::Error::NoEntry) => {
            info!("⚠️  NO ENTRY FOUND");
            info!("   Searched for:");
            info!("     Service: {}", SERVICE_NAME);
            info!("     Account: {}", key);
            info!("   This is normal on first launch or after logout");
            Ok(None)
        }
        Err(e) => {
            error!("❌ RETRIEVE ERROR: {}", e);
            Err(format!("Retrieve failed: {}", e))
        }
    }
}

#[tauri::command]
pub async fn remove_secure(key: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("═══════════════════════════════════");
    info!("🗑️ REMOVE_SECURE CALLED");
    info!("═══════════════════════════════════");
    info!("   Service: {}", SERVICE_NAME);
    info!("   Account: {}", key); // ✅ Use the key parameter!

    // ✅ Create entry with dynamic key
    let entry =
        Entry::new(SERVICE_NAME, &key).map_err(|e| format!("Failed to create entry: {}", e))?;

    match entry.delete_credential() {
        Ok(_) => {
            info!("✅ Entry deleted successfully");
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            info!("⚠️  No entry to delete (already removed)");
            Ok(())
        }
        Err(e) => {
            error!("❌ Delete failed: {}", e);
            Err(format!("Delete failed: {}", e))
        }
    }
}
