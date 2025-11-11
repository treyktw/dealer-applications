// src/components/layout/sidebar.tsx - Type-safe version
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  FileText,
  Settings,
  Building2,
  CreditCard,
  HelpCircle,
  ChevronLeft,
  Sparkles,
  UserCircle,
} from "lucide-react";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { getCachedAppMode } from "@/lib/mode-detection";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string | null;
  requiresRole?: string[];
}

const NavItem = ({
  item,
  isOpen,
  isActive,
}: {
  item: NavItem;
  isOpen: boolean;
  isActive: (path: string) => boolean;
}) => {
  const Icon = item.icon;
  const active = isActive(item.path);

  const content = (
    <Link
      to={item.path}
      className={cn(
        "flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200",
        "hover:bg-accent/50",
        active
          ? "bg-accent text-black shadow-sm"
          : "text-muted-foreground hover:text-black"
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {isOpen && (
        <>
          <span className="flex-1 font-medium">{item.name}</span>
          {item.badge && (
            <Badge
              variant={active ? "secondary" : "default"}
              className="ml-auto text-xs px-2 py-0"
            >
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );

  if (!isOpen) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {item.name}
            {item.badge && (
              <Badge variant="secondary" className="text-xs">
                {item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return content;
};

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user } = useUnifiedAuth();
  const appMode = getCachedAppMode();
  const isStandalone = appMode === "standalone";

  // User is guaranteed to exist here because AuthGuard protects this component
  if (!user) {
    return null;
  }

  // Normalize role to lowercase for comparison
  const userRole = user.role?.toLowerCase() || "";

  const isActive = (path: string) => {
    // Handle root path specially
    if (path === "/" || path === "/standalone") {
      if (isStandalone) {
        return location.pathname === "/standalone" || location.pathname === "/standalone/";
      } else {
        return location.pathname === "/";
      }
    }
    return location.pathname.startsWith(path);
  };

  // Build navigation groups based on mode
  const navigationGroups = [
    ...(isStandalone
      ? [
          {
            label: "Main",
            items: [
              {
                name: "Dashboard",
                path: "/standalone",
                icon: Home,
                badge: null,
              },
              {
                name: "Deals",
                path: "/standalone/deals",
                icon: FileText,
                badge: null,
              },
            ],
          },
        {
          label: "Management",
          items: [
            {
              name: "Subscription",
              path: "/standalone/subscription",
              icon: CreditCard,
              badge: null,
            },
          ],
        },
        ]
      : [
          {
            label: "Main",
            items: [
              {
                name: "Dashboard",
                path: "/",
                icon: Home,
                badge: null,
              },
              {
                name: "Deals",
                path: "/deals",
                icon: FileText,
                badge: null,
              },
            ],
          },
          {
            label: "Management",
            items: [
              {
                name: "Dealership",
                path: "/dealership",
                icon: Building2,
                badge: null,
                requiresRole: ["admin"],
              },
              {
                name: "Subscription",
                path: "/subscription",
                icon: CreditCard,
                badge: null,
              },
            ].filter(Boolean) as NavItem[],
          },
        ]),
    {
      label: "Personal",
      items: [
        {
          name: "Profile",
          path: isStandalone ? "/standalone/profile" : "/profile",
          icon: UserCircle,
          badge: null,
        },
        {
          name: "Settings",
          path: isStandalone ? "/standalone/settings" : "/settings",
          icon: Settings,
          badge: null,
        },
        {
          name: "Help & Support",
          path: "/help",
          icon: HelpCircle,
          badge: null,
        },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-full bg-card border-r border-border z-40",
        "flex flex-col transition-all duration-300 ease-in-out",
        isOpen ? "w-64" : "w-16"
      )}
    >
      {/* Logo Section */}
      <div className="h-16 border-b border-border px-4 flex items-center justify-between shrink-0">
          <div className={cn("flex items-center gap-2", isOpen ? "flex" : "hidden")}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm">DealerPro</span>
              <span className="text-xs text-muted-foreground">v2.0</span>
            </div>
          </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "h-8 w-8 shrink-0 transition-transform",
            !isOpen && "rotate-180"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <div className="space-y-6">
          {navigationGroups.map((group) => (
            <div key={group.label}>
              {isOpen && (
                <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              <div className="space-y-2">
                {group.items.map((item) => {
                  // Check if user has permission (case-insensitive)
                  if (
                    "requiresRole" in item &&
                    item.requiresRole &&
                    !item.requiresRole.includes(userRole)
                  ) {
                    return null;
                  }
                  return (
                    <NavItem
                      key={item.path}
                      item={item}
                      isOpen={isOpen}
                      isActive={isActive}
                    />
                  );
                })}
              </div>
              {navigationGroups.indexOf(group) <
                navigationGroups.length - 1 && <Separator className="my-4" />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}
