// convex/allowlists.ts
import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { auth } from "./auth";

// Query to get all allowed IPs
export const getAllowedIPs = query({
  args: {},
  handler: async (ctx) => {
    // Check authentication
    const identity = await auth(ctx);
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    // Get the current user to check their role
    const currentUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Insufficient permissions");
    }

    // Get all allowed IPs
    const allowedIPs = await ctx.db
      .query("allowedIPs")
      .filter((q) => q.eq(q.field("isActive"), true))
      .order("desc")
      .collect();

    return allowedIPs;
  },
});

// Mutation to add a new allowed IP
export const addAllowedIP = mutation({
  args: {
    ip: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check authentication
    const identity = await auth(ctx);
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    // Get the current user to check their role
    const currentUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Insufficient permissions");
    }

    // Validate the IP address with a basic regex for IPv4
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(args.ip)) {
      throw new ConvexError("Invalid IP address format");
    }

    // Check if this IP already exists
    const existingIP = await ctx.db
      .query("allowedIPs")
      .filter((q) => q.eq(q.field("ip"), args.ip))
      .first();

    if (existingIP) {
      // If it exists but is inactive, reactivate it
      if (!existingIP.isActive) {
        return {
          success: true,
          message: "IP address reactivated",
          ip: await ctx.db.get(existingIP._id),
        };
      }
      throw new ConvexError("This IP address is already allowed");
    }

    // Insert the new IP
    const ipId = await ctx.db.insert("allowedIPs", {
      ip: args.ip,
      description: args.description || "",
      isActive: true,
      createdAt: Date.now(),
    });

    return {
      success: true,
      message: "IP address added successfully",
      ip: await ctx.db.get(ipId),
    };
  },
});

// Mutation to remove an allowed IP
export const removeAllowedIP = mutation({
  args: {
    ip: v.string(),
  },
  handler: async (ctx, args) => {
    // Check authentication
    const identity = await auth(ctx);
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    // Get the current user to check their role
    const currentUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Insufficient permissions");
    }

    // Find the IP
    const ipToRemove = await ctx.db
      .query("allowedIPs")
      .filter((q) => q.eq(q.field("ip"), args.ip))
      .first();

    if (!ipToRemove) {
      throw new ConvexError("IP address not found");
    }

    // Instead of deleting, mark as inactive
    await ctx.db.patch(ipToRemove._id, {
      isActive: false,
    });

    return {
      success: true,
      message: "IP address removed successfully",
    };
  },
});

// Query to check if an IP is allowed
export const checkIP = query({
  args: {
    ip: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the IP in the allowlist
    const allowedIP = await ctx.db
      .query("allowedIPs")
      .filter((q) => 
        q.and(
          q.eq(q.field("ip"), args.ip),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    // Check if IP check is enabled
    // You can store this in an environment variable or in a settings table
    const ipCheckEnabled = process.env.ENABLE_IP_CHECK === "true";
    
    // If IP check is disabled, allow all IPs
    if (!ipCheckEnabled) {
      return true;
    }
    
    // If IP check is enabled, only allow IPs in the allowlist
    return !!allowedIP;
  },
});

// Query to get the IP check status
export const getIPCheckStatus = query({
  args: {},
  handler: async () => {
    return {
      enabled: process.env.ENABLE_IP_CHECK === "true",
    };
  },
});