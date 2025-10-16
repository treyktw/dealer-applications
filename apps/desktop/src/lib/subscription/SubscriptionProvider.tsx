import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { convexMutation, convexQuery } from '@/lib/convex';
import { api } from '@dealer/convex';
import { useAuth, useClerk } from '@clerk/clerk-react';

// Define the subscription type based on your schema
interface Subscription {
  _id: string;
  _creationTime: number;
  dealershipId: string;
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
  hasFeature: (feature: string) => boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded } = useAuth();
  const { user } = useClerk();
  
  // Query subscription status
  const subscriptionStatusQuery = useQuery({
    queryKey: ['subscription-status'],
    queryFn: () => convexQuery(api.api.subscriptions.checkSubscriptionStatus, {}),
    enabled: isLoaded && !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Force sync mutation
  const forceSyncCurrentUser = useMutation({
    mutationFn: () => convexMutation(api.api.subscriptions.forceSyncCurrentUser, {}),
  });

  const refreshStatus = useCallback(() => {
    if (isLoaded && user) {
      forceSyncCurrentUser.mutate();
    }
  }, [isLoaded, user, forceSyncCurrentUser]);

  // Check if user has a specific feature
  const hasFeature = useCallback((feature: string): boolean => {
    return subscriptionStatusQuery.data?.subscription?.features?.includes(feature) || false;
  }, [subscriptionStatusQuery.data]);

  // Auto-refresh status every 30 seconds if subscription is pending
  useEffect(() => {
    if (subscriptionStatusQuery.data?.subscriptionStatus === "pending") {
      const interval = setInterval(() => {
        refreshStatus();
      }, 30000); // 30 seconds

      return () => clearInterval(interval);
    }
  }, [subscriptionStatusQuery.data?.subscriptionStatus, refreshStatus]);

  const contextValue: SubscriptionContextType = {
    isLoading: !isLoaded || subscriptionStatusQuery.isLoading,
    hasActiveSubscription: subscriptionStatusQuery.data?.hasActiveSubscription || false,
    hasPendingSubscription: subscriptionStatusQuery.data?.hasPendingSubscription || false,
    subscriptionStatus: subscriptionStatusQuery.data?.subscriptionStatus || 'none',
    subscription: subscriptionStatusQuery.data?.subscription || null,
    dealershipId: subscriptionStatusQuery.data?.dealershipId || null,
    refreshStatus,
    hasFeature,
  };

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

// Hook to check if user has deals management feature
export function useDealsAccess() {
  const { hasFeature, hasActiveSubscription } = useSubscription();
  return {
    canAccessDeals: hasActiveSubscription && hasFeature('deals_management'),
    canAccessDesktop: hasActiveSubscription && hasFeature('desktop_app_access'),
    canUploadCustomDocuments: hasActiveSubscription && hasFeature('custom_document_upload'),
  };
}
