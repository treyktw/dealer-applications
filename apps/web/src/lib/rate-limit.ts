import { fetchAction } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

interface RateLimitResult {
  limited: boolean;
  remaining: number;
  limit: number;
  resetTime: number;
  retryAfter: number;
  shouldWait: boolean;
  waitMs: number;
}

export async function getRateLimitStatus(
  apiKeyId: Id<"api_keys">,
  dealershipId: string
): Promise<RateLimitResult> {
  const result = await fetchAction(api.public_api.checkRateLimit, {
    apiKeyId,
    dealershipId,
  });
  
  return result;
}
// Helper to wait if rate limited
export async function handleRateLimit(status: RateLimitResult) {
  if (status.shouldWait && status.waitMs > 0) {
    await new Promise(resolve => setTimeout(resolve, status.waitMs));
  }
}
