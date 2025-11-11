// src/lib/storage.ts - SECURITY: Uses specific secure storage commands
// Prevents JS from accessing arbitrary secrets via generic commands
import { invoke } from '@tauri-apps/api/core';

// SECURITY: Use specific dealership auth token commands instead of generic secure storage
export async function storeToken(token: string): Promise<void> {
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
  
  if (isTauri) {
    try {
      await invoke('store_dealership_auth_token', { token });
    } catch (error) {
      console.error('Failed to store dealership auth token:', error);
      throw error;
    }
  } else {
    // Browser dev mode: Use localStorage (NOT SECURE - dev only)
    console.warn('⚠️ [STORAGE] Browser dev mode - using localStorage (NOT SECURE, dev only)');
    localStorage.setItem('dealer_auth_token', token);
  }
}

export async function getStoredToken(): Promise<string | null> {
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
  
  if (isTauri) {
    try {
      const token = await invoke<string | null>('get_dealership_auth_token');
      return token;
    } catch (error) {
      console.error('Failed to retrieve dealership auth token:', error);
      return null;
    }
  } else {
    // Browser dev mode: Use localStorage (NOT SECURE - dev only)
    return localStorage.getItem('dealer_auth_token');
  }
}

export async function removeToken(): Promise<void> {
  const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
  
  if (isTauri) {
    try {
      await invoke('remove_dealership_auth_token');
    } catch (error) {
      console.error('Failed to remove dealership auth token:', error);
      throw error;
    }
  } else {
    // Browser dev mode: Use localStorage (NOT SECURE - dev only)
    localStorage.removeItem('dealer_auth_token');
  }
}