// convex/guards.ts - Security Guards & Helpers
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { api } from "./_generated/api";

/**
 * Get current authenticated user with full context
 */
export async function getCurrentUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }

  // console.log("getCurrentUser: Looking for user with clerkId:", identity.subject);

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) {
    console.error("getCurrentUser: No user found for clerkId:", identity.subject);
    throw new ConvexError("User not found");
  }

  // console.log("getCurrentUser: Found user:", {
  //   userId: user._id,
  //   clerkId: user.clerkId,
  //   dealershipId: user.dealershipId,
  //   role: user.role
  // });

  return user;
}

/**
 * Get user's dealership with validation
 */
export async function getUserDealership(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);
  
  if (!user.dealershipId) {
    throw new ConvexError("User not associated with any dealership");
  }

  const dealership = await ctx.db.get(user.dealershipId as Id<"dealerships">);
  
  if (!dealership) {
    throw new ConvexError("Dealership not found");
  }

  return { user, dealership };
}

/**
 * Require user to be authenticated and return their info
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  return await getCurrentUser(ctx);
}

/**
 * Require user to belong to a specific dealership
 */
export async function requireDealership(
  ctx: QueryCtx | MutationCtx,
  dealershipId: Id<"dealerships">
) {
  const user = await getCurrentUser(ctx);

  if (user.dealershipId !== dealershipId) {
    throw new ConvexError(
      "Access denied: User does not belong to this dealership"
    );
  }

  return user;
}

/**
 * Require user to belong to a specific org (for future org system)
 * NOTE: This is a placeholder for when orgMembers table is added
 */
export async function requireOrg(ctx: QueryCtx | MutationCtx, orgId: Id<"orgs">) {
  const user = await getCurrentUser(ctx);
  
  // TODO: Query orgMembers table when it exists
  // For now, we'll use dealership as proxy
  const dealership = await ctx.db.get(user.dealershipId as Id<"dealerships">);
  
  if (!dealership) {
    throw new ConvexError("Dealership not found");
  }

  // TODO: Check if dealership.orgId === orgId when org system is implemented
  console.log("requireOrg: Checking org access for orgId:", orgId, "user:", user._id);
  
  return user;
}

/**
 * Check if user has a specific role
 */
export async function hasRole(
  ctx: QueryCtx | MutationCtx,
  role: "ADMIN" | "MANAGER" | "EMPLOYEE" | "READONLY"
) {
  const user = await getCurrentUser(ctx);
  return user.role === role;
}

/**
 * Require user to have a specific role
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  role: "ADMIN" | "MANAGER" | "EMPLOYEE" | "READONLY"
) {
  const user = await getCurrentUser(ctx);

  if (user.role !== role) {
    throw new ConvexError(
      `Access denied: Required role ${role}, user has role ${user.role}`
    );
  }

  return user;
}

/**
 * Require user to have one of multiple roles
 */
export async function requireAnyRole(
  ctx: QueryCtx | MutationCtx,
  roles: Array<"ADMIN" | "MANAGER" | "EMPLOYEE" | "READONLY">
) {
  const user = await getCurrentUser(ctx);

  if (!roles.includes(user.role as "ADMIN" | "MANAGER" | "EMPLOYEE" | "READONLY")) {
    throw new ConvexError(
      `Access denied: User role ${user.role} not in allowed roles [${roles.join(", ")}]`
    );
  }

  return user;
}

/**
 * Require user to be ADMIN
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  return await requireRole(ctx, "ADMIN");
}

/**
 * Require user to be ADMIN or MANAGER
 */
export async function requireAdminOrManager(ctx: QueryCtx | MutationCtx) {
  return await requireAnyRole(ctx, ["ADMIN", "MANAGER"]);
}

/**
 * Check if user can access a specific dealership resource
 */
export async function canAccessDealership(
  ctx: QueryCtx | MutationCtx,
  dealershipId: Id<"dealerships">
): Promise<boolean> {
  try {
    const user = await getCurrentUser(ctx);
    
    // Debug logging to help troubleshoot
    console.log("canAccessDealership check:", {
      userDealershipId: user.dealershipId,
      requestedDealershipId: dealershipId,
      types: {
        userType: typeof user.dealershipId,
        requestedType: typeof dealershipId
      }
    });
    
    // Handle both string and Id types for dealershipId
    const userDealershipId = user.dealershipId as Id<"dealerships">;
    return userDealershipId === dealershipId;
  } catch (error) {
    console.error("canAccessDealership error:", error);
    return false;
  }
}

/**
 * Assert user can access a dealership resource (throws if not)
 */
export async function assertDealershipAccess(
  ctx: QueryCtx | MutationCtx,
  dealershipId: Id<"dealerships">,
  token?: string
) {
  try {
    let user: Doc<"users">;
    
    // Support both web and desktop authentication
    if (token) {
      // Desktop app authentication
      const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, { token });
      if (!sessionData?.user) {
        throw new ConvexError("Invalid or expired session");
      }
      
      const { id, email } = sessionData.user as { id?: string; email?: string };
      
      // Try to find user by Clerk ID
      let foundUser = id
        ? await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", id)).first()
        : null;
      
      // Fallback to email if Clerk ID not found
      if (!foundUser && email) {
        foundUser = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
      }
      
      if (!foundUser) {
        throw new ConvexError("User not found in database");
      }
      
      user = foundUser;
    } else {
      // Web app authentication
      user = await getCurrentUser(ctx);
    }
    
    if (!user.dealershipId) {
      throw new ConvexError("User not associated with any dealership");
    }
    
    const userDealershipId = user.dealershipId as Id<"dealerships">;
    
    if (userDealershipId !== dealershipId) {
      console.log("Dealership access denied:", {
        userDealershipId,
        requestedDealershipId: dealershipId,
        userId: user._id,
        userRole: user.role
      });
      throw new ConvexError(`Access denied: User belongs to dealership ${userDealershipId}, but requested ${dealershipId}`);
    }
  } catch (error) {
    if (error instanceof ConvexError) {
      throw error;
    }
    console.error("assertDealershipAccess error:", error);
    throw new ConvexError("Access denied to this dealership resource");
  }
}

/**
 * Get employee record for current user
 */
export async function getCurrentEmployee(ctx: QueryCtx | MutationCtx) {
  const user = await getCurrentUser(ctx);

  const employee = await ctx.db
    .query("employees")
    .withIndex("by_user", (q) => q.eq("userId", user._id.toString()))
    .first();

  return employee;
}

/**
 * Check if user has a specific permission
 * NOTE: This will use orgMembers permissions when that system is implemented
 */
export async function hasPermission(
  ctx: QueryCtx | MutationCtx,
  permission: string
): Promise<boolean> {
  const user = await getCurrentUser(ctx);
  
  // For now, derive permissions from role
  // TODO: Use orgMembers.permissions when implemented
  const rolePermissions = getRolePermissions(user.role);
  return rolePermissions.includes(permission);
}

/**
 * Require user to have a specific permission
 */
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  permission: string
) {
  const hasPerms = await hasPermission(ctx, permission);
  
  if (!hasPerms) {
    throw new ConvexError(`Access denied: Missing permission '${permission}'`);
  }
}

/**
 * Helper: Get permissions for a role
 * TODO: Move to permissions.ts when created
 */
function getRolePermissions(role: string): string[] {
  const basePermissions = ["view_dashboard", "view_profile"];

  switch (role) {
    case "ADMIN":
      return [
        ...basePermissions,
        "manage_users",
        "manage_roles",
        "manage_settings",
        "manage_inventory",
        "manage_deals",
        "manage_documents",
        "manage_clients",
        "view_reports",
        "export_data",
      ];
    case "MANAGER":
      return [
        ...basePermissions,
        "manage_inventory",
        "manage_deals",
        "manage_documents",
        "view_reports",
      ];
    case "EMPLOYEE":
      return [
        ...basePermissions,
        "view_inventory",
        "view_deals",
        "view_documents",
        "create_deals",
      ];
    case "READONLY":
      return basePermissions;
    default:
      return basePermissions;
  }
}

/**
 * Validate that a resource belongs to user's dealership
 * Generic helper for any resource with dealershipId
 */
export async function validateResourceOwnership<T extends { dealershipId?: string | Id<"dealerships"> }>(
  ctx: QueryCtx | MutationCtx,
  resource: T | null
) {
  if (!resource) {
    throw new ConvexError("Resource not found");
  }

  const user = await getCurrentUser(ctx);

  if (resource.dealershipId !== user.dealershipId) {
    throw new ConvexError("Access denied: Resource belongs to different dealership");
  }

  return resource;
}

/**
 * Safe query wrapper that automatically filters by user's dealership
 * Usage: const deals = await dealershipScopedQuery(ctx, "deals")
 */
export async function dealershipScopedQuery(
  ctx: QueryCtx | MutationCtx,
  tableName: "deals" | "clients" | "vehicles" | "employees"
) {
  const user = await getCurrentUser(ctx);

  const dealershipId = user.dealershipId;
  if (!dealershipId) {
    throw new ConvexError("User not associated with any dealership");
  }

  return ctx.db
    .query(tableName)
    .withIndex("by_dealership", (q) => q.eq("dealershipId", (dealershipId as Id<"dealerships">)));
}