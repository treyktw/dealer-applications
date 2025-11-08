// src/lib/subscription/SubscriptionProvider.tsx - Updated for Email Auth
import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { convexQuery } from '@/lib/convex';
import { api } from '@dealer/convex';
import { useUnifiedAuth } from '@/components/auth/useUnifiedAuth';
import { getCachedAppMode } from '@/lib/mode-detection';

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
  const auth = useUnifiedAuth();
  const appMode = getCachedAppMode();
  const isStandalone = appMode === "standalone";
  
  // Only query subscription status for dealership mode
  // Standalone subscriptions are handled differently
  const dealershipId = auth.user && 'dealershipId' in auth.user ? auth.user.dealershipId : null;
  
  // Query subscription status (only for dealership mode)
  const subscriptionStatusQuery = useQuery({
    queryKey: ['subscription-status', dealershipId],
    queryFn: () => convexQuery(api.api.subscriptions.checkSubscriptionStatus, {}),
    enabled: !isStandalone && auth.isAuthenticated && !!dealershipId,
    staleTime: 60000, // 1 minute
  });

  const hasFeature = (feature: string): boolean => {
    if (isStandalone) return false; // Standalone mode doesn't use this subscription system
    if (!subscriptionStatusQuery.data?.subscription?.features) return false;
    return subscriptionStatusQuery.data.subscription.features.includes(feature);
  };

  const value: SubscriptionContextType = {
    isLoading: isStandalone ? false : subscriptionStatusQuery.isLoading,
    hasActiveSubscription: isStandalone ? false : (subscriptionStatusQuery.data?.hasActiveSubscription ?? false),
    hasPendingSubscription: isStandalone ? false : (subscriptionStatusQuery.data?.hasPendingSubscription ?? false),
    subscriptionStatus: isStandalone ? 'none' : (subscriptionStatusQuery.data?.subscriptionStatus ?? 'unknown'),
    subscription: isStandalone ? null : (subscriptionStatusQuery.data?.subscription ?? null),
    dealershipId: dealershipId ?? null,
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