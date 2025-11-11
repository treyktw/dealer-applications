/**
 * Sync Status Management
 * Tracks sync status for display in UI
 */

import { invoke } from "@tauri-apps/api/core";

export type SyncStatus = "synced" | "not_synced" | "syncing" | "error";

/**
 * Get last sync timestamp
 */
export async function getLastSyncAt(): Promise<number> {
  try {
    const lastSync = await invoke<string | null>("db_get_setting", {
      key: "last_sync_at",
    });
    return lastSync ? parseInt(lastSync, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Get sync status
 * Returns "synced" if last sync was within 10 minutes, otherwise "not_synced"
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  try {
    const lastSyncAt = await getLastSyncAt();
    if (lastSyncAt === 0) {
      return "not_synced";
    }

    const now = Date.now();
    const timeSinceLastSync = now - lastSyncAt;
    const SYNC_FRESHNESS_MS = 10 * 60 * 1000; // 10 minutes

    if (timeSinceLastSync < SYNC_FRESHNESS_MS) {
      return "synced";
    } else {
      return "not_synced";
    }
  } catch {
    return "error";
  }
}

/**
 * Format last sync time for display
 */
export function formatLastSyncTime(timestamp: number): string {
  if (timestamp === 0) {
    return "Never";
  }

  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) {
    return "Just now";
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  } else {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  }
}

