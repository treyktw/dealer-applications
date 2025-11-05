"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function toTitle(value: string): string {
  return value
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const parts = pathname?.split("/").filter(Boolean) || [];
  const last = parts[parts.length - 1];
  const isRoot = parts[parts.length - 1] === "settings";
  const currentLabel = isRoot ? "Settings" : toTitle(last || "");

  return (
    <div className="flex-1 min-w-0">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between mb-4">
        <nav className="text-sm text-muted-foreground">
          <Link href="/settings" className="hover:underline">
            Settings
          </Link>
          {!isRoot && (
            <>
              <span className="mx-2">/</span>
              <span className="text-foreground">{currentLabel}</span>
            </>
          )}
        </nav>
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}


