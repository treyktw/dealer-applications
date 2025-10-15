// src/components/layout/sidebar-redesign.tsx
import { Link, useLocation } from "@tanstack/react-router";
import { useUser } from "@clerk/clerk-react";
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
  Users,
  Building2,
  CreditCard,
  Bell,
  HelpCircle,
  ChevronLeft,
  Sparkles,
  BarChart3,
  UserCircle,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const NavItem = ({ item, isOpen, isActive }: { item: any; isOpen: boolean; isActive: (path: string) => boolean }) => {
  const Icon = item.icon;
  const active = isActive(item.path);

  const content = (
    <Link
      to={item.path}
      className={cn(
        "flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200",
        "hover:bg-accent/50",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
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
  const { user } = useUser();
  const userRole = (user?.publicMetadata?.role as string) || "user";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navigationGroups = [
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
        {
          name: "Analytics",
          path: "/analytics",
          icon: BarChart3,
          badge: "Pro",
          requiresRole: ["admin", "manager"],
        },
      ],
    },
    {
      label: "Management",
      items: [
        {
          name: "Team",
          path: "/teams",
          icon: Users,
          badge: null,
          requiresRole: ["admin", "manager"],
        },
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
      ],
    },
    {
      label: "Personal",
      items: [
        {
          name: "Profile",
          path: "/profile",
          icon: UserCircle,
          badge: null,
        },
        {
          name: "Notifications",
          path: "/notifications",
          icon: Bell,
          badge: "3",
        },
        {
          name: "Settings",
          path: "/settings",
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
        {isOpen ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-sm">DealerPro</span>
              <span className="text-xs text-muted-foreground">v2.0</span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-sm mx-auto sm:hidden">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
        )}
        
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
                  // Check if user has permission
                  if ('requiresRole' in item && item.requiresRole && !item.requiresRole.includes(userRole)) {
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
              {navigationGroups.indexOf(group) < navigationGroups.length - 1 && (
                <Separator className="my-4" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* User Section */}
      {isOpen && (
        <div className="border-t border-border p-4 shrink-0">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}