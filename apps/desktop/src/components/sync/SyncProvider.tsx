/**
 * Sync Provider Component
 * Wraps the app to enable periodic sync
 */

import { usePeriodicSync } from "@/lib/sqlite/use-periodic-sync";
import type { ReactNode } from "react";

export function SyncProvider({ children }: { children: ReactNode }) {
  // Enable periodic sync
  usePeriodicSync();

  return <>{children}</>;
}

