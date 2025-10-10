// convex/clerk.ts - Clerk integration functions
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

// Internal action to delete user from Clerk
export const deleteUserFromClerk = internalAction({
  args: {
    clerkId: v.string(),
  },
  handler: async (_ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    
    if (!clerkSecretKey) {
      console.error("CLERK_SECRET_KEY not configured");
      throw new Error("Clerk secret key not configured");
    }

    try {
      console.log("Deleting user from Clerk:", args.clerkId);
      
      const response = await fetch(`https://api.clerk.com/v1/users/${args.clerkId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Failed to delete user from Clerk:", response.status, errorData);
        
        // If user doesn't exist in Clerk (404), that's fine - they're already deleted
        if (response.status === 404) {
          console.log("User already deleted from Clerk or doesn't exist");
          return { success: true, message: "User already deleted from Clerk" };
        }
        
        throw new Error(`Clerk API error: ${response.status} - ${errorData}`);
      }

      console.log("Successfully deleted user from Clerk");
      return { success: true, message: "User deleted from Clerk successfully" };
    } catch (error) {
      console.error("Error deleting user from Clerk:", error);
      throw error;
    }
  },
});

// Internal action to update user in Clerk (useful for role changes)
export const updateUserInClerk = internalAction({
  args: {
    clerkId: v.string(),
    publicMetadata: v.optional(v.object({
      role: v.optional(v.string()),
      dealershipId: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    })),
    privateMetadata: v.optional(v.object({
      convexUserId: v.optional(v.string()),
      employeeId: v.optional(v.string()),
    })),
  },
  handler: async (_ctx, args) => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    
    if (!clerkSecretKey) {
      console.error("CLERK_SECRET_KEY not configured");
      throw new Error("Clerk secret key not configured");
    }

    try {
      console.log("Updating user in Clerk:", args.clerkId);
      
      const updateData: any = {};
      if (args.publicMetadata) updateData.public_metadata = args.publicMetadata;
      if (args.privateMetadata) updateData.private_metadata = args.privateMetadata;
      
      const response = await fetch(`https://api.clerk.com/v1/users/${args.clerkId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Failed to update user in Clerk:", response.status, errorData);
        throw new Error(`Clerk API error: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log("Successfully updated user in Clerk");
      return { success: true, user: result };
    } catch (error) {
      console.error("Error updating user in Clerk:", error);
      throw error;
    }
  },
});