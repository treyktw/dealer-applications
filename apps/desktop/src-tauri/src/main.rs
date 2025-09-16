// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod security;  // Add this module

use security::{store_secure, retrieve_secure, remove_secure};
use tauri::{Emitter, Manager};

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // Handle deep-link on app start (if launched via protocol)
            if let Some(url) = std::env::args().nth(1) {
                if url.starts_with("dealer-sign://") {
                    let window = app.get_webview_window("main").unwrap();
                    window.emit("deep-link", url).unwrap();
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            store_secure,
            retrieve_secure,
            remove_secure
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// Handle deep-links when app is already running
#[cfg(target_os = "macos")]
#[tauri::command]
fn handle_open_url(app: tauri::AppHandle, url: String) {
    if url.starts_with("dealer-sign://") {
        if let Some(window) = app.get_webview_window("main") {
            window.emit("deep-link", url).unwrap();
        }
    }
}