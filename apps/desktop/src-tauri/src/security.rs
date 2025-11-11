// src-tauri/src/security.rs
// DEPRECATED: This file is kept for reference but the generic secure storage commands
// have been replaced with scoped, purpose-specific commands:
// - session.rs: store_session_token, get_session_token, remove_session_token
// - dealership_auth.rs: store_dealership_auth_token, get_dealership_auth_token, remove_dealership_auth_token
// - license.rs: store_license, get_stored_license, remove_stored_license
//
// SECURITY: Generic secure storage commands are no longer exposed to prevent
// JavaScript from accessing arbitrary secrets via a "secret vending machine" API.

// This file is intentionally empty - all secure storage functionality has been moved
// to purpose-specific modules for better security.
