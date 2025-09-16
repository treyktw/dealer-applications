// src/app/(dashboard)/layout.tsx - REVERTED: Dealership First, Then Subscribe
"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Car, Users, Settings, Menu, Home, FileText } from "lucide-react";
import { DealershipProvider } from "@/providers/dealership-provider";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Loader2 } from "lucide-react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

// Navigation items without settings
const baseNavItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <Home className="h-5 w-5" />,
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: <Car className="h-5 w-5" />,
  },
  {
    href: "/clients",
    label: "Clients",
    icon: <Users className="h-5 w-5" />,
  },
  {
    label: "Deals",
    href: "/deals",
    icon: <FileText className="h-4 w-4" />,
  },
];

// Settings navigation item
const settingsNavItem = {
  href: "/settings",
  label: "Settings",
  icon: <Settings className="h-5 w-5" />,
};

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isAdmin } = useCurrentUser();
  const createCheckoutSession = useAction(api.subscriptions.createCheckoutSession);
  const createUser = useMutation(api.users.createUser);
  const forceSyncCurrentUser = useMutation(api.subscriptions.forceSyncCurrentUser);
  const subscriptionStatus = useQuery(api.subscriptions.checkSubscriptionStatus);
  const currentDealership = useQuery(api.dealerships.getCurrentDealership);
  const { user } = useUser();
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());
  const router = useRouter();

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

  // Combine navigation items based on user role
  const navItems = isAdmin ? [...baseNavItems, settingsNavItem] : baseNavItems;

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

  // console.log("Current subscription status:", subscriptionStatus);
  // console.log("Current dealership:", currentDealership);

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
                "Subscribe Now - $29/month"
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
      <aside className="w-64 border-r hidden lg:block">
        <div className="p-4 border-b">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">
              {currentDealership?.name || "Dealership"}
            </span>
          </Link>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent group transition-colors"
            >
              <div className="text-muted-foreground group-hover:text-primary transition-colors">
                {item.icon}
              </div>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t">
          <Card className="bg-accent/50 fixed w-56 bottom-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-primary p-2 rounded-md text-primary-foreground">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {subscriptionStatus.subscription?.plan || "Basic"} Plan
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Status: {subscriptionStatus.subscriptionStatus}
                  </p>
                </div>
              </div>
              {subscriptionStatus.subscriptionStatus === "pending" && (
                <Button 
                  onClick={handleRefreshStatus}
                  className="w-full" 
                  size="sm" 
                  variant="outline"
                >
                  Refresh Status
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
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

        {/* Header */}
        <header className="border-b h-[61px] flex items-center px-6 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6 border-b">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <Car className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold">
                    {currentDealership?.name || "Dealership"}
                  </span>
                </Link>
              </div>
              <nav className="p-4 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent group transition-colors"
                  >
                    <div className="text-muted-foreground group-hover:text-primary transition-colors">
                      {item.icon}
                    </div>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <div className="lg:hidden ml-2 font-semibold">
            {currentDealership?.name || "Dealership Admin"}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <UserButton afterSignOutUrl="/sign-in" />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-6">
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