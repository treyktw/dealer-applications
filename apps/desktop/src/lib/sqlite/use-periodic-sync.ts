/**
 * Periodic Sync Hook
 * Automatically syncs data every N minutes
 */

import { useEffect, useRef } from "react";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { performSync } from "./sync-service";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function usePeriodicSync() {
  const auth = useUnifiedAuth();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    // Only sync if user is authenticated
    if (!auth.user?.id) {
      return;
    }

    const userId = auth.user.id;

    // Perform initial sync after a short delay
    const initialTimeout = setTimeout(() => {
      if (!isSyncingRef.current) {
        isSyncingRef.current = true;
        performSync(userId)
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
        performSync(userId)
          .then((result) => {
            if (result.success) {
              console.log("✅ [PERIODIC-SYNC] Sync completed:", result);
            } else {
              console.error("❌ [PERIODIC-SYNC] Sync failed:", result.errors);
            }
          })
          .catch((error) => {
            console.error("❌ [PERIODIC-SYNC] Sync error:", error);
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

