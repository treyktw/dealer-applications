/**
 * Periodic Sync Hook
 * Automatically syncs data every N minutes
 */

import { useEffect, useRef } from "react";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { performSync } from "./sync-service";

const SYNC_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes - reduced frequency to prevent memory issues
const SYNC_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes - max time for a sync operation

export function usePeriodicSync() {
  const auth = useUnifiedAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);
  const syncEnabledRef = useRef(true); // Sync enabled

  useEffect(() => {
    // Check if sync is disabled
    if (!syncEnabledRef.current) {
      console.log("⚠️ [PERIODIC-SYNC] Sync is disabled");
      return;
    }
    
    // Check if we're in Tauri environment - don't sync in browser dev mode
    if (typeof window !== "undefined" && !("__TAURI__" in window)) {
      console.log("⚠️ [PERIODIC-SYNC] Not in Tauri environment, skipping sync");
      return;
    }
    
    // Only sync if user is authenticated
    if (!auth.user?.id) {
      return;
    }

    const userId = auth.user.id;

    // Perform initial sync after a short delay
    const initialTimeout = setTimeout(() => {
      if (!isSyncingRef.current) {
        isSyncingRef.current = true;
        // Add timeout to prevent hanging syncs
        const syncPromise = performSync(userId);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Sync timeout")), SYNC_TIMEOUT_MS);
        });
        
        Promise.race([syncPromise, timeoutPromise])
          .then((result) => {
            if (result.success) {
              console.log("✅ [PERIODIC-SYNC] Initial sync completed:", result);
            } else {
              console.error("❌ [PERIODIC-SYNC] Initial sync failed:", result.errors);
            }
          })
          .catch((error) => {
            console.error("❌ [PERIODIC-SYNC] Initial sync error:", error);
          })
          .finally(() => {
            isSyncingRef.current = false;
          });
      }
    }, 30000); // Wait 30 seconds after mount

    // Set up periodic sync
    intervalRef.current = setInterval(() => {
      if (!isSyncingRef.current) {
        isSyncingRef.current = true;
        // Add timeout to prevent hanging syncs
        const syncPromise = performSync(userId);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Sync timeout")), SYNC_TIMEOUT_MS);
        });
        
        Promise.race([syncPromise, timeoutPromise])
          .then((result) => {
            if (result.success) {
              console.log("✅ [PERIODIC-SYNC] Sync completed:", result);
            } else {
              console.error("❌ [PERIODIC-SYNC] Sync failed:", result.errors);
            }
          })
          .catch((error) => {
            console.error("❌ [PERIODIC-SYNC] Sync error:", error);
            // Don't let sync errors crash the app
          })
          .finally(() => {
            isSyncingRef.current = false;
          });
      }
    }, SYNC_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [auth.user?.id]);
}

