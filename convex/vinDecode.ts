/**
 * VIN Decode Actions
 * Convex actions for decoding VINs using NHTSA vPIC API
 */

import { v } from "convex/values";
import { action, mutation, query, internalQuery } from "./_generated/server";
import { decodeVIN, decodePartialVIN, type DecodedVIN } from "./lib/vin/decoder";
import { internal, api } from "./_generated/api";

/**
 * Decode a VIN and return vehicle information
 */
export const decode = action({
  args: {
    vin: v.string(),
  },
  handler: async (ctx, args): Promise<DecodedVIN> => {
    // Decode VIN using NHTSA API
    const decodedVIN = await decodeVIN(args.vin);

    // Optionally cache the result
    try {
      // Type assertion needed until Convex types are regenerated
      await ctx.runMutation(
        api.vinDecode.cacheDecodedVIN,
        {
          vin: decodedVIN.vin,
          data: JSON.stringify(decodedVIN),
        }
      );
    } catch (error) {
      console.warn("Failed to cache VIN decode result:", error);
      // Don't fail the request if caching fails
    }

    return decodedVIN;
  },
});

/**
 * Decode a partial VIN (first 3-11 characters)
 * Useful for auto-suggestions during vehicle entry
 */
export const decodePartial = action({
  args: {
    partialVIN: v.string(),
  },
  handler: async (_ctx, args): Promise<Partial<DecodedVIN>> => {
    return await decodePartialVIN(args.partialVIN);
  },
});

/**
 * Auto-fill vehicle information from VIN
 * Decodes VIN and returns only the fields useful for vehicle form
 */
export const autoFillFromVIN = action({
  args: {
    vin: v.string(),
  },
  handler: async (_ctx, args) => {
    const decoded = await decodeVIN(args.vin);

    // Return only fields useful for vehicle form auto-fill
    return {
      vin: decoded.vin,
      make: decoded.make || "",
      model: decoded.model || "",
      year: decoded.modelYear || new Date().getFullYear(),
      trim: decoded.trim || "",
      bodyClass: decoded.bodyClass || "",
      fuelType: decoded.fuelType || "",
      transmission: decoded.transmissionStyle || "",
      engine: decoded.engineModel || "",
      cylinders: decoded.engineCylinders,
      driveType: decoded.driveType || "",
      doors: decoded.doors,
    };
  },
});

/**
 * Internal mutation to cache decoded VIN results
 * Reduces API calls to NHTSA and improves performance
 */
export const cacheDecodedVIN = mutation({
  args: {
    vin: v.string(),
    data: v.string(), // JSON string of DecodedVIN
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("vin_cache")
      .withIndex("by_vin", (q) => q.eq("vin", args.vin))
      .first();

    const now = Date.now();
    const expiresAt = now + 90 * 24 * 60 * 60 * 1000; // 90 days

    if (existing) {
      // Update existing cache entry
      await ctx.db.patch(existing._id, {
        data: args.data,
        lastAccessedAt: now,
        updatedAt: now,
        expiresAt,
      });
    } else {
      // Create new cache entry
      await ctx.db.insert("vin_cache", {
        vin: args.vin,
        data: args.data,
        createdAt: now,
        lastAccessedAt: now,
        updatedAt: now,
        expiresAt,
      });
    }
  },
});

/**
 * Get cached VIN decode result (internal query)
 * Note: This is an internal query that only reads - cannot modify database
 * Expiration cleanup is done by clearExpiredCache mutation
 */
export const getCached = internalQuery({
  args: {
    vin: v.string(),
  },
  handler: async (ctx, args): Promise<DecodedVIN | null> => {
    const cached = await ctx.db
      .query("vin_cache")
      .withIndex("by_vin", (q) => q.eq("vin", args.vin.toUpperCase()))
      .first();

    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (cached.expiresAt < Date.now()) {
      return null;
    }

    // Parse and return cached data
    try {
      return JSON.parse(cached.data) as DecodedVIN;
    } catch (error) {
      console.error("Failed to parse cached VIN data:", error);
      return null;
    }
  },
});

/**
 * Decode VIN with cache check
 * First checks cache, then falls back to NHTSA API if not cached
 */
export const decodeWithCache = action({
  args: {
    vin: v.string(),
  },
  handler: async (ctx, args): Promise<DecodedVIN> => {
    // Check cache first
    const cached = await ctx.runQuery(internal.vinDecode.getCached, {
      vin: args.vin,
    });

    if (cached) {
      console.log(`✅ VIN decode from cache: ${args.vin}`);
      return cached;
    }

    // Not in cache, decode from NHTSA API
    console.log(`🔍 VIN decode from NHTSA API: ${args.vin}`);
    // Type assertion needed until Convex types are regenerated
    return await ctx.runAction(
      api.vinDecode.decode,
      {
        vin: args.vin,
      }
    );
  },
});

/**
 * Clear expired VIN cache entries
 * Should be called periodically (e.g., daily cron job)
 */
export const clearExpiredCache = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const expired = await ctx.db
      .query("vin_cache")
      .filter((q) => q.lt(q.field("expiresAt"), now))
      .collect();

    let deletedCount = 0;
    for (const entry of expired) {
      await ctx.db.delete(entry._id);
      deletedCount++;
    }

    console.log(`🗑️ Cleared ${deletedCount} expired VIN cache entries`);
    return { deletedCount };
  },
});

/**
 * Get VIN cache statistics
 */
export const getCacheStats = query({
  args: {},
  handler: async (ctx) => {
    const allCache = await ctx.db.query("vin_cache").collect();
    const now = Date.now();

    const stats = {
      total: allCache.length,
      expired: allCache.filter((c) => c.expiresAt < now).length,
      active: allCache.filter((c) => c.expiresAt >= now).length,
      oldestEntry: allCache.length > 0
        ? Math.min(...allCache.map((c) => c.createdAt))
        : null,
      newestEntry: allCache.length > 0
        ? Math.max(...allCache.map((c) => c.createdAt))
        : null,
    };

    return stats;
  },
});
