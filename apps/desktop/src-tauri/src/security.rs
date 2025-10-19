// src-tauri/src/security.rs - FIXED: Accept dynamic key names
use keyring::Entry;
use std::sync::Mutex;

const SERVICE_NAME: &str = "net.universalautobrokers.dealersoftware";

static KEYRING_LOCK: Mutex<()> = Mutex::new(());

#[tauri::command]
pub async fn store_secure(key: String, value: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    println!("═══════════════════════════════════");
    println!("🔐 STORE_SECURE CALLED");
    println!("═══════════════════════════════════");
    println!("   Service: {}", SERVICE_NAME);
    println!("   Account: {}", key); // ✅ Use the key parameter!
    println!("   Value length: {}", value.len());
    println!("   Value preview: {}...", &value[..20.min(value.len())]);

    // ✅ Create entry with dynamic key
    let entry =
        Entry::new(SERVICE_NAME, &key).map_err(|e| format!("Failed to create entry: {}", e))?;

    // Delete existing entry (ignore errors)
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

            let matches = stored == value;
            println!("   Values match: {}", matches);

            if !matches {
                eprintln!("❌ VALUE MISMATCH!");
                return Err("Verification failed: value mismatch".to_string());
            }

            println!("✅ Token stored and verified successfully");
            Ok(())
        }
        Err(e) => {
            eprintln!("❌ VERIFICATION FAILED: {}", e);
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
    println!("   Account: {}", key); // ✅ Use the key parameter!

    std::thread::sleep(std::time::Duration::from_millis(50));

    // ✅ Create entry with dynamic key
    let entry =
        Entry::new(SERVICE_NAME, &key).map_err(|e| format!("Failed to create entry: {}", e))?;

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
            println!("     Account: {}", key);
            println!("   This is normal on first launch or after logout");
            Ok(None)
        }
        Err(e) => {
            eprintln!("❌ RETRIEVE ERROR: {}", e);
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
    println!("   Account: {}", key); // ✅ Use the key parameter!

    // ✅ Create entry with dynamic key
    let entry =
        Entry::new(SERVICE_NAME, &key).map_err(|e| format!("Failed to create entry: {}", e))?;

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
