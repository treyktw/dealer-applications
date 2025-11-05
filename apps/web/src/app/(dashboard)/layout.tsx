// src/app/(dashboard)/layout.tsx - Modern Sidebar with Quick Actions
"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { 
  Car, 
  Users, 
  Settings, 
  Home, 
  FileText, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus, 
  CarFront, 
  FileSignature,
  ChevronDown,
  Key,
  CreditCard,
  Bell,
  Code,
  Database,
  Globe,
  Shield,
  Building,
  ShoppingCart,
  Package,
  Mail,
} from "lucide-react";
import { DealershipProvider } from "@/providers/dealership-provider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Loader2 } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Navigation items with sub-routes
const navItemsWithSubRoutes = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: Home,
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: Car,
    subItems: [
      {
        href: "/inventory",
        label: "All Vehicles",
        icon: Car,
      },
      {
        href: "/inventory/add",
        label: "Add Vehicle",
        icon: Plus,
      },
    ],
  },
  {
    href: "/clients",
    label: "Clients",
    icon: Users,
    subItems: [
      {
        href: "/clients",
        label: "All Clients",
        icon: Users,
      },
      {
        href: "/clients/add",
        label: "Add Client",
        icon: UserPlus,
      },
    ],
  },
  {
    label: "Deals",
    href: "/deals",
    icon: FileText,
    subItems: [
      {
        href: "/deals",
        label: "All Deals",
        icon: FileText,
      },
      {
        href: "/deals/new",
        label: "New Deal",
        icon: FileSignature,
      },
    ],
  },
  {
    href: "/marketplace",
    label: "Marketplace",
    icon: ShoppingCart,
    subItems: [
      {
        href: "/marketplace/document-packs",
        label: "Document Packs",
        icon: Package,
      },
    ],
  },
  {
    href: "/communications",
    label: "Communications",
    icon: Mail,
    subItems: [
      {
        href: "/communications/email/b2c",
        label: "Email",
        icon: Mail,
      },
    ],
  }
];

// Settings navigation with subdomains
const settingsNavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
  subItems: [
    {
      href: "/settings",
      label: "Overview",
      icon: Settings,
    },
    {
      href: "/settings/general",
      label: "General",
      icon: Building,
    },
    {
      href: "/settings/users",
      label: "Users",
      icon: Users,
    },
    {
      href: "/settings/billing",
      label: "Billing",
      icon: CreditCard,
    },
    {
      href: "/settings/notifications",
      label: "Notifications",
      icon: Bell,
    },
    {
      href: "/settings/api-keys",
      label: "API Keys",
      icon: Key,
    },
    {
      href: "/settings/domain",
      label: "Domain",
      icon: Globe,
    },
    {
      href: "/settings/cache",
      label: "Cache",
      icon: Database,
    },
    {
      href: "/settings/developer",
      label: "Developer",
      icon: Code,
    },
    {
      href: "/settings/document-templates",
      label: "Document Templates",
      icon: FileText,
    },
    {
      href: "/settings/ip-management",
      label: "IP Management",
      icon: Shield,
    },
    {
      href: "/settings/api-usage",
      label: "API Usage",
      icon: Database,
    },
  ],
};

// Quick action items
const quickActions = [
  {
    label: "Add Client",
    icon: UserPlus,
    href: "/clients/add",
  },
  {
    label: "Add Vehicle",
    icon: CarFront,
    href: "/inventory/add",
  },
  {
    label: "New Deal",
    icon: FileSignature,
    href: "/deals/new",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isAdmin } = useCurrentUser();
  const createCheckoutSession = useAction(api.subscriptions.createCheckoutSession);
  const createUser = useMutation(api.users.createUser);
  const forceSyncCurrentUser = useMutation(api.subscriptions.forceSyncCurrentUser);
  const subscriptionStatus = useQuery(api.subscriptions.checkSubscriptionStatus, {});
  const currentDealership = useQuery(api.dealerships.getCurrentDealership, {});
  const { user } = useUser();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Create user when component mounts and user is available
  useEffect(() => {
    if (user) {
      console.log("Creating/updating user for:", user.id);
      createUser({
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName || user.emailAddresses[0].emailAddress,
        image: user.imageUrl,
        clerkId: user.id,
      }).catch((error) => {
        console.error("Error creating user:", error);
      });
    }
  }, [user, createUser]);

  // REVERTED FLOW: Check dealership first, then subscription
  useEffect(() => {
    if (subscriptionStatus) {
      console.log("Checking flow logic. Status:", subscriptionStatus.subscriptionStatus);
      
      // 1. If user has no dealership, redirect to onboarding first
      if (subscriptionStatus.subscriptionStatus === "no_dealership") {
        console.log("No dealership found - redirecting to onboarding");
        router.push("/onboarding");
        return;
      }
      
      // 2. If user has dealership but no subscription, show subscription required screen
      // (This will be handled below in the render logic)
    }
  }, [subscriptionStatus, router]);

  // Auto-refresh subscription status every 10 seconds if pending
  useEffect(() => {
    if (subscriptionStatus?.subscriptionStatus === "pending") {
      console.log("Setting up auto-refresh for pending subscription");
      const interval = setInterval(() => {
        console.log("Auto-refreshing subscription status");
        forceSyncCurrentUser().then(() => {
          setLastSyncTime(Date.now());
        }).catch((error) => {
          console.error("Error auto-syncing:", error);
        });
      }, 10000); // Every 10 seconds

      return () => clearInterval(interval);
    }
  }, [subscriptionStatus?.subscriptionStatus, forceSyncCurrentUser]);

  // State for dropdown menus
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({
    inventory: false,
    clients: false,
    deals: false,
    settings: false,
  });

  // Auto-expand dropdowns when on their pages
  useEffect(() => {
    setOpenDropdowns((prev) => {
      const newOpenState = { ...prev };
      
      if (pathname?.startsWith("/inventory")) {
        newOpenState.inventory = true;
      }
      if (pathname?.startsWith("/clients")) {
        newOpenState.clients = true;
      }
      if (pathname?.startsWith("/deals")) {
        newOpenState.deals = true;
      }
      if (pathname?.startsWith("/settings")) {
        newOpenState.settings = true;
      }
      
      // Only update if something changed
      const hasChanged = Object.keys(newOpenState).some(
        (key) => newOpenState[key] !== prev[key]
      );
      
      return hasChanged ? newOpenState : prev;
    });
  }, [pathname]);

  // Combine navigation items based on user role
  const navItems = navItemsWithSubRoutes;
  const showSettings = isAdmin;

  const toggleDropdown = (key: string) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSubscribe = async () => {
    if (isSubscribing) return;
    
    // Ensure we have a dealership before trying to subscribe
    if (!currentDealership) {
      toast.error("Please complete onboarding first");
      router.push("/onboarding");
      return;
    }
    
    try {
      setIsSubscribing(true);
      console.log("Starting subscription process with dealership:", currentDealership._id);
      
      const { url } = await createCheckoutSession({
        priceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_MONTHLY_PRICE_ID || "price_basic_default",
        successUrl: `${window.location.origin}/dashboard?subscription=success`,
        cancelUrl: `${window.location.origin}/dashboard?subscription=cancelled`,
      });
      
      if (!url) throw new Error("No checkout URL returned");
      
      console.log("Redirecting to:", url);
      window.location.href = url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Failed to start subscription process. Please try again.");
      setIsSubscribing(false);
    }
  };

  const handleRefreshStatus = async () => {
    try {
      console.log("Manually refreshing subscription status");
      await forceSyncCurrentUser();
      setLastSyncTime(Date.now());
      toast.success("Status refreshed");
    } catch (error) {
      console.error("Error refreshing status:", error);
      toast.error("Failed to refresh status");
    }
  };

  // Show loading while checking subscription status
  if (!subscriptionStatus || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  // REDIRECT: If user needs to create dealership first
  if (subscriptionStatus.subscriptionStatus === "no_dealership") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Redirecting to onboarding...</span>
      </div>
    );
  }

  // Check if user has valid subscription
  const hasValidSubscription = subscriptionStatus.hasActiveSubscription || 
                                subscriptionStatus.subscriptionStatus === "pending";

  // Show subscription required screen if user has dealership but no subscription
  if (!hasValidSubscription && currentDealership) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <h2 className="text-2xl font-semibold">Subscription Required</h2>
          <p className="text-muted-foreground">
            Welcome to {currentDealership.name}! Please subscribe to access the dashboard features.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={handleSubscribe} 
              size="lg" 
              disabled={isSubscribing}
              className="w-full"
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Subscribe Now - $49/month"
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleRefreshStatus} 
              size="sm"
              className="w-full"
            >
              Refresh Status
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => router.push("/subscription")}
              size="sm"
              className="w-full"
            >
              View All Plans
            </Button>
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>Status: {subscriptionStatus.subscriptionStatus}</div>
            <div>Dealership: {currentDealership.name}</div>
            <div>Last sync: {new Date(lastSyncTime).toLocaleTimeString()}</div>
          </div>
        </div>
      </div>
    );
  }

  // Show pending message but allow access to dashboard
  const showPendingBanner = subscriptionStatus.subscriptionStatus === "pending";

  return (
    <div className="min-h-screen flex dark:bg-zinc-950">
      {/* Sidebar for desktop */}
      <aside 
        className={`${
          collapsed ? "w-20" : "w-64"
        } border-r hidden lg:flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out bg-background`}
      >
        {/* Header */}
        <div className="h-16 border-b flex items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            <span
              className={`font-semibold text-lg truncate transition-all duration-300 ${
                collapsed ? "opacity-0 w-0" : "opacity-100"
              }`}
            >
              {currentDealership?.name || "Dealership"}
            </span>
          </Link>
          {!collapsed && <NotificationBell />}
        </div>

        {/* Quick Actions Dropdown */}
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full justify-center" size={collapsed ? "icon" : "default"}>
                <Plus className="h-4 w-4" />
                {!collapsed && <span className="ml-2">Quick Add</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={collapsed ? "start" : "center"} className="w-48">
              <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {quickActions.map((action) => (
                <DropdownMenuItem
                  key={action.href}
                  onClick={() => router.push(action.href)}
                  className="cursor-pointer"
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  <span>{action.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (pathname?.startsWith(item.href + "/") && item.href !== "/dashboard");
              const Icon = item.icon;
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const dropdownKey = item.label.toLowerCase();
              const isOpen = openDropdowns[dropdownKey];
              
              // If item has sub-items, render collapsible
              if (hasSubItems) {
                return (
                  <Collapsible 
                    key={item.href}
                    open={isOpen} 
                    onOpenChange={() => toggleDropdown(dropdownKey)}
                    className="space-y-1"
                  >
                    <div className="flex items-center gap-1">
                      <Link
                        href={item.href}
                        className={`flex-1 flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg transition-all duration-200 group ${
                          isActive
                            ? "text-primary-foreground"
                            : "hover:bg-accent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        <span 
                          className={`font-medium transition-all duration-300 ${
                            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                          }`}
                        >
                          {item.label}
                        </span>
                      </Link>
                      
                      {!collapsed && (
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 p-0 hover:bg-accent"
                          >
                            <ChevronDown 
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isOpen ? "rotate-180" : ""
                              }`}
                            />
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    
                    {!collapsed && (
                      <CollapsibleContent className="space-y-1 pl-4">
                        {item.subItems?.map((subItem) => {
                          const isSubActive = pathname === subItem.href;
                          const SubIcon = subItem.icon;
                          
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                                isSubActive
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "hover:bg-accent text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <SubIcon className="h-4 w-4 flex-shrink-0" />
                              <span>{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                );
              }
              
              // Regular nav item without sub-items
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span 
                    className={`font-medium transition-all duration-300 ${
                      collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}

            {/* Settings with Dropdown - Only for Admin */}
            {showSettings && (
              <Collapsible 
                open={openDropdowns.settings} 
                onOpenChange={() => toggleDropdown('settings')}
                className="space-y-1"
              >
                <div className="flex items-center gap-1">
                  <Link
                    href={settingsNavItem.href}
                    className={`flex-1 flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-2.5 rounded-lg transition-all duration-200 group ${
                      pathname?.startsWith("/settings")
                        ? " text-primary-foreground"
                        : "hover:bg-accent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Settings className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <span className="font-medium flex-1 text-left">Settings</span>
                    )}
                  </Link>
                  
                  {!collapsed && (
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 hover:bg-accent"
                      >
                        <ChevronDown 
                          className={`h-4 w-4 transition-transform duration-200 ${
                            openDropdowns.settings ? "rotate-180" : ""
                          }`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
                
                {!collapsed && (
                  <CollapsibleContent className="space-y-1 pl-4">
                    {settingsNavItem.subItems.map((subItem) => {
                      const isActive = pathname === subItem.href;
                      const SubIcon = subItem.icon;
                      
                      return (
                        <Link
                          key={subItem.href}
                          href={subItem.href}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-accent text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <SubIcon className="h-4 w-4 flex-shrink-0" />
                          <span>{subItem.label}</span>
                        </Link>
                      );
                    })}
                  </CollapsibleContent>
                )}
              </Collapsible>
            )}
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="border-t">
          {/* Subscription Status */}
          {subscriptionStatus.subscriptionStatus === "pending" && (
            <div className="p-4 border-b">
              <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-2`}>
                {!collapsed && (
                  <div className="flex items-center gap-2 min-w-0">
                    <Loader2 className="h-3 w-3 animate-spin text-yellow-600 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">
                      Payment pending
                    </span>
                  </div>
                )}
                <Button 
                  onClick={handleRefreshStatus}
                  size="sm" 
                  variant="ghost"
                  className={`${collapsed ? "w-full" : "flex-shrink-0"}`}
                >
                  <Loader2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* User Section */}
          <div className={`p-4 flex items-center ${collapsed ? "justify-center" : "justify-between"} gap-3`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <UserButton afterSignOutUrl="/sign-in" />
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-medium truncate">
                    {user?.fullName || "User"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={subscriptionStatus.subscriptionStatus === "active" ? "default" : "secondary"}
                      className="text-xs h-5"
                    >
                      {subscriptionStatus.subscriptionStatus === "active" ? "Pro" : "Pending"}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Collapse Toggle */}
          <div className="p-2 border-t">
            <Button
              onClick={() => setCollapsed(!collapsed)}
              variant="ghost"
              size="sm"
              className="w-full justify-center"
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span className="text-xs">Collapse</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Pending subscription banner */}
        {showPendingBanner && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
            <div className="px-6 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                  <span className="text-sm text-yellow-800 dark:text-yellow-200">
                    Your subscription is being processed. You have limited access until payment is confirmed.
                  </span>
                </div>
                <Button 
                  onClick={handleRefreshStatus}
                  size="sm" 
                  variant="ghost"
                  className="text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-800/30"
                >
                  Refresh
                </Button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-6 overflow-x-hidden">
          <DealershipProvider>
            {children}
          </DealershipProvider>
        </main>

        {/* Footer */}
        <footer className="border-t py-4 px-6 text-center text-sm text-muted-foreground">
          <p>© 2025 Dealership Admin. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}