// src-tauri/src/aws_config.rs
// SECURITY: Specific commands for AWS credentials storage only
// Prevents JS from accessing arbitrary secrets via generic commands

use keyring::Entry;
use log::{error, info};

use std::sync::Mutex;

const SERVICE_NAME: &str = "net.universalautobrokers.dealersoftware";
const AWS_ACCESS_KEY_ID_KEY: &str = "aws_access_key_id";
const AWS_SECRET_ACCESS_KEY_KEY: &str = "aws_secret_access_key";
const AWS_REGION_KEY: &str = "aws_region";
const AWS_BUCKET_NAME_KEY: &str = "aws_bucket_name";

static KEYRING_LOCK: Mutex<()> = Mutex::new(());

/// Store AWS access key ID securely in OS keyring
#[tauri::command]
pub async fn store_aws_access_key_id(access_key_id: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔐 [AWS-CONFIG] Storing AWS access key ID in secure storage");

    let entry = Entry::new(SERVICE_NAME, AWS_ACCESS_KEY_ID_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.delete_credential() {
        Ok(_) => info!("   Deleted existing entry"),
        Err(keyring::Error::NoEntry) => info!("   No existing entry to delete"),
        Err(e) => info!("   Delete error (non-critical): {}", e),
    }

    std::thread::sleep(std::time::Duration::from_millis(50));

    match entry.set_password(&access_key_id) {
        Ok(_) => {
            info!("✅ [AWS-CONFIG] AWS access key ID stored successfully");
            Ok(())
        }
        Err(e) => {
            error!("❌ [AWS-CONFIG] Failed to store AWS access key ID: {}", e);
            Err(format!("Failed to store AWS access key ID: {}", e))
        }
    }
}

/// Retrieve AWS access key ID from OS keyring
#[tauri::command]
pub async fn get_aws_access_key_id() -> Result<Option<String>, String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔍 [AWS-CONFIG] Retrieving AWS access key ID from secure storage");

    let entry = Entry::new(SERVICE_NAME, AWS_ACCESS_KEY_ID_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.get_password() {
        Ok(key) => {
            info!("✅ [AWS-CONFIG] AWS access key ID found");
            Ok(Some(key))
        }
        Err(keyring::Error::NoEntry) => {
            info!("⚠️  [AWS-CONFIG] No AWS access key ID found");
            Ok(None)
        }
        Err(e) => {
            error!("❌ [AWS-CONFIG] Failed to retrieve AWS access key ID: {}", e);
            Err(format!("Failed to retrieve AWS access key ID: {}", e))
        }
    }
}

/// Store AWS secret access key securely in OS keyring
#[tauri::command]
pub async fn store_aws_secret_access_key(secret_access_key: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔐 [AWS-CONFIG] Storing AWS secret access key in secure storage");

    let entry = Entry::new(SERVICE_NAME, AWS_SECRET_ACCESS_KEY_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.delete_credential() {
        Ok(_) => info!("   Deleted existing entry"),
        Err(keyring::Error::NoEntry) => info!("   No existing entry to delete"),
        Err(e) => info!("   Delete error (non-critical): {}", e),
    }

    std::thread::sleep(std::time::Duration::from_millis(50));

    match entry.set_password(&secret_access_key) {
        Ok(_) => {
            info!("✅ [AWS-CONFIG] AWS secret access key stored successfully");
            Ok(())
        }
        Err(e) => {
            error!("❌ [AWS-CONFIG] Failed to store AWS secret access key: {}", e);
            Err(format!("Failed to store AWS secret access key: {}", e))
        }
    }
}

/// Retrieve AWS secret access key from OS keyring
#[tauri::command]
pub async fn get_aws_secret_access_key() -> Result<Option<String>, String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔍 [AWS-CONFIG] Retrieving AWS secret access key from secure storage");

    let entry = Entry::new(SERVICE_NAME, AWS_SECRET_ACCESS_KEY_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.get_password() {
        Ok(key) => {
            info!("✅ [AWS-CONFIG] AWS secret access key found");
            Ok(Some(key))
        }
        Err(keyring::Error::NoEntry) => {
            info!("⚠️  [AWS-CONFIG] No AWS secret access key found");
            Ok(None)
        }
        Err(e) => {
            error!("❌ [AWS-CONFIG] Failed to retrieve AWS secret access key: {}", e);
            Err(format!("Failed to retrieve AWS secret access key: {}", e))
        }
    }
}

/// Store AWS region securely in OS keyring
#[tauri::command]
pub async fn store_aws_region(region: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔐 [AWS-CONFIG] Storing AWS region in secure storage");

    let entry = Entry::new(SERVICE_NAME, AWS_REGION_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.delete_credential() {
        Ok(_) => info!("   Deleted existing entry"),
        Err(keyring::Error::NoEntry) => info!("   No existing entry to delete"),
        Err(e) => info!("   Delete error (non-critical): {}", e),
    }

    std::thread::sleep(std::time::Duration::from_millis(50));

    match entry.set_password(&region) {
        Ok(_) => {
            info!("✅ [AWS-CONFIG] AWS region stored successfully");
            Ok(())
        }
        Err(e) => {
            error!("❌ [AWS-CONFIG] Failed to store AWS region: {}", e);
            Err(format!("Failed to store AWS region: {}", e))
        }
    }
}

/// Retrieve AWS region from OS keyring
#[tauri::command]
pub async fn get_aws_region() -> Result<Option<String>, String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔍 [AWS-CONFIG] Retrieving AWS region from secure storage");

    let entry = Entry::new(SERVICE_NAME, AWS_REGION_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.get_password() {
        Ok(region) => {
            info!("✅ [AWS-CONFIG] AWS region found");
            Ok(Some(region))
        }
        Err(keyring::Error::NoEntry) => {
            info!("⚠️  [AWS-CONFIG] No AWS region found");
            Ok(None)
        }
        Err(e) => {
            error!("❌ [AWS-CONFIG] Failed to retrieve AWS region: {}", e);
            Err(format!("Failed to retrieve AWS region: {}", e))
        }
    }
}

/// Store AWS bucket name securely in OS keyring
#[tauri::command]
pub async fn store_aws_bucket_name(bucket_name: String) -> Result<(), String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔐 [AWS-CONFIG] Storing AWS bucket name in secure storage");

    let entry = Entry::new(SERVICE_NAME, AWS_BUCKET_NAME_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.delete_credential() {
        Ok(_) => info!("   Deleted existing entry"),
        Err(keyring::Error::NoEntry) => info!("   No existing entry to delete"),
        Err(e) => info!("   Delete error (non-critical): {}", e),
    }

    std::thread::sleep(std::time::Duration::from_millis(50));

    match entry.set_password(&bucket_name) {
        Ok(_) => {
            info!("✅ [AWS-CONFIG] AWS bucket name stored successfully");
            Ok(())
        }
        Err(e) => {
            error!("❌ [AWS-CONFIG] Failed to store AWS bucket name: {}", e);
            Err(format!("Failed to store AWS bucket name: {}", e))
        }
    }
}

/// Retrieve AWS bucket name from OS keyring
#[tauri::command]
pub async fn get_aws_bucket_name() -> Result<Option<String>, String> {
    let _lock = KEYRING_LOCK.lock().unwrap();

    info!("🔍 [AWS-CONFIG] Retrieving AWS bucket name from secure storage");

    let entry = Entry::new(SERVICE_NAME, AWS_BUCKET_NAME_KEY)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    match entry.get_password() {
        Ok(bucket) => {
            info!("✅ [AWS-CONFIG] AWS bucket name found");
            Ok(Some(bucket))
        }
        Err(keyring::Error::NoEntry) => {
            info!("⚠️  [AWS-CONFIG] No AWS bucket name found");
            Ok(None)
        }
        Err(e) => {
            error!("❌ [AWS-CONFIG] Failed to retrieve AWS bucket name: {}", e);
            Err(format!("Failed to retrieve AWS bucket name: {}", e))
        }
    }
}

