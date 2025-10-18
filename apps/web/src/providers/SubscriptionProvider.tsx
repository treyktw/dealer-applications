"use client";

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import type { Id } from '@/convex/_generated/dataModel';

// Define the subscription type based on your schema
interface Subscription {
  _id: Id<"subscriptions">;
  _creationTime: number;
  dealershipId: Id<"dealerships">;
  status: string;
  plan: string;
  billingCycle: string;
  currentPeriodStart: number;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  clientSecret?: string;
  features: string[];
  storageUsed?: number;
  apiCallsUsed?: number;
  usersCount?: number;
  createdAt: number;
  updatedAt: number;
}

interface SubscriptionContextType {
  isLoading: boolean;
  hasActiveSubscription: boolean;
  hasPendingSubscription: boolean;
  subscriptionStatus: string;
  subscription: Subscription | null;
  dealershipId: string | null;
  refreshStatus: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoaded } = useUser();
  const subscriptionStatusQuery = useQuery(api.subscriptions.checkSubscriptionStatus, {});
  const forceSyncCurrentUser = useMutation(api.subscriptions.forceSyncCurrentUser);
  const createUser = useMutation(api.users.createUser);

  // Create user when component mounts and user is available
  useEffect(() => {
    if (user && isLoaded) {
      // console.log("SubscriptionProvider: Creating user for:", user.id);
      createUser({
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName || user.emailAddresses[0].emailAddress,
        image: user.imageUrl,
        clerkId: user.id,
      }).catch((error) => {
        console.error("SubscriptionProvider: Error creating user:", error);
      });
    }
  }, [user, isLoaded, createUser]);

  const refreshStatus = useCallback(() => {
    // console.log("SubscriptionProvider: Refreshing subscription status");
    forceSyncCurrentUser().catch((error) => {
      console.error("SubscriptionProvider: Error syncing user:", error);
    });
  }, [forceSyncCurrentUser]);

  // Auto-refresh status every 30 seconds if subscription is pending
  useEffect(() => {
    if (subscriptionStatusQuery?.subscriptionStatus === "pending") {
      // console.log("SubscriptionProvider: Setting up auto-refresh for pending subscription");
      const interval = setInterval(() => {
        // console.log("SubscriptionProvider: Auto-refreshing pending subscription");
        refreshStatus();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [subscriptionStatusQuery?.subscriptionStatus, refreshStatus]);

  const contextValue: SubscriptionContextType = {
    isLoading: !isLoaded || !subscriptionStatusQuery,
    hasActiveSubscription: subscriptionStatusQuery?.hasActiveSubscription || false,
    hasPendingSubscription: subscriptionStatusQuery?.hasPendingSubscription || false,
    subscriptionStatus: subscriptionStatusQuery?.subscriptionStatus || 'none',
    subscription: subscriptionStatusQuery?.subscription || null,
    dealershipId: subscriptionStatusQuery?.dealershipId || null,
    refreshStatus,
  };

  // console.log("SubscriptionProvider: Current context value:", contextValue);

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}