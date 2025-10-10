// convex/developer.ts - Safe developer utilities for testing
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";
// import { Id } from "./_generated/dataModel";

// IMPORTANT: This function only deletes data for the current authenticated user
// It cannot delete other users' data, ensuring safety in multi-user environments
export const deleteCurrentUserData = mutation({
  args: {},
  handler: async (ctx) => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    console.log("🗑️ Starting safe data deletion for user:", identity.subject);

    try {
      // 1. Get the current user from the database
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
        .first();

      if (!user) {
        console.log("No user found in database for clerkId:", identity.subject);
        return { success: true, message: "No user data found to delete" };
      }

      console.log("Found user:", user._id, "dealership:", user.dealershipId);

      const deletedCounts = {
        users: 0,
        dealerships: 0,
        vehicles: 0,
        clients: 0,
        deals: 0,
        documents: 0,
        activities: 0,
        subscriptions: 0,
        invitations: 0,
        employees: 0,
        fileUploads: 0,
        securityLogs: 0,
        rateLimits: 0,
      };

      // 2. If user has a dealership, check if they're the only user
      if (user.dealershipId) {
        console.log("Checking dealership users...");
        
        // Get all users in the same dealership
        const dealershipUsers = await ctx.db
          .query("users")
          .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId))
          .collect();

        console.log(`Found ${dealershipUsers.length} users in dealership`);

        // If this is the only user in the dealership, delete everything
        if (dealershipUsers.length === 1 && dealershipUsers[0]._id === user._id) {
          console.log("User is the only user in dealership - deleting all dealership data");

          // Delete all dealership-related data
          const dealershipId = user.dealershipId;

          // Delete vehicles
          const vehicles = await ctx.db
            .query("vehicles")
            .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
            .collect();
          
          for (const vehicle of vehicles) {
            await ctx.db.delete(vehicle._id);
            deletedCounts.vehicles++;
          }

          // Delete clients
          const clients = await ctx.db
            .query("clients")
            .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
            .collect();
          
          for (const client of clients) {
            await ctx.db.delete(client._id);
            deletedCounts.clients++;
          }

          // Delete deals
          const deals = await ctx.db
            .query("deals")
            .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
            .collect();
          
          for (const deal of deals) {
            await ctx.db.delete(deal._id);
            deletedCounts.deals++;
          }

          // Delete activities
          const activities = await ctx.db
            .query("activities")
            .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
            .collect();
          
          for (const activity of activities) {
            await ctx.db.delete(activity._id);
            deletedCounts.activities++;
          }

          // Delete subscriptions
          const subscriptions = await ctx.db
            .query("subscriptions")
            .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
            .collect();
          
          for (const subscription of subscriptions) {
            await ctx.db.delete(subscription._id);
            deletedCounts.subscriptions++;
          }

          // Delete invitations
          const invitations = await ctx.db
            .query("invitations")
            .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
            .collect();
          
          for (const invitation of invitations) {
            await ctx.db.delete(invitation._id);
            deletedCounts.invitations++;
          }

          // Delete employees
          const employees = await ctx.db
            .query("employees")
            .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
            .collect();
          
          for (const employee of employees) {
            await ctx.db.delete(employee._id);
            deletedCounts.employees++;
          }

          // Delete file uploads
          const fileUploads = await ctx.db
            .query("file_uploads")
            .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
            .collect();
          
          for (const file of fileUploads) {
            await ctx.db.delete(file._id);
            deletedCounts.fileUploads++;
          }

          // Delete security logs (optional - you might want to keep these for audit)
          const securityLogs = await ctx.db
            .query("security_logs")
            .withIndex("by_dealership_timestamp", (q) => q.eq("dealershipId", dealershipId))
            .collect();
          
          for (const log of securityLogs) {
            await ctx.db.delete(log._id);
            deletedCounts.securityLogs++;
          }

          // Delete rate limits for this user
          const rateLimits = await ctx.db
            .query("rate_limits")
            .withIndex("by_identifier", (q) => q.eq("identifier", identity.subject))
            .collect();
          
          for (const rateLimit of rateLimits) {
            await ctx.db.delete(rateLimit._id);
            deletedCounts.rateLimits++;
          }

          // Finally, delete the dealership itself
          await ctx.db.delete(dealershipId);
          deletedCounts.dealerships++;

          console.log("Deleted dealership and all associated data");
        } else {
          console.log("Other users exist in dealership - only deleting user account");
          
          // Only delete user-specific data, not the entire dealership
          // Delete rate limits for this user
          const rateLimits = await ctx.db
            .query("rate_limits")
            .withIndex("by_identifier", (q) => q.eq("identifier", identity.subject))
            .collect();
          
          for (const rateLimit of rateLimits) {
            await ctx.db.delete(rateLimit._id);
            deletedCounts.rateLimits++;
          }

          // Delete security logs for this user
          const securityLogs = await ctx.db
            .query("security_logs")
            .withIndex("by_user_timestamp", (q) => q.eq("userId", identity.subject))
            .collect();
          
          for (const log of securityLogs) {
            await ctx.db.delete(log._id);
            deletedCounts.securityLogs++;
          }
        }
      } else {
        console.log("User has no dealership - only deleting user-specific data");
        
        // Delete rate limits for this user
        const rateLimits = await ctx.db
          .query("rate_limits")
          .withIndex("by_identifier", (q) => q.eq("identifier", identity.subject))
          .collect();
        
        for (const rateLimit of rateLimits) {
          await ctx.db.delete(rateLimit._id);
          deletedCounts.rateLimits++;
        }
      }

      // 3. Finally, delete the user account
      await ctx.db.delete(user._id);
      deletedCounts.users++;

      console.log("✅ Data deletion completed successfully");
      console.log("Deleted counts:", deletedCounts);

      // Log the deletion for audit purposes
      await ctx.db.insert("security_logs", {
        action: 'user_data_deleted',
        userId: identity.subject,
        success: true,
        details: `User requested complete data deletion. Counts: ${JSON.stringify(deletedCounts)}`,
        ipAddress: 'self-service',
        timestamp: Date.now(),
      });

      return { 
        success: true, 
        message: "All your data has been successfully deleted",
        deletedCounts 
      };

    } catch (error) {
      console.error("❌ Error during data deletion:", error);
      
      // Log the error
      await ctx.db.insert("security_logs", {
        action: 'user_data_deletion_failed',
        userId: identity.subject,
        success: false,
        details: `Data deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ipAddress: 'self-service',
        timestamp: Date.now(),
      });

      throw new ConvexError(
        `Failed to delete user data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
});

// Get current user's data summary for the developer tools page
export const getCurrentUserDataSummary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return {
        hasUser: false,
        hasDealership: false,
        isOnlyUserInDealership: false,
        dataCount: {}
      };
    }

    const dataCount = {
      users: 1,
      dealerships: 0,
      vehicles: 0,
      clients: 0,
      deals: 0,
      documents: 0,
      activities: 0,
      subscriptions: 0,
    };

    let isOnlyUserInDealership = false;

    if (user.dealershipId) {
      // Check if user is the only one in dealership
      const dealershipUsers = await ctx.db
        .query("users")
        .withIndex("by_dealership", (q) => q.eq("dealershipId", user.dealershipId))
        .collect();

      isOnlyUserInDealership = dealershipUsers.length === 1;

      if (isOnlyUserInDealership && user.dealershipId) {
        const dealershipId = user.dealershipId;
        dataCount.dealerships = 1;

        // Count dealership data
        const vehicles = await ctx.db
          .query("vehicles")
          .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
          .collect();
        dataCount.vehicles = vehicles.length;

        const clients = await ctx.db
          .query("clients")
          .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
          .collect();
        dataCount.clients = clients.length;

        const deals = await ctx.db
          .query("deals")
          .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
          .collect();
        dataCount.deals = deals.length;

        const activities = await ctx.db
          .query("activities")
          .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
          .collect();
        dataCount.activities = activities.length;

        const subscriptions = await ctx.db
          .query("subscriptions")
          .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
          .collect();
        dataCount.subscriptions = subscriptions.length;
      }
    }

    return {
      hasUser: true,
      hasDealership: !!user.dealershipId,
      isOnlyUserInDealership,
      dataCount,
      dealershipId: user.dealershipId,
    };
  },
});