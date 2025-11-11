// src-tauri/src/user_id.rs
// Helper functions for getting current user ID

use log::warn;

/// Get current user ID from localStorage
/// Returns None if user is not logged in
pub fn get_current_user_id() -> Option<String> {
    // In Tauri, we can't directly access localStorage from Rust
    // The user_id must be passed from TypeScript
    // This function is a placeholder - actual implementation will be via command parameter
    None
}

/// Validate that a user_id is provided
/// Returns error if user_id is None or empty
pub fn require_user_id(user_id: Option<String>) -> Result<String, String> {
    match user_id {
        Some(id) if !id.is_empty() => Ok(id),
        _ => Err("User ID is required. Please log in.".to_string()),
    }
}

