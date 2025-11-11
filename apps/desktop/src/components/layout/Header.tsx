// src/components/layout/header-redesign.tsx
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Command, LogOut, User, Settings, CreditCard, HelpCircle, Sparkles } from "lucide-react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ThemeToggle } from "../theme/theme-toggle";
import { useSubscription } from "@/lib/subscription/SubscriptionProvider";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { cn } from "@/lib/utils";
import { Separator } from "../ui/separator";
import { getCachedAppMode } from "@/lib/mode-detection";

interface HeaderProps {
  sidebarOpen: boolean;
}

export function Header({ sidebarOpen }: HeaderProps) {
  const navigate = useNavigate();
  const { subscription } = useSubscription();
  const { user, logout } = useUnifiedAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const appMode = getCachedAppMode();
  const isStandalone = appMode === "standalone";

  // User is guaranteed to exist here because AuthGuard protects this component
  if (!user) {
    return null;
  }

  const userName = user.name || user.email || "User";
  const nameParts = userName.split(" ");
  const firstName = nameParts[0];
  const lastName = nameParts[1] || "";
  const firstInitial = firstName[0] || "U";
  const lastInitial = lastName[0] || "";
  const userInitials = `${firstInitial}${lastInitial}`;
  const userRole = user.role ?? (isStandalone ? "Standalone" : undefined);

  const handleSignOut = async () => {
    console.log("🚪 [HEADER] Sign out button clicked");
    console.log("🔍 [HEADER] Current state:", {
      hasLogoutFunction: !!logout,
      isStandalone,
      userEmail: user?.email,
      userId: user?.id,
    });

    if (logout) {
      console.log("🚪 [HEADER] Calling logout function...");
      try {
        await logout();
        console.log("✅ [HEADER] Logout function completed successfully");
      } catch (error) {
        console.error("❌ [HEADER] Logout function failed:", error);
      }
    } else {
      console.warn("⚠️ [HEADER] No logout function available");
    }

    console.log("🧭 [HEADER] Navigating to login page...");
    navigate({ to: isStandalone ? "/standalone-login" : "/login" });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: "/search", search: { q: searchQuery } });
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 right-0 z-30",
        "bg-background/80 backdrop-blur-xl",
        "border-b border-border/40",
        "transition-all duration-300 ease-in-out"
      )}
      style={{
        height: "64px",
        left: sidebarOpen ? "256px" : "64px",
        width: sidebarOpen ? "calc(100% - 256px)" : "calc(100% - 64px)",
      }}
    >
      <div className="h-full px-6 flex items-center justify-between">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search deals, clients, vehicles... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-20 h-10 bg-muted/50 border-transparent focus:bg-background focus:border-border transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <Command className="h-3 w-3" />K
            </kbd>
          </div>
        </form>

        {/* Right Section */}
        <div className="flex items-center gap-2 ml-4">
          {/* Theme Toggle */}
          <ThemeToggle />


          {/* Help */}
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/help" })}>
            <HelpCircle className="h-5 w-5" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-3 pl-2 pr-4 h-10 hover:bg-accent/50"
              >
                <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                  <AvatarImage src={undefined} alt={userName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-medium leading-none">
                    {firstName} {lastName}
                  </span>
                  {userRole && (
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </span>
                  )}
                </div>
                {subscription && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {subscription.plan}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {userName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: isStandalone ? "/standalone/profile" : "/profile" })}>
                <User className="mr-2 h-4 w-4" />
                Profile & Account
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: isStandalone ? "/standalone/subscription" : "/subscription" })}>
                <CreditCard className="mr-2 h-4 w-4" />
                Subscription
                {subscription && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    {subscription.plan}
                  </Badge>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: isStandalone ? "/standalone/settings" : "/settings" })}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/help" })}>
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/whats-new" })}>
                <Sparkles className="mr-2 h-4 w-4" />
                What's New
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}