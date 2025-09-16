// src/components/layout/Sidebar.tsx
import { Link, useLocation } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
import {
  Home,
  FileText,
  Settings,
  Plus,
  Clock,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@/lib/convex";
import { api } from "@dealer/convex";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user } = useUser();

  // Fetch recent deals
  const { data: deals } = useQuery({
    queryKey: ["recent-deals", user?.id],
    queryFn: async () => {
      if (!user?.publicMetadata?.dealershipId) return [];
      const allDeals = await convexQuery(api.api.deals.getDeals, {
        dealershipId: user.publicMetadata.dealershipId as string,
      });
      // Return only the 5 most recent deals
      return (Array.isArray(allDeals) ? allDeals : allDeals?.deals || [])
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5);
    },
    enabled: !!user?.publicMetadata?.dealershipId && isOpen,
    staleTime: 30000,
  });

  const isActive = (path: string) => location.pathname === path;

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay for mobile */}
      <div
        className="fixed inset-0 bg-gradient-to-br from-teal-100 via-zinc-500 to-zinc-600 dark:from-zinc-60 dark:via-zinc-70 dark:to-zinc-80 z-30 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-[280px] bg-background border-r border-border z-40 flex flex-col bg-gradient-to-br from-slate-100 via-zinc-200 to-zinc-100 dark:from-zinc-800 dark:via-zinc-700 dark:to-zinc-800">
        {/* Logo/Brand */}
        <div className="h-[60px] border-b border-border px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <span className="font-semibold text-lg">DealerPro</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 hover:bg-accent rounded-md transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* New Deal Button */}
        <div className="px-4 py-4">
          <Button className="w-full" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Deal
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Main Links */}
          <div className="space-y-1">
            <Link
              to="/"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive("/")
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/deals"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive("/deals")
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              <FileText className="h-4 w-4" />
              <span>All Deals</span>
            </Link>

            <Link
              to="/settings"
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive("/settings")
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </div>

          {/* Recent Deals Section */}
          <div className="mt-8">
            <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Recent Deals
            </h3>
            <div className="space-y-1">
              {!deals || deals.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No recent deals
                </p>
              ) : (
                deals.map((deal: any) => (
                  <Link
                    key={deal._id}
                    to={`/deals/$dealsId/documents`}
                    params={{ dealsId: deal._id }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors group"
                  >
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {deal.clientName || `Deal #${deal._id.slice(-6)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(deal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
