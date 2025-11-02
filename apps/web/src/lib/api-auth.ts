import { fetchQuery, fetchMutation } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';

/**
 * Hash string using Web Crypto API (SHA-256)
 */
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function validateApiKey(apiKey: string, dealershipId: string) {
  // Hash the provided key
  const keyHash = await hashString(apiKey);
  
  // Validate against Convex
  const result = await fetchQuery(api.api_keys.validateApiKeyHash, {
    keyHash,
    dealershipId,
  });
  
  // If valid, track usage asynchronously (fire and forget)
  if (result.valid && result.apiKeyDoc) {
    fetchMutation(api.api_keys.trackApiKeyUsage, {
      apiKeyId: result.apiKeyDoc._id,
    }).catch((err: unknown) => {
      console.error('Failed to track API key usage:', err);
      // Don't fail the request if tracking fails
    });
  }
  
  return result;
}
