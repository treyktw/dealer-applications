import { convexQuery } from '@/lib/convex';
import { api } from '@dealer/convex';

export interface SubscriptionCheckResult {
  hasAccess: boolean;
  reason?: string;
  subscriptionStatus?: string;
  requiredFeatures?: string[];
  missingFeatures?: string[];
}

/**
 * Check if current user has access to a specific feature
 */
export async function checkFeatureAccess(feature: string): Promise<SubscriptionCheckResult> {
  try {
    const result = await convexQuery(api.api.subscriptions.checkFeatureAccess, {
      feature,
    });

    return {
      hasAccess: result.hasAccess,
      reason: result.reason,
    };
  } catch (error) {
    return {
      hasAccess: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if current user has access to multiple features
 */
export async function checkMultipleFeatures(features: string[]): Promise<SubscriptionCheckResult> {
  try {
    const availableFeatures = await convexQuery(api.api.subscriptions.getAvailableFeatures, {});
    
    const missingFeatures = features.filter(feature => 
      !availableFeatures.features.includes(feature)
    );

    return {
      hasAccess: missingFeatures.length === 0,
      reason: missingFeatures.length > 0 
        ? `Missing features: ${missingFeatures.join(', ')}`
        : 'All features available',
      subscriptionStatus: availableFeatures.subscriptionStatus,
      requiredFeatures: features,
      missingFeatures,
    };
  } catch (error) {
    return {
      hasAccess: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
      requiredFeatures: features,
    };
  }
}

/**
 * Check if user can access deals management
 */
export async function checkDealsAccess(): Promise<SubscriptionCheckResult> {
  return checkMultipleFeatures(['deals_management', 'desktop_app_access']);
}

/**
 * Check if user can upload custom documents
 */
export async function checkCustomDocumentUpload(): Promise<SubscriptionCheckResult> {
  return checkFeatureAccess('custom_document_upload');
}

/**
 * Get subscription status for UI display
 */
export async function getSubscriptionStatus() {
  try {
    return await convexQuery(api.api.subscriptions.checkSubscriptionStatus, {});
  } catch (error) {
    return {
      hasActiveSubscription: false,
      subscriptionStatus: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
