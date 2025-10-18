// src-tauri/src/encryption.rs - AES-256 encryption for session tokens
use aes_gcm::{
  aead::{Aead, KeyInit, OsRng},
  Aes256Gcm, Nonce,
};
use base64::{Engine as _, engine::general_purpose};
use aes_gcm::aead::rand_core::RngCore;

const NONCE_SIZE: usize = 12; // GCM standard nonce size

/// Generate a new 256-bit encryption key
#[tauri::command]
pub fn generate_encryption_key() -> Result<String, String> {
  println!("🔑 Generating new 256-bit encryption key...");
  
  let mut key_bytes = [0u8; 32]; // 256 bits = 32 bytes
  OsRng.fill_bytes(&mut key_bytes);
  
  let key_base64 = general_purpose::STANDARD.encode(key_bytes);
  
  println!("✅ Encryption key generated");
  println!("   Length: 32 bytes (256 bits)");
  println!("   Base64 length: {} chars", key_base64.len());
  
  Ok(key_base64)
}

/// Encrypt data using AES-256-GCM
#[tauri::command]
pub fn encrypt_data(data: String, key: String) -> Result<String, String> {
  println!("🔒 Encrypting data...");
  println!("   Data length: {} chars", data.len());
  
  // Decode base64 key
  let key_bytes = general_purpose::STANDARD
      .decode(&key)
      .map_err(|e| format!("Invalid key format: {}", e))?;
  
  if key_bytes.len() != 32 {
      return Err(format!("Invalid key length: {} (expected 32)", key_bytes.len()));
  }
  
  // Create cipher
  let cipher = Aes256Gcm::new_from_slice(&key_bytes)
      .map_err(|e| format!("Failed to create cipher: {}", e))?;
  
  // Generate random nonce (12 bytes for GCM)
  let mut nonce_bytes = [0u8; NONCE_SIZE];
  OsRng.fill_bytes(&mut nonce_bytes);
  let nonce = Nonce::from_slice(&nonce_bytes);
  
  // Encrypt
  let ciphertext = cipher
      .encrypt(nonce, data.as_bytes())
      .map_err(|e| format!("Encryption failed: {}", e))?;
  
  // Combine nonce + ciphertext and encode as base64
  let mut combined = nonce_bytes.to_vec();
  combined.extend_from_slice(&ciphertext);
  
  let encrypted_base64 = general_purpose::STANDARD.encode(combined);
  
  println!("✅ Data encrypted");
  println!("   Ciphertext length: {} bytes", ciphertext.len());
  println!("   Base64 output: {} chars", encrypted_base64.len());
  
  Ok(encrypted_base64)
}

/// Decrypt data using AES-256-GCM
#[tauri::command]
pub fn decrypt_data(encrypted_data: String, key: String) -> Result<String, String> {
  println!("🔓 Decrypting data...");
  println!("   Encrypted data length: {} chars", encrypted_data.len());
  
  // Decode base64 key
  let key_bytes = general_purpose::STANDARD
      .decode(&key)
      .map_err(|e| format!("Invalid key format: {}", e))?;
  
  if key_bytes.len() != 32 {
      return Err(format!("Invalid key length: {} (expected 32)", key_bytes.len()));
  }
  
  // Decode base64 encrypted data
  let combined = general_purpose::STANDARD
      .decode(&encrypted_data)
      .map_err(|e| format!("Invalid encrypted data format: {}", e))?;
  
  // Split nonce and ciphertext
  if combined.len() < NONCE_SIZE {
      return Err("Encrypted data too short".to_string());
  }
  
  let (nonce_bytes, ciphertext) = combined.split_at(NONCE_SIZE);
  let nonce = Nonce::from_slice(nonce_bytes);
  
  // Create cipher
  let cipher = Aes256Gcm::new_from_slice(&key_bytes)
      .map_err(|e| format!("Failed to create cipher: {}", e))?;
  
  // Decrypt
  let plaintext = cipher
      .decrypt(nonce, ciphertext)
      .map_err(|e| format!("Decryption failed: {}", e))?;
  
  let decrypted_string = String::from_utf8(plaintext)
      .map_err(|e| format!("Invalid UTF-8 in decrypted data: {}", e))?;
  
  println!("✅ Data decrypted");
  println!("   Plaintext length: {} chars", decrypted_string.len());
  
  Ok(decrypted_string)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_encryption_roundtrip() {
      let key = generate_encryption_key().unwrap();
      let original = "my-secret-session-token-12345".to_string();
      
      let encrypted = encrypt_data(original.clone(), key.clone()).unwrap();
      let decrypted = decrypt_data(encrypted, key).unwrap();
      
      assert_eq!(original, decrypted);
  }

  #[test]
  fn test_different_keys_fail() {
      let key1 = generate_encryption_key().unwrap();
      let key2 = generate_encryption_key().unwrap();
      let data = "secret".to_string();
      
      let encrypted = encrypt_data(data, key1).unwrap();
      let result = decrypt_data(encrypted, key2);
      
      assert!(result.is_err());
  }
}