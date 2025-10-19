import { v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";

// Helper function to require authentication (supports both web and desktop)
async function requireAuth(ctx: QueryCtx | MutationCtx, token?: string): Promise<Doc<"users">> {
  let user: Doc<"users"> | null = null;

  // Desktop auth: validate token
  if (token) {
    try {
      const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, { 
        token 
      });
      if (!sessionData) {
        throw new Error("Invalid or expired session");
      }
      // Map desktop auth user to Convex user format
      const desktopUser = sessionData.user;
      user = {
        _id: desktopUser.id as Id<"users">,
        _creationTime: Date.now(),
        clerkId: "",
        email: desktopUser.email,
        name: desktopUser.name,
        role: desktopUser.role,
        dealershipId: desktopUser.dealershipId,
        image: desktopUser.image,
        subscriptionStatus: desktopUser.subscriptionStatus,
        permissions: [],
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      } as Doc<"users">;
    } catch (error) {
      console.error("Desktop auth validation failed:", error);
      throw new Error("Authentication failed");
    }
  } else {
    // Web auth: use Clerk
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }
  }

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

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
    token: v.optional(v.string()), // Optional for backward compatibility
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
    licenseNumber: v.optional(v.string()),
    token: v.optional(v.string()), // Optional for backward compatibility
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    // Verify user has access to the dealership
    if (user.dealershipId !== args.dealershipId) {
      throw new Error("Not authorized to update this dealership");
    }

    // Remove dealershipId and token from the update data
    const { dealershipId, token, ...updateData } = args;

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
    token: v.optional(v.string()), // Optional for backward compatibility
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    // Verify user has access to the dealership
    if (user.dealershipId !== args.dealershipId) {
      throw new Error("Not authorized to update this dealership's settings");
    }

    // Remove dealershipId and token from the update data
    const { dealershipId, token, ...updateData } = args;

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

// Support both web and desktop auth
export const getCurrentDealership = query({
  args: {
    token: v.optional(v.string()), // Optional for backward compatibility
  },
  handler: async (ctx, args): Promise<Doc<"dealerships"> | null> => {
    let user: Doc<"users"> | null = null;

    // Desktop auth: validate token
    if (args.token) {
      try {
        const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, { 
          token: args.token 
        });
        if (!sessionData) {
          return null;
        }
        // Map desktop auth user to Convex user format
        const desktopUser = sessionData.user;
        user = {
          _id: desktopUser.id as Id<"users">,
          _creationTime: Date.now(),
          clerkId: "",
          email: desktopUser.email,
          name: desktopUser.name,
          role: desktopUser.role,
          dealershipId: desktopUser.dealershipId,
          image: desktopUser.image,
          subscriptionStatus: desktopUser.subscriptionStatus,
          permissions: [],
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as Doc<"users">;
      } catch (error) {
        console.error("Desktop auth validation failed:", error);
        return null;
      }
    } else {
      // Web auth: use Clerk
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return null;
      }

      user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();
      
      if (!user) {
        console.log("No user found for clerkId:", identity.subject);
        return null;
      }
    }

    if (!user || !user.dealershipId) {
      return null;
    }

    const dealership = await ctx.db.get(user.dealershipId);
    return dealership || null;
  },
});

export const getDealershipById = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx, args.dealershipId);

    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership) throw new Error("Dealership not found");

    return dealership;
  },
});

// New query specifically for desktop app
export const getDealership = query({
  args: {
    dealershipId: v.id("dealerships"),
    token: v.optional(v.string()), // Optional for backward compatibility
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx, args.token);

    // Verify user has access to this dealership
    if (user.dealershipId !== args.dealershipId) {
      throw new Error("Not authorized to view this dealership");
    }

    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership) {
      throw new Error("Dealership not found");
    }

    return dealership;
  },
});