// src-tauri/src/security.rs - Fixed with proper delays and error handling

use keyring::Entry;
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use once_cell::sync::Lazy;

const SERVICE_NAME: &str = "com.dealerpro.desktop";
const USERNAME: &str = "session-token";

// Mutex to prevent concurrent keyring access
static KEYRING_LOCK: Mutex<()> = Mutex::new(());

// CRITICAL: Keep a persistent Entry to prevent macOS from deleting it
static PERSISTENT_ENTRY: Lazy<Entry> = Lazy::new(|| {
    Entry::new(SERVICE_NAME, USERNAME).expect("Failed to create persistent entry")
});

#[tauri::command]
pub async fn store_secure(key: String, value: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();
    
    println!("🔐 Rust store_secure called");
    println!("   Service: {}", SERVICE_NAME);
    println!("   Username: {}", USERNAME);
    println!("   Value length: {}", value.len());
    
    // Use the persistent entry
    let entry = &*PERSISTENT_ENTRY;
    
    // Delete any existing entry first
    let _ = entry.delete_credential();
    thread::sleep(Duration::from_millis(100));
    
    // Store the password
    entry.set_password(&value)
        .map_err(|e| {
            println!("❌ Failed to store password: {}", e);
            format!("Failed to store: {}", e)
        })?;
    
    println!("✅ Password stored in keyring");
    
    // CRITICAL: Wait for keyring to flush to disk (macOS especially)
    thread::sleep(Duration::from_millis(300));
    
    // Verify storage
    match entry.get_password() {
        Ok(stored) => {
            if stored == value {
                println!("✅ VERIFICATION PASSED: Token matches");
                Ok(())
            } else {
                println!("❌ VERIFICATION FAILED: Token mismatch");
                println!("   Expected length: {}", value.len());
                println!("   Actual length: {}", stored.len());
                Err("Token verification failed - stored value doesn't match".to_string())
            }
        }
        Err(e) => {
            println!("❌ VERIFICATION FAILED: Could not read back: {}", e);
            Err(format!("Verification failed: {}", e))
        }
    }
}

#[tauri::command]
pub async fn retrieve_secure(key: String) -> Result<Option<String>, String> {
    let _lock = KEYRING_LOCK.lock().unwrap();
    
    println!("🔍 Rust retrieve_secure called");
    
    // Small delay to ensure previous operations completed
    thread::sleep(Duration::from_millis(50));
    
    // Use the persistent entry
    let entry = &*PERSISTENT_ENTRY;
    
    match entry.get_password() {
        Ok(password) => {
            let preview = if password.len() > 15 {
                format!("{}...", &password[..15])
            } else {
                password.clone()
            };
            println!("✅ Token retrieved successfully: {}", preview);
            println!("   Full length: {}", password.len());
            Ok(Some(password))
        }
        Err(keyring::Error::NoEntry) => {
            println!("⚠️  No entry found in keyring");
            Ok(None)
        }
        Err(e) => {
            println!("❌ Retrieve failed: {}", e);
            Err(format!("Failed to retrieve: {}", e))
        }
    }
}

#[tauri::command]
pub async fn remove_secure(key: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();
    
    println!("🗑️  Rust remove_secure called");
    
    // Use the persistent entry
    let entry = &*PERSISTENT_ENTRY;
    
    match entry.delete_credential() {
        Ok(_) => {
            println!("✅ Token removed from keyring");
            thread::sleep(Duration::from_millis(100));
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            println!("⚠️  Token already removed or never existed");
            Ok(())
        }
        Err(e) => {
            println!("❌ Failed to remove: {}", e);
            Err(format!("Failed to remove: {}", e))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[tokio::test]
    async fn test_store_and_retrieve() {
        let test_token = "test_token_123456789";
        
        // Store
        let store_result = store_secure("test".to_string(), test_token.to_string()).await;
        assert!(store_result.is_ok(), "Failed to store token");
        
        // Retrieve
        let retrieve_result = retrieve_secure("test".to_string()).await;
        assert!(retrieve_result.is_ok(), "Failed to retrieve token");
        assert_eq!(retrieve_result.unwrap(), Some(test_token.to_string()));
        
        // Clean up
        let remove_result = remove_secure("test".to_string()).await;
        assert!(remove_result.is_ok(), "Failed to remove token");
    }
}