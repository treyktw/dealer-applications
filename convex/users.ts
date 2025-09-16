// convex/users.ts
import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";

import { auth } from "./auth";
import { nanoid } from "nanoid";
import { addDays } from "date-fns";
import { internalQuery, internalMutation } from "./_generated/server";

import { Id } from "./_generated/dataModel";
import { UserRole } from "./schema";
import { internal } from "./_generated/api";

// User roles
export const USER_ROLES = ["ADMIN", "STAFF", "READONLY"] as const;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Query to get all users in a dealership
export const getAllDealershipUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth(ctx);
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }
    // console.log("Identity", identity);

    // Get the current user to check their role
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new ConvexError("User not found");
    }

    if (currentUser.role !== "ADMIN") {
      throw new ConvexError("Insufficient permissions");
    }

    if (!currentUser.dealershipId) {
      throw new ConvexError("User not associated with a dealership");
    }

    try {
      // Get all users in the same dealership
      const dealershipUsers = await ctx.db
        .query("users")
        .withIndex("by_dealership", (q) => q.eq("dealershipId", currentUser.dealershipId))
        .order("desc")
        .collect();

      // Get all pending invitations
      const pendingInvitations = await ctx.db
        .query("invitations")
        .filter((q) =>
          q.and(
            q.eq(q.field("dealershipId"), currentUser.dealershipId),
            q.eq(q.field("status"), "pending")
          )
        )
        .order("desc")
        .collect();

      return {
        users: dealershipUsers,
        invitations: pendingInvitations,
        currentUser,
      };
    } catch (error: unknown) {
      console.error("Error fetching users:", error);
      throw new ConvexError(error instanceof Error ? error.message : "Failed to fetch users");
    }
  },
});

// Mutation to invite a new user
export const inviteUser = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("ADMIN"), v.literal("STAFF"), v.literal("READONLY")),
  },
  handler: async (ctx, args) => {
    const identity = await auth(ctx);
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    // Get the current user to check their role
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Insufficient permissions");
    }

    if (!currentUser.dealershipId) {
      throw new ConvexError("User not associated with a dealership");
    }

    try {
      const { email, role } = args;

      // Validate the email
      if (!email || !EMAIL_REGEX.test(email)) {
        throw new ConvexError("Invalid email address");
      }

      // Validate the role
      if (!USER_ROLES.includes(role)) {
        throw new ConvexError("Invalid role. Must be one of: ADMIN, STAFF, READONLY");
      }

      // Check if a user with this email already exists
      const existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (existingUser) {
        throw new ConvexError("A user with this email already exists");
      }

      // Check if there's already a pending invitation
      const existingInvitation = await ctx.db
        .query("invitations")
        .filter((q) =>
          q.and(
            q.eq(q.field("email"), email),
            q.eq(q.field("status"), "pending")
          )
        )
        .first();

      if (existingInvitation) {
        throw new ConvexError("An invitation has already been sent to this email");
      }

      // Get dealership for the email
      const dealership = await ctx.db.get(currentUser.dealershipId as Id<"dealerships">);

      if (!dealership) {
        throw new ConvexError("Dealership not found");
      }

      // Generate invitation token
      const token = nanoid(32);
      const expiresAt = addDays(new Date(), 7).getTime();

      // Create invitation
      await ctx.db.insert("invitations", {
        email: args.email,
        token: token,
        role: args.role,
        dealershipId: currentUser.dealershipId,
        invitedBy: currentUser._id,
        expiresAt: expiresAt,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: "pending",
      });

      return {
        success: true,
        message: "Invitation sent successfully",
        invitation: await ctx.db
          .query("invitations")
          .filter((q) => q.eq(q.field("token"), token))
          .first(),
      };
    } catch (error: unknown) {
      console.error("Error inviting user:", error);
      throw new ConvexError(error instanceof Error ? error.message : "Failed to send invitation");
    }
  },
});

// Mutation to update a user's role
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(v.literal("ADMIN"), v.literal("STAFF"), v.literal("READONLY")),
  },
  handler: async (ctx, args) => {
    const identity = await auth(ctx);
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    // Get the current user to check their role
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Insufficient permissions");
    }

    try {
      const { userId, role } = args;

      // Validate the role
      if (!USER_ROLES.includes(role)) {
        throw new ConvexError("Invalid role. Must be one of: ADMIN, STAFF, READONLY");
      }

      // Get the user to update
      const userToUpdate = await ctx.db.get(userId);

      if (!userToUpdate) {
        throw new ConvexError("User not found");
      }

      // Check if the user belongs to the same dealership
      if (userToUpdate.dealershipId !== currentUser.dealershipId) {
        throw new ConvexError("You can only manage users in your own dealership");
      }

      // Check if the user is trying to change their own role
      if (userToUpdate.clerkId === identity.subject) {
        throw new ConvexError("You cannot change your own role");
      }

      // Update the user's role
      await ctx.db.patch(userId, {
        role,
        updatedAt: Date.now(),
      });

      return {
        success: true,
        user: await ctx.db.get(userId),
      };
    } catch (error: unknown) {
      console.error("Error updating user role:", error);
      throw new ConvexError(error instanceof Error ? error.message : "Failed to update user role");
    }
  },
});

// Mutation to delete a user
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await auth(ctx);
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    // Get the current user to check their role
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Insufficient permissions");
    }

    try {
      const { userId } = args;

      // Get the user to delete
      const userToDelete = await ctx.db.get(userId);

      if (!userToDelete) {
        throw new ConvexError("User not found");
      }

      // Check if the user belongs to the same dealership
      if (userToDelete.dealershipId !== currentUser.dealershipId) {
        throw new ConvexError("You can only manage users in your own dealership");
      }

      // Check if the user is trying to delete themselves
      if (userToDelete.clerkId === identity.subject) {
        throw new ConvexError("You cannot delete your own account");
      }

      console.log("Deleting user:", {
        userId: userToDelete._id,
        clerkId: userToDelete.clerkId,
        email: userToDelete.email,
      });

      // Delete related employee record first if it exists
      const employeeRecord = await ctx.db
        .query("employees")
        .withIndex("by_user", (q) => q.eq("userId", userToDelete._id.toString()))
        .first();

      if (employeeRecord) {
        console.log("Deleting employee record:", employeeRecord._id);
        await ctx.db.delete(employeeRecord._id);
      }

      // Delete any pending invitations for this user's email
      const invitations = await ctx.db
        .query("invitations")
        .filter((q) => q.eq(q.field("email"), userToDelete.email))
        .collect();

      for (const invitation of invitations) {
        await ctx.db.delete(invitation._id);
      }

      // Delete the user from Convex
      await ctx.db.delete(userId);
      console.log("User deleted from Convex");

      // Schedule deletion from Clerk (async to avoid blocking)
      await ctx.scheduler.runAfter(0, internal.clerk.deleteUserFromClerk, {
        clerkId: userToDelete.clerkId,
      });

      console.log("Scheduled user deletion from Clerk");

      return { 
        success: true, 
        message: "User deleted successfully from both Convex and Clerk" 
      };
    } catch (error: unknown) {
      console.error("Error deleting user:", error);
      throw new ConvexError(error instanceof Error ? error.message : "Failed to delete user");
    }
  },
});

// New mutation to soft delete (deactivate) a user instead of hard delete
export const deactivateUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await auth(ctx);
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Insufficient permissions");
    }

    const userToDeactivate = await ctx.db.get(args.userId);

    if (!userToDeactivate) {
      throw new ConvexError("User not found");
    }

    if (userToDeactivate.dealershipId !== currentUser.dealershipId) {
      throw new ConvexError("You can only manage users in your own dealership");
    }

    if (userToDeactivate.clerkId === identity.subject) {
      throw new ConvexError("You cannot deactivate your own account");
    }

    // Deactivate user in Convex
    await ctx.db.patch(args.userId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Deactivate related employee record
    const employeeRecord = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userToDeactivate._id.toString()))
      .first();

    if (employeeRecord) {
      await ctx.db.patch(employeeRecord._id, {
        isActive: false,
        updatedAt: Date.now(),
      });
    }

    // Update user metadata in Clerk to indicate deactivation
    await ctx.scheduler.runAfter(0, internal.clerk.updateUserInClerk, {
      clerkId: userToDeactivate.clerkId,
      publicMetadata: {
        role: userToDeactivate.role,
        dealershipId: userToDeactivate.dealershipId?.toString(),
        isActive: false,
      },
    });

    return { 
      success: true, 
      message: "User deactivated successfully" 
    };
  },
});

// Reactivate a deactivated user
export const reactivateUser = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await auth(ctx);
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Insufficient permissions");
    }

    const userToReactivate = await ctx.db.get(args.userId);

    if (!userToReactivate) {
      throw new ConvexError("User not found");
    }

    if (userToReactivate.dealershipId !== currentUser.dealershipId) {
      throw new ConvexError("You can only manage users in your own dealership");
    }

    // Reactivate user in Convex
    await ctx.db.patch(args.userId, {
      isActive: true,
      updatedAt: Date.now(),
    });

    // Reactivate related employee record
    const employeeRecord = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userToReactivate._id.toString()))
      .first();

    if (employeeRecord) {
      await ctx.db.patch(employeeRecord._id, {
        isActive: true,
        updatedAt: Date.now(),
      });
    }

    // Update user metadata in Clerk
    await ctx.scheduler.runAfter(0, internal.clerk.updateUserInClerk, {
      clerkId: userToReactivate.clerkId,
      publicMetadata: {
        role: userToReactivate.role,
        dealershipId: userToReactivate.dealershipId?.toString(),
        isActive: true,
      },
    });

    return { 
      success: true, 
      message: "User reactivated successfully" 
    };
  },
});

// Query to get user by ClerkId - FIXED
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();
    
    if (!user) return null;
    
    return {
      id: user._id,
      hasDealership: !!user.dealershipId,
      role: user.role,
      dealershipId: user.dealershipId,
      email: user.email,
      name: user.name,
      clerkId: user.clerkId,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionId: user.subscriptionId,
    };
  },
});

// Internal query to get a pending invitation by email
export const getPendingInvitationByEmail = internalQuery({
  args: {
    email: v.string(),
  },
  handler: async (ctx) => {
    const now = Date.now();
    
    return await ctx.db
      .query("invitations")
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "pending"),
          q.gt(q.field("expiresAt"), now)
        )
      )
      .first();
  },
});

// Create user - FIXED for consistent ClerkId handling
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    image: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    clerkId: v.optional(v.string()), // Add this for explicit clerkId passing
    role: v.optional(v.string()), // Allow role to be specified
    dealershipId: v.optional(v.id("dealerships")), // Allow dealership to be specified
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Use explicit clerkId if provided, otherwise use identity.subject (CONSISTENT)
    const clerkId = args.clerkId || identity.subject;

    // console.log("Creating user with clerkId:", clerkId);

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existingUser) {
      // console.log("User already exists, returning existing user:", existingUser._id);
      return existingUser;
    }

    // Construct name from firstName/lastName or use provided name or fallback to email
    const userName = args.name || 
      (args.firstName && args.lastName ? `${args.firstName} ${args.lastName}` : 
       args.firstName || args.email);

    // Use imageUrl if provided, otherwise use image
    const userImage = args.imageUrl || args.image;

    // Check if there's a pending invitation for this email
    const pendingInvitation = await ctx.db
      .query("invitations")
      .filter((q) => 
        q.and(
          q.eq(q.field("email"), args.email),
          q.eq(q.field("status"), "pending"),
          q.gt(q.field("expiresAt"), Date.now())
        )
      )
      .first();

    // Use role and dealership from invitation if available, otherwise default
    const userRole = args.role || 
      (pendingInvitation ? pendingInvitation.role : UserRole.ADMIN);
    
    const userDealershipId = args.dealershipId || 
      (pendingInvitation ? pendingInvitation.dealershipId : undefined);

    console.log("Creating new user with data:", {
      clerkId,
      email: args.email,
      name: userName,
      role: userRole,
      dealershipId: userDealershipId,
      hasPendingInvitation: !!pendingInvitation,
    });

    // Create new user
    const userId = await ctx.db.insert("users", {
      clerkId: clerkId,
      email: args.email,
      name: userName,
      image: userImage,
      role: userRole, // Use determined role instead of always ADMIN
      dealershipId: userDealershipId, // Use determined dealership
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
      subscriptionStatus: "inactive",
      subscriptionId: undefined,
      needsOnboarding: !pendingInvitation, // Skip onboarding if invited
    });

    const newUser = await ctx.db.get(userId);
    console.log("Created new user:", newUser);
    return newUser;
  },
});

// Update user - FIXED for consistent ClerkId handling
export const updateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    dealershipId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("Updating user with clerkId:", args.clerkId);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      console.log("User doesn't exist, creating new user");
      // If user doesn't exist, create them
      const userName = args.firstName && args.lastName 
        ? `${args.firstName} ${args.lastName}` 
        : args.firstName || args.email;

      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        name: userName,
        image: args.imageUrl,
        role: UserRole.ADMIN,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true,
        subscriptionStatus: "inactive",
        subscriptionId: undefined,
        dealershipId: args.dealershipId as Id<"dealerships">,
      });

      console.log("Created user with ID:", userId);
      return userId;
    }

    console.log("Updating existing user:", user._id);

    // Update existing user
    await ctx.db.patch(user._id, {
      email: args.email,
      name: args.firstName && args.lastName 
        ? `${args.firstName} ${args.lastName}` 
        : args.firstName || args.email,
      image: args.imageUrl,
      updatedAt: Date.now(),
      ...(args.dealershipId && { dealershipId: args.dealershipId as Id<"dealerships"> }),
    });

    console.log("Updated user successfully");
    return user._id;
  },
});

// Get current user - FIXED for consistent ClerkId handling
export const getCurrentUser = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }


    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user;
  },
});

// Internal mutation to mark an invitation as accepted
export const markInvitationAccepted = internalMutation({
  args: {
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.invitationId, {
      status: "accepted",
      updatedAt: Date.now(),
    });
  },
});

// Query to get a user invitation by token
export const getInvitationByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitations")
      .filter((q) => q.eq(q.field("token"), args.token))
      .first();
    
    if (!invitation) {
      throw new ConvexError("Invalid or expired invitation");
    }

    return invitation;
  },
});

// Fixed updateCurrentUserByClerkId - CONSISTENT ClerkId handling
export const updateCurrentUserByClerkId = mutation({
  args: {
    clerkId: v.string(),
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    console.log("Updating user with clerkId:", args.clerkId, "dealershipId:", args.dealershipId);

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", q => q.eq("clerkId", args.clerkId))
      .first();
    
    if (!user) {
      console.error("User not found for clerkId:", args.clerkId);
      throw new Error("User not found");
    }
    
    console.log("Found user:", user._id, "updating with dealership:", args.dealershipId);

    await ctx.db.patch(user._id, {
      dealershipId: args.dealershipId,
      updatedAt: Date.now(),
    });

    console.log("Successfully updated user with dealership");
    return { success: true };
  },
});

export const createEmployee = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    emailAddress: v.string(),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    jobTitle: v.string(),
    department: v.string(),
    startDate: v.optional(v.string()),
    invitationToken: v.string(),
    dealershipId: v.id("dealerships"),
    role: v.union(v.literal("ADMIN"), v.literal("STAFF"), v.literal("READONLY")),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Creating employee with clerkId:", args.clerkId);

    // Create the user record
    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      email: args.emailAddress,
      name: `${args.firstName} ${args.lastName}`,
      role: args.role,
      dealershipId: args.dealershipId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      needsOnboarding: true,
      subscriptionStatus: "inactive",
      isActive: true,
    });

    // Create the employee record
    await ctx.db.insert("employees", {
      userId: userId,
      dealershipId: args.dealershipId,
      jobTitle: args.jobTitle,
      department: args.department,
      phoneNumber: args.phoneNumber,
      address: args.address,
      startDate: args.startDate ? new Date(args.startDate).getTime() : Date.now(),
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Delete the used invitation
    const invitation = await ctx.db
      .query("invitations")
      .filter((q) => q.eq(q.field("token"), args.invitationToken))
      .first();

    if (invitation) {
      await ctx.db.delete(invitation._id);
    }

    console.log("Created employee successfully with userId:", userId);
    return { userId };
  },
});

export const getUsersByDealership = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();
  },
});

export const updateUserSubscriptionStatus = mutation({
  args: {
    userId: v.id("users"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Updating user subscription status:", args.userId, "to:", args.status);
    
    await ctx.db.patch(args.userId, {
      subscriptionStatus: args.status,
      updatedAt: Date.now(),
    });

    console.log("Successfully updated user subscription status");
  },
});

export const deleteUserByClerkId = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("Deleting user by Clerk ID:", args.clerkId);

    // Find user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      console.log("User not found for Clerk ID:", args.clerkId);
      return { success: true, message: "User not found" };
    }

    try {
      // Delete related employee record first if it exists
      const employeeRecord = await ctx.db
        .query("employees")
        .withIndex("by_user", (q) => q.eq("userId", user._id.toString()))
        .first();

      if (employeeRecord) {
        console.log("Deleting employee record:", employeeRecord._id);
        await ctx.db.delete(employeeRecord._id);
      }

      // Delete any pending invitations for this user's email
      const invitations = await ctx.db
        .query("invitations")
        .filter((q) => q.eq(q.field("email"), user.email))
        .collect();

      for (const invitation of invitations) {
        await ctx.db.delete(invitation._id);
      }

      // Delete user activities
      const activities = await ctx.db
        .query("activities")
        .filter((q) => q.eq(q.field("userId"), user._id.toString()))
        .collect();

      for (const activity of activities) {
        await ctx.db.delete(activity._id);
      }

      // Delete the user record
      await ctx.db.delete(user._id);
      
      console.log("User and related records deleted successfully");
      return { success: true, message: "User deleted successfully" };
    } catch (error) {
      console.error("Error deleting user by Clerk ID:", error);
      throw new ConvexError("Failed to delete user");
    }
  },
});

// Batch delete users (admin only)
export const batchDeleteUsers = mutation({
  args: {
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await auth(ctx);
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Insufficient permissions");
    }

    const results = [];

    for (const userId of args.userIds) {
      try {
        const userToDelete = await ctx.db.get(userId);
        
        if (!userToDelete) {
          results.push({ userId, success: false, error: "User not found" });
          continue;
        }

        if (userToDelete.dealershipId !== currentUser.dealershipId) {
          results.push({ userId, success: false, error: "User not in same dealership" });
          continue;
        }

        if (userToDelete.clerkId === identity.subject) {
          results.push({ userId, success: false, error: "Cannot delete own account" });
          continue;
        }

        // Delete employee record
        const employeeRecord = await ctx.db
          .query("employees")
          .withIndex("by_user", (q) => q.eq("userId", userToDelete._id.toString()))
          .first();

        if (employeeRecord) {
          await ctx.db.delete(employeeRecord._id);
        }

        // Delete invitations
        const invitations = await ctx.db
          .query("invitations")
          .filter((q) => q.eq(q.field("email"), userToDelete.email))
          .collect();

        for (const invitation of invitations) {
          await ctx.db.delete(invitation._id);
        }

        // Delete user
        await ctx.db.delete(userId);

        // Schedule Clerk deletion
        await ctx.scheduler.runAfter(0, internal.clerk.deleteUserFromClerk, {
          clerkId: userToDelete.clerkId,
        });

        results.push({ userId, success: true });
      } catch (error) {
        results.push({ 
          userId, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return { results };
  },
});

// Get users pending deletion (soft deleted but still in system)
export const getPendingDeletions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await auth(ctx);
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new ConvexError("Insufficient permissions");
    }

    // Find inactive users in the same dealership
    const inactiveUsers = await ctx.db
      .query("users")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", currentUser.dealershipId))
      .filter((q) => q.eq(q.field("isActive"), false))
      .collect();

    return inactiveUsers;
  },
});