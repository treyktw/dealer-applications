// src-tauri/src/security.rs - Enhanced with detailed error logging
use keyring::Entry;
use std::sync::Mutex;
use once_cell::sync::Lazy;

const SERVICE_NAME: &str = "net.universalautobrokers.dealersoftware";
const USERNAME: &str = "session-token";

static KEYRING_LOCK: Mutex<()> = Mutex::new(());

// Keep Entry persistent
static PERSISTENT_ENTRY: Lazy<Entry> = Lazy::new(|| {
    println!("🔐 Creating persistent keychain entry");
    println!("   Service: {}", SERVICE_NAME);
    println!("   Account: {}", USERNAME);
    
    match Entry::new(SERVICE_NAME, USERNAME) {
        Ok(entry) => {
            println!("✅ Keychain entry created successfully");
            entry
        }
        Err(e) => {
            eprintln!("❌ CRITICAL: Failed to create keychain entry: {}", e);
            panic!("Cannot proceed without keychain access");
        }
    }
});

#[tauri::command]
pub async fn store_secure(key: String, value: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();
    
    println!("═══════════════════════════════════");
    println!("🔐 STORE_SECURE CALLED");
    println!("═══════════════════════════════════");
    println!("   Service: {}", SERVICE_NAME);
    println!("   Account: {}", USERNAME);
    println!("   Key parameter: {}", key);
    println!("   Value length: {}", value.len());
    println!("   Value preview: {}...", &value[..20.min(value.len())]);
    
    let entry = &*PERSISTENT_ENTRY;
    
    // Try to delete existing entry (ignore errors)
    println!("🗑️ Attempting to delete existing entry...");
    match entry.delete_credential() {
        Ok(_) => println!("   Deleted existing entry"),
        Err(keyring::Error::NoEntry) => println!("   No existing entry to delete"),
        Err(e) => println!("   Delete error (non-critical): {}", e),
    }
    
    std::thread::sleep(std::time::Duration::from_millis(50));
    
    // Store new value
    println!("💾 Storing new value...");
    match entry.set_password(&value) {
        Ok(_) => println!("✅ set_password() succeeded"),
        Err(e) => {
            eprintln!("❌ set_password() FAILED: {}", e);
            eprintln!("   Error type: {:?}", e);
            return Err(format!("Store failed: {}", e));
        }
    }
    
    println!("⏳ Waiting 100ms...");
    std::thread::sleep(std::time::Duration::from_millis(100));
    
    // Verify storage
    println!("🔍 Verifying storage...");
    match entry.get_password() {
        Ok(stored) => {
            println!("✅ VERIFICATION SUCCESS");
            println!("   Retrieved length: {}", stored.len());
            println!("   Original length: {}", value.len());
            println!("   Lengths match: {}", stored.len() == value.len());
            
            let matches = stored == value;
            println!("   Values match: {}", matches);
            
            if !matches {
                eprintln!("❌ VALUE MISMATCH!");
                eprintln!("   Expected: {}...", &value[..20.min(value.len())]);
                eprintln!("   Got: {}...", &stored[..20.min(stored.len())]);
                return Err("Verification failed: value mismatch".to_string());
            }
            
            println!("✅ Token stored and verified successfully");
            Ok(())
        }
        Err(e) => {
            eprintln!("❌ VERIFICATION FAILED");
            eprintln!("   Could not retrieve after storing!");
            eprintln!("   Error: {}", e);
            eprintln!("   Error type: {:?}", e);
            Err(format!("Verification failed: {}", e))
        }
    }
}

#[tauri::command]
pub async fn retrieve_secure(key: String) -> Result<Option<String>, String> {
    let _lock = KEYRING_LOCK.lock().unwrap();
    
    println!("═══════════════════════════════════");
    println!("🔍 RETRIEVE_SECURE CALLED");
    println!("═══════════════════════════════════");
    println!("   Service: {}", SERVICE_NAME);
    println!("   Account: {}", USERNAME);
    println!("   Key parameter: {}", key);
    
    std::thread::sleep(std::time::Duration::from_millis(50));
    
    let entry = &*PERSISTENT_ENTRY;
    
    println!("📡 Calling get_password()...");
    match entry.get_password() {
        Ok(password) => {
            println!("✅ TOKEN FOUND!");
            println!("   Length: {}", password.len());
            println!("   Preview: {}...", &password[..20.min(password.len())]);
            Ok(Some(password))
        }
        Err(keyring::Error::NoEntry) => {
            println!("⚠️  NO ENTRY FOUND");
            println!("   Searched for:");
            println!("     Service: {}", SERVICE_NAME);
            println!("     Account: {}", USERNAME);
            println!("   This is normal on first launch or after logout");
            Ok(None)
        }
        Err(e) => {
            eprintln!("❌ RETRIEVE ERROR: {}", e);
            eprintln!("   Error type: {:?}", e);
            eprintln!("   This might indicate a keychain permission issue");
            Err(format!("Retrieve failed: {}", e))
        }
    }
}

#[tauri::command]
pub async fn remove_secure(key: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();
    
    println!("═══════════════════════════════════");
    println!("🗑️ REMOVE_SECURE CALLED");
    println!("═══════════════════════════════════");
    println!("   Service: {}", SERVICE_NAME);
    println!("   Account: {}", USERNAME);
    println!("   Key parameter: {}", key);
    
    let entry = &*PERSISTENT_ENTRY;
    
    match entry.delete_credential() {
        Ok(_) => {
            println!("✅ Entry deleted successfully");
            Ok(())
        }
        Err(keyring::Error::NoEntry) => {
            println!("⚠️  No entry to delete (already removed)");
            Ok(())
        }
        Err(e) => {
            eprintln!("❌ Delete failed: {}", e);
            Err(format!("Delete failed: {}", e))
        }
    }
}