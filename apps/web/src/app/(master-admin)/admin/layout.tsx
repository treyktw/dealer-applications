// apps/web/src/app/(admin)/admin/layout.tsx
"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function MasterAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useCurrentUser();

  // Check if user is master admin (ADMIN role + no dealershipId OR MASTERADMIN role)
  const isMasterAdmin = user?.role === "MASTERADMIN" || (user?.role === "ADMIN" && !user.dealershipId);

  // If not authenticated or not master admin, show error
  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-zinc-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isMasterAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-950">
        <Card className="max-w-md bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-zinc-100 mb-2">
              Access Denied
            </h2>
            <p className="text-zinc-400 mb-4">
              Master admin access required. This area is restricted to platform administrators only.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md text-sm font-medium transition-colors"
              >
                Back to Dashboard
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Determine active nav item
  const getActiveNavClass = (path: string) => {
    return pathname?.startsWith(path)
      ? "text-blue-400 border-blue-500"
      : "text-zinc-400 border-transparent hover:text-blue-400 hover:border-blue-500";
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Master Admin Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-2xl font-bold text-zinc-100">
                  Master Admin Portal
                </h1>
                <p className="text-zinc-400 text-sm">
                  Platform Management & Analytics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <div className="text-right">
                  <p className="text-sm text-zinc-300 font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-zinc-500">Master Admin</p>
                </div>
              )}
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md text-sm font-medium transition-colors border border-zinc-700"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/admin"
              className={`px-3 py-4 text-sm font-medium border-b-2 transition-colors ${getActiveNavClass("/admin")} ${
                pathname === "/admin" ? "border-blue-500" : ""
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/admin/dealerships"
              className={`px-3 py-4 text-sm font-medium border-b-2 transition-colors ${getActiveNavClass("/admin/dealerships")}`}
            >
              Dealerships
            </Link>
            <Link
              href="/admin/document-packs"
              className={`px-3 py-4 text-sm font-medium border-b-2 transition-colors ${getActiveNavClass("/admin/document-packs")}`}
            >
              Document Packs
            </Link>
            <Link
              href="/admin/communications/email"
              className={`px-3 py-4 text-sm font-medium border-b-2 transition-colors ${getActiveNavClass("/admin/communications")}`}
            >
              Communications
            </Link>
            <Link
              href="/admin/analytics"
              className={`px-3 py-4 text-sm font-medium border-b-2 transition-colors ${getActiveNavClass("/admin/analytics")}`}
            >
              Analytics
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
