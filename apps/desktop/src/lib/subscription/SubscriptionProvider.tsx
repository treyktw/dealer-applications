// src/lib/subscription/SubscriptionProvider.tsx - Updated for Email Auth
import React, { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@/lib/convex';
import { api } from '@dealer/convex';
import { useAuth } from '@/components/auth/AuthContext';

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
  const { isAuthenticated, user } = useAuth();
  
  // Query subscription status
  const subscriptionStatusQuery = useQuery({
    queryKey: ['subscription-status', user?.dealershipId],
    queryFn: () => convexQuery(api.api.subscriptions.checkSubscriptionStatus, {}),
    enabled: isAuthenticated && !!user?.dealershipId,
    staleTime: 60000, // 1 minute
  });

  const hasFeature = (feature: string): boolean => {
    if (!subscriptionStatusQuery.data?.subscription?.features) return false;
    return subscriptionStatusQuery.data.subscription.features.includes(feature);
  };

  const value: SubscriptionContextType = {
    isLoading: subscriptionStatusQuery.isLoading,
    hasActiveSubscription: subscriptionStatusQuery.data?.hasActiveSubscription ?? false,
    hasPendingSubscription: subscriptionStatusQuery.data?.hasPendingSubscription ?? false,
    subscriptionStatus: subscriptionStatusQuery.data?.subscriptionStatus ?? 'unknown',
    subscription: subscriptionStatusQuery.data?.subscription ?? null,
    dealershipId: user?.dealershipId ?? null,
    refreshStatus: () => subscriptionStatusQuery.refetch(),
    hasFeature,
  };

  return (
    <SubscriptionContext.Provider value={value}>
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