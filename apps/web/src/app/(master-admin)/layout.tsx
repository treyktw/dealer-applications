// apps/web/src/app/(master-admin)/layout.tsx
"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function MasterAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // TODO: Add master admin check query
  // For now, this is a placeholder - you'll need to create a query
  // that checks if the current user is a master admin

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Master Admin Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-zinc-100">Master Admin Portal</h1>
              <p className="text-zinc-400 text-sm">Platform Management</p>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-md text-sm font-medium transition-colors border border-zinc-700"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link
              href="/master-admin/dealerships"
              className="px-3 py-4 text-sm font-medium text-zinc-400 hover:text-blue-400 border-b-2 border-transparent hover:border-blue-500 transition-colors"
            >
              Dealerships
            </Link>
            <Link
              href="/master-admin/document-packs"
              className="px-3 py-4 text-sm font-medium text-zinc-400 hover:text-blue-400 border-b-2 border-transparent hover:border-blue-500 transition-colors"
            >
              Document Packs
            </Link>
            <Link
              href="/master-admin/communications/email"
              className="px-3 py-4 text-sm font-medium text-zinc-400 hover:text-blue-400 border-b-2 border-transparent hover:border-blue-500 transition-colors"
            >
              Communications
            </Link>
            <Link
              href="/master-admin/analytics"
              className="px-3 py-4 text-sm font-medium text-zinc-400 hover:text-blue-400 border-b-2 border-transparent hover:border-blue-500 transition-colors"
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
