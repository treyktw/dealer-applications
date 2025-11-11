// src-tauri/src/license.rs
//
// License management and machine identification for desktop app

use keyring::Entry;
use log::{error, info};
use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;

const SERVICE_NAME: &str = "net.universalautobrokers.dealersoftware";
const LICENSE_KEY_NAME: &str = "license_key";

/// Get unique machine ID
/// Uses platform-specific methods to generate a stable machine identifier
#[command]
pub fn get_machine_id() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        // Windows: Use machine GUID
        match get_windows_machine_guid() {
            Ok(guid) => Ok(guid),
            Err(e) => {
                error!("Failed to get Windows machine GUID: {}", e);
                // Fallback to hostname + username hash
                Ok(get_fallback_machine_id())
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // macOS: Use hardware UUID
        match get_macos_hardware_uuid() {
            Ok(uuid) => Ok(uuid),
            Err(e) => {
                error!("Failed to get macOS hardware UUID: {}", e);
                Ok(get_fallback_machine_id())
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        // Linux: Use machine-id
        match get_linux_machine_id() {
            Ok(id) => Ok(id),
            Err(e) => {
                error!("Failed to get Linux machine-id: {}", e);
                Ok(get_fallback_machine_id())
            }
        }
    }
}

/// Get platform name
#[command]
pub fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

/// Get app version
#[command]
pub fn get_app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Get hostname
#[command]
pub fn get_hostname() -> Result<String, String> {
    match hostname::get() {
        Ok(name) => Ok(name.to_string_lossy().to_string()),
        Err(e) => Err(format!("Failed to get hostname: {}", e)),
    }
}

/// Store license key securely
#[command]
pub fn store_license(license_key: String) -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, LICENSE_KEY_NAME)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .set_password(&license_key)
        .map_err(|e| format!("Failed to store license: {}", e))?;

    info!("License key stored securely");
    Ok(())
}

/// Retrieve stored license key
#[command]
pub fn get_stored_license() -> Result<String, String> {
    let entry = Entry::new(SERVICE_NAME, LICENSE_KEY_NAME)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .get_password()
        .map_err(|e| format!("No license found: {}", e))
}

/// Remove stored license key
#[command]
pub fn remove_stored_license() -> Result<(), String> {
    let entry = Entry::new(SERVICE_NAME, LICENSE_KEY_NAME)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .delete_credential()
        .map_err(|e| format!("Failed to remove license: {}", e))?;

    info!("License key removed");
    Ok(())
}

// Platform-specific implementations

#[cfg(target_os = "windows")]
fn get_windows_machine_guid() -> Result<String, String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let key = hklm
        .open_subkey("SOFTWARE\\Microsoft\\Cryptography")
        .map_err(|e| format!("Failed to open registry key: {}", e))?;

    let guid: String = key
        .get_value("MachineGuid")
        .map_err(|e| format!("Failed to get MachineGuid: {}", e))?;

    Ok(guid)
}

#[cfg(target_os = "macos")]
fn get_macos_hardware_uuid() -> Result<String, String> {
    let output = Command::new("ioreg")
        .args(&["-rd1", "-c", "IOPlatformExpertDevice"])
        .output()
        .map_err(|e| format!("Failed to execute ioreg: {}", e))?;

    let output_str = String::from_utf8_lossy(&output.stdout);

    // Parse UUID from output
    for line in output_str.lines() {
        if line.contains("IOPlatformUUID") {
            let parts: Vec<&str> = line.split('"').collect();
            if parts.len() >= 4 {
                return Ok(parts[3].to_string());
            }
        }
    }

    Err("UUID not found in ioreg output".to_string())
}

#[cfg(target_os = "linux")]
fn get_linux_machine_id() -> Result<String, String> {
    // Try /etc/machine-id first
    if let Ok(id) = std::fs::read_to_string("/etc/machine-id") {
        return Ok(id.trim().to_string());
    }

    // Fallback to /var/lib/dbus/machine-id
    if let Ok(id) = std::fs::read_to_string("/var/lib/dbus/machine-id") {
        return Ok(id.trim().to_string());
    }

    Err("Machine ID not found".to_string())
}

/// Fallback machine ID using hostname + username hash
fn get_fallback_machine_id() -> String {
    use sha2::{Digest, Sha256};

    let hostname = hostname::get()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let username = std::env::var("USER")
        .or_else(|_| std::env::var("USERNAME"))
        .unwrap_or_else(|_| "unknown".to_string());

    let combined = format!("{}-{}", hostname, username);

    let mut hasher = Sha256::new();
    hasher.update(combined.as_bytes());
    let result = hasher.finalize();

    format!("{:x}", result)
}

#[derive(Serialize, Deserialize)]
pub struct MachineInfo {
    pub machine_id: String,
    pub platform: String,
    pub hostname: String,
    pub app_version: String,
}

/// Get all machine info at once
#[command]
pub fn get_machine_info() -> Result<MachineInfo, String> {
    Ok(MachineInfo {
        machine_id: get_machine_id()?,
        platform: get_platform(),
        hostname: get_hostname().unwrap_or_else(|_| "Unknown".to_string()),
        app_version: get_app_version(),
    })
}
