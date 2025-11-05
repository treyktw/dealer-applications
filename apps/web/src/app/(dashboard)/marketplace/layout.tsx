// apps/web/src/app/(dashboard)/marketplace/layout.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

function toTitle(value: string): string {
  return value
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

// Map route segments to display names
const routeLabels: Record<string, string> = {
  marketplace: "Marketplace",
  "document-packs": "Document Packs",
  success: "Success",
};

export default function MarketplaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const parts = pathname?.split("/").filter(Boolean) || [];
  
  // Find marketplace index
  const marketplaceIndex = parts.indexOf("marketplace");
  const marketplaceParts = marketplaceIndex >= 0 
    ? parts.slice(marketplaceIndex)
    : [];
  
  const isRoot = marketplaceParts.length === 1 || marketplaceParts.length === 0;

  return (
    <div className="flex-1 min-w-0 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
        <Link 
          href="/marketplace" 
          className="hover:text-foreground transition-colors"
        >
          Marketplace
        </Link>
        {!isRoot && marketplaceParts.length > 1 && (
          <div>
            {marketplaceParts.slice(1).map((part, index) => {
              const isLast = index === marketplaceParts.length - 2;
              const href = `/${marketplaceParts.slice(0, index + 2).join("/")}`;
              
              // Handle dynamic routes like [id] - these are typically long alphanumeric strings
              let label = routeLabels[part] || toTitle(part);
              
              // If it looks like a dynamic ID (long alphanumeric), use a generic label
              if (part.match(/^[a-z0-9]{20,}$/i)) {
                label = "Details";
              }
              
              return (
                <span key={part} className="flex items-center space-x-2">
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  {isLast ? (
                    <span className="text-foreground font-medium">{label}</span>
                  ) : (
                    <Link
                      href={href}
                      className="hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  )}
                </span>
              );
            })}
          </div>
        )}
      </nav>

      {/* Page content */}
      {children}
    </div>
  );
}

