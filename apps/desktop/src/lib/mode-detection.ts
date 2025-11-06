/**
 * Mode Detection System
 * Determines if app is running in standalone or dealership mode
 */

import { invoke } from '@tauri-apps/api/core';

export type AppMode = 'standalone' | 'dealership';

let cachedMode: AppMode | null = null;

/**
 * Detect current app mode
 *
 * Standalone mode:
 * - Running as Tauri desktop app
 * - Using standalone auth (email/password)
 * - Data stored locally in IndexedDB
 * - PDFs generated via Convex and stored locally
 *
 * Dealership mode:
 * - Running as web app OR desktop with dealership auth
 * - Using Clerk authentication
 * - Data stored in Convex
 * - Documents stored in S3
 */
export async function detectAppMode(): Promise<AppMode> {
  // Return cached value if available
  if (cachedMode) {
    return cachedMode;
  }

  // Check if running in Tauri
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  if (!isTauri) {
    // Running in browser - always dealership mode
    cachedMode = 'dealership';
    return cachedMode;
  }

  // Running in Tauri - check for standalone license
  try {
    const license = await invoke<string>('get_stored_license');
    if (license) {
      // Has license - check if it's configured for standalone
      const standaloneUser = localStorage.getItem('standalone_user_id');
      if (standaloneUser) {
        cachedMode = 'standalone';
        return cachedMode;
      }
    }
  } catch (error) {
    // No license found
  }

  // Check for Clerk auth
  const clerkAuth = localStorage.getItem('clerk-db-jwt');
  if (clerkAuth) {
    cachedMode = 'dealership';
    return cachedMode;
  }

  // Default to dealership mode if unsure
  cachedMode = 'dealership';
  return cachedMode;
}

/**
 * Set app mode manually
 */
export function setAppMode(mode: AppMode): void {
  cachedMode = mode;
  localStorage.setItem('app_mode', mode);
  console.log(`✅ App mode set to: ${mode}`);
}

/**
 * Get cached app mode
 */
export function getCachedAppMode(): AppMode | null {
  if (!cachedMode) {
    const stored = localStorage.getItem('app_mode');
    if (stored === 'standalone' || stored === 'dealership') {
      cachedMode = stored;
    }
  }
  return cachedMode;
}

/**
 * Clear mode cache (force re-detection)
 */
export function clearModeCache(): void {
  cachedMode = null;
  localStorage.removeItem('app_mode');
}

/**
 * Check if running in standalone mode
 */
export async function isStandaloneMode(): Promise<boolean> {
  const mode = await detectAppMode();
  return mode === 'standalone';
}

/**
 * Check if running in dealership mode
 */
export async function isDealershipMode(): Promise<boolean> {
  const mode = await detectAppMode();
  return mode === 'dealership';
}

/**
 * Switch between modes (requires re-authentication)
 */
export async function switchMode(newMode: AppMode): Promise<void> {
  // Clear all auth data
  localStorage.clear();

  // Set new mode
  setAppMode(newMode);

  // Reload app
  window.location.reload();
}

/**
 * Get mode-specific configuration
 */
export interface ModeConfig {
  mode: AppMode;
  authType: 'standalone' | 'clerk';
  dataStorage: 'local' | 'convex';
  documentStorage: 'local' | 's3';
}

export async function getModeConfig(): Promise<ModeConfig> {
  const mode = await detectAppMode();

  if (mode === 'standalone') {
    return {
      mode: 'standalone',
      authType: 'standalone',
      dataStorage: 'local',
      documentStorage: 'local',
    };
  } else {
    return {
      mode: 'dealership',
      authType: 'clerk',
      dataStorage: 'convex',
      documentStorage: 's3',
    };
  }
}
