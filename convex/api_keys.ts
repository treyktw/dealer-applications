import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./guards";

/**
 * Generate a cryptographically secure random string
 * Uses Web Crypto API available in Convex runtime
 */
function generateSecureRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Simple hash function using Web Crypto API
 * SHA-256 hash of the input string
 */
async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// Generate API Key
export const generateApiKey = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    name: v.string(),
    environment: v.union(v.literal("production"), v.literal("test")),
    rateLimitPerHour: v.optional(v.number()),
    rateLimitPerDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Only ADMIN can generate keys
    await requireAdmin(ctx);
    
    // Generate random key (64 hex characters = 32 bytes)
    const rawKey = generateSecureRandomString(32);
    const prefix = args.environment === 'production' ? 'sk_live_' : 'sk_test_';
    const fullKey = prefix + rawKey;
    
    // Hash for storage (SHA-256)
    const keyHash = await hashString(fullKey);
    
    // Store only first 15 chars for display
    const keyPrefix = fullKey.substring(0, 15); // "sk_live_abc123d"
    
    // Get dealership's subscription tier for default limits
    const dealership = await ctx.db.get(args.dealershipId);
    const subscription = dealership?.subscriptionId 
      ? await ctx.db.get(dealership.subscriptionId)
      : null;
    
    // Set rate limits based on tier
    let rateLimitPerHour = args.rateLimitPerHour || 1000;
    let rateLimitPerDay = args.rateLimitPerDay || 10000;
    
    if (subscription) {
      if (subscription.plan === 'basic') {
        rateLimitPerHour = 500;
        rateLimitPerDay = 5000;
      } else if (subscription.plan === 'premium') {
        rateLimitPerHour = 2000;
        rateLimitPerDay = 20000;
      } else if (subscription.plan === 'enterprise') {
        rateLimitPerHour = 10000;
        rateLimitPerDay = 100000;
      }
    }
    
    // Store in database
    const apiKeyId = await ctx.db.insert("api_keys", {
      dealershipId: args.dealershipId,
      name: args.name,
      keyHash,
      keyPrefix,
      scopes: ["inventory:read"], // Future-proof for write access
      isActive: true,
      status: "active",
      rateLimitPerHour,
      rateLimitPerDay,
      requestCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: (await requireAdmin(ctx))._id.toString(),
      permissions: ["inventory:read"],
    });
    
    // Return full key ONLY ONCE
    return {
      apiKeyId,
      key: fullKey, // This is the ONLY time we return the raw key
      keyPrefix,
      rateLimitPerHour,
      rateLimitPerDay,
    };
  },
});

// List keys for dealership
export const listApiKeys = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const keys = await ctx.db
      .query("api_keys")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();
    
    return keys.map(key => ({
      id: key._id,
      name: key.name,
      keyPrefix: key.keyPrefix, // Show only first 15 chars
      isActive: key.isActive,
      status: key.status,
      rateLimitPerHour: key.rateLimitPerHour,
      rateLimitPerDay: key.rateLimitPerDay,
      requestCount: key.requestCount,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
    }));
  },
});

// Revoke key
export const revokeApiKey = mutation({
  args: {
    apiKeyId: v.id("api_keys"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    await ctx.db.patch(args.apiKeyId, {
      isActive: false,
      status: "revoked",
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Validate key (internal use by API routes) - READ ONLY
export const validateApiKeyHash = query({
  args: {
    keyHash: v.string(),
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db
      .query("api_keys")
      .withIndex("by_key_hash", (q) => q.eq("keyHash", args.keyHash))
      .first();
    
    if (!apiKey) {
      return { valid: false, error: "Invalid API key" };
    }
    
    if (!apiKey.isActive || apiKey.status !== "active") {
      return { valid: false, error: "API key is inactive or revoked" };
    }
    
    if (apiKey.dealershipId !== args.dealershipId) {
      return { valid: false, error: "API key does not match dealership" };
    }
    
    if (apiKey.expiresAt && apiKey.expiresAt < Date.now()) {
      return { valid: false, error: "API key has expired" };
    }
    
    return {
      valid: true,
      apiKeyDoc: apiKey,
    };
  },
});

// Track API key usage (public mutation - can be called from anywhere)
export const trackApiKeyUsage = mutation({
  args: {
    apiKeyId: v.id("api_keys"),
  },
  handler: async (ctx, args) => {
    const apiKey = await ctx.db.get(args.apiKeyId);
    
    if (!apiKey) {
      return { success: false };
    }
    
    await ctx.db.patch(args.apiKeyId, {
      lastUsedAt: Date.now(),
      requestCount: (apiKey.requestCount || 0) + 1,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});