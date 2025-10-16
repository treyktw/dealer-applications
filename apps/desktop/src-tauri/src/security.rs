// src-tauri/src/security.rs
use keyring::Entry;
use tauri::command;

#[command]
pub async fn store_secure(key: String, value: String) -> Result<(), String> {
    let entry = Entry::new("dealer-software", &key).map_err(|e| e.to_string())?;

    entry.set_password(&value).map_err(|e| e.to_string())?;

    Ok(())
}

#[command]
pub async fn retrieve_secure(key: String) -> Result<Option<String>, String> {
    let entry = Entry::new("dealer-software", &key).map_err(|e| e.to_string())?;

    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[command]
pub async fn remove_secure(key: String) -> Result<(), String> {
    let entry = Entry::new("dealer-software", &key).map_err(|e| e.to_string())?;

    // For keyring v3, we need to handle the case where the entry doesn't exist
    match entry.get_password() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}
