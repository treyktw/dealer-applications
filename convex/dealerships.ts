import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { query } from "./_generated/server";

export const createDealership = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    logo: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    s3BucketName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  },
  handler: async (ctx, args) => {
    console.log("Creating dealership with args:", args);
    
    const insertedId = await ctx.db.insert("dealerships", {
      name: args.name,
      description: args.description,
      address: args.address,
      city: args.city,
      state: args.state,
      zipCode: args.zipCode,
      phone: args.phone,
      email: args.email,
      website: args.website,
      logo: args.logo,
      primaryColor: args.primaryColor,
      secondaryColor: args.secondaryColor,
      s3BucketName: args.s3BucketName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    console.log("Created dealership with ID:", insertedId);
    return insertedId;
  },
});

export const updateDealership = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    logo: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user's dealership ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user has access to the dealership
    if (user.dealershipId !== args.dealershipId) {
      throw new Error("Not authorized to update this dealership");
    }

    // Remove dealershipId from the update data
    const { dealershipId, ...updateData } = args;

    // Update dealership
    await ctx.db.patch(dealershipId, {
      ...updateData,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const updateDealershipSettings = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    website: v.optional(v.string()),
    logo: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user's dealership ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user has access to the dealership
    if (user.dealershipId !== args.dealershipId) {
      throw new Error("Not authorized to update this dealership's settings");
    }

    // Remove dealershipId from the update data
    const { dealershipId, ...updateData } = args;

    // Update dealership settings
    await ctx.db.patch(dealershipId, {
      ...updateData,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const updateUserClerkId = mutation({
  args: {
    userId: v.id("users"),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Updating user clerkId:", args.userId, "to:", args.clerkId);
    
    await ctx.db.patch(args.userId, {
      clerkId: args.clerkId,
      updatedAt: Date.now(),
    });
    
    console.log("Successfully updated user clerkId");
  },
});

// FIXED - Consistent ClerkId handling
export const getCurrentDealership = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    // console.log("Auth identity:", identity);
    
    if (!identity) {
      // console.log("No identity found");
      return null;
    }

    // Use identity.subject consistently (not tokenIdentifier)
    // console.log("Searching for user with clerkId:", identity.subject);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    // console.log("User found by clerkId:", user);

    if (!user) {
      console.log("No user found for clerkId:", identity.subject);
      return null;
    }

    if (!user.dealershipId) {
      console.log("User has no dealershipId");
      return null;
    }

    const dealership = await ctx.db.get(user.dealershipId);
    // console.log("Found dealership:", dealership);
    
    return dealership || null;
  },
});

export const getDealershipById = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership) throw new Error("Dealership not found");

    return dealership;
  },
});