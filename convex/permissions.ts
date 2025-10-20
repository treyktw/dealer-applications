// convex/permissions.ts - Role-Based Permission System
import type { MutationCtx, QueryCtx } from "./_generated/server";

/**
 * Permission constants
 * These map to feature gates and access controls throughout the app
 */
export const PERMISSIONS = {
  // Dashboard & Profile
  VIEW_DASHBOARD: "view_dashboard",
  VIEW_PROFILE: "view_profile",
  
  // User Management
  MANAGE_USERS: "manage_users",
  INVITE_USERS: "invite_users",
  REMOVE_USERS: "remove_users",
  MANAGE_ROLES: "manage_roles",
  
  // Inventory
  VIEW_INVENTORY: "view_inventory",
  MANAGE_INVENTORY: "manage_inventory",
  ADD_INVENTORY: "add_inventory",
  EDIT_INVENTORY: "edit_inventory",
  DELETE_INVENTORY: "delete_inventory",
  UPLOAD_INVENTORY_IMAGES: "upload_inventory_images",
  
  // Deals
  VIEW_DEALS: "view_deals",
  MANAGE_DEALS: "manage_deals",
  CREATE_DEALS: "create_deals",
  EDIT_DEALS: "edit_deals",
  DELETE_DEALS: "delete_deals",
  SIGN_DEALS: "sign_deals",
  
  // Clients/Customers
  VIEW_CLIENTS: "view_clients",
  MANAGE_CLIENTS: "manage_clients",
  CREATE_CLIENTS: "create_clients",
  EDIT_CLIENTS: "edit_clients",
  DELETE_CLIENTS: "delete_clients",
  VIEW_PII: "view_pii", // SSN, credit score, etc.
  
  // Documents
  VIEW_DOCUMENTS: "view_documents",
  MANAGE_DOCUMENTS: "manage_documents",
  CREATE_DOCUMENTS: "create_documents",
  EDIT_DOCUMENTS: "edit_documents",
  DELETE_DOCUMENTS: "delete_documents",
  SIGN_DOCUMENTS: "sign_documents",
  MANAGE_TEMPLATES: "manage_templates",
  UPLOAD_CUSTOM_DOCUMENTS: "upload_custom_documents",
  
  // Reports & Analytics
  VIEW_REPORTS: "view_reports",
  VIEW_ANALYTICS: "view_analytics",
  EXPORT_DATA: "export_data",
  
  // Settings
  MANAGE_SETTINGS: "manage_settings",
  MANAGE_BILLING: "manage_billing",
  MANAGE_INTEGRATIONS: "manage_integrations",
  VIEW_AUDIT_LOGS: "view_audit_logs",
  
  // API Access
  API_ACCESS: "api_access",
  MANAGE_API_KEYS: "manage_api_keys",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Role definitions with their permissions
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PROFILE,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.INVITE_USERS,
    PERMISSIONS.REMOVE_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.ADD_INVENTORY,
    PERMISSIONS.EDIT_INVENTORY,
    PERMISSIONS.DELETE_INVENTORY,
    PERMISSIONS.UPLOAD_INVENTORY_IMAGES,
    PERMISSIONS.VIEW_DEALS,
    PERMISSIONS.MANAGE_DEALS,
    PERMISSIONS.CREATE_DEALS,
    PERMISSIONS.EDIT_DEALS,
    PERMISSIONS.DELETE_DEALS,
    PERMISSIONS.SIGN_DEALS,
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.MANAGE_CLIENTS,
    PERMISSIONS.CREATE_CLIENTS,
    PERMISSIONS.EDIT_CLIENTS,
    PERMISSIONS.DELETE_CLIENTS,
    PERMISSIONS.VIEW_PII,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.MANAGE_DOCUMENTS,
    PERMISSIONS.CREATE_DOCUMENTS,
    PERMISSIONS.EDIT_DOCUMENTS,
    PERMISSIONS.DELETE_DOCUMENTS,
    PERMISSIONS.SIGN_DOCUMENTS,
    PERMISSIONS.MANAGE_TEMPLATES,
    PERMISSIONS.UPLOAD_CUSTOM_DOCUMENTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.MANAGE_SETTINGS,
    PERMISSIONS.MANAGE_BILLING,
    PERMISSIONS.MANAGE_INTEGRATIONS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.API_ACCESS,
    PERMISSIONS.MANAGE_API_KEYS,
  ],

  MANAGER: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PROFILE,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.ADD_INVENTORY,
    PERMISSIONS.EDIT_INVENTORY,
    PERMISSIONS.UPLOAD_INVENTORY_IMAGES,
    PERMISSIONS.VIEW_DEALS,
    PERMISSIONS.MANAGE_DEALS,
    PERMISSIONS.CREATE_DEALS,
    PERMISSIONS.EDIT_DEALS,
    PERMISSIONS.SIGN_DEALS,
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.MANAGE_CLIENTS,
    PERMISSIONS.CREATE_CLIENTS,
    PERMISSIONS.EDIT_CLIENTS,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.MANAGE_DOCUMENTS,
    PERMISSIONS.CREATE_DOCUMENTS,
    PERMISSIONS.EDIT_DOCUMENTS,
    PERMISSIONS.SIGN_DOCUMENTS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
  ],

  EMPLOYEE: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PROFILE,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_DEALS,
    PERMISSIONS.CREATE_DEALS,
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.CREATE_CLIENTS,
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.CREATE_DOCUMENTS,
  ],

  READONLY: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PROFILE,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_DEALS,
    PERMISSIONS.VIEW_CLIENTS,
    PERMISSIONS.VIEW_DOCUMENTS,
  ],
};

/**
 * Get permissions for a specific role
 */
export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.READONLY;
}

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: string, permission: Permission): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}

/**
 * Check if user has permission (context-aware)
 * This will eventually use orgMembers table for granular permissions
 */
export async function checkPermission(
  ctx: QueryCtx | MutationCtx,
  permission: Permission
): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) return false;

  // TODO: When orgMembers exists, check orgMembers.permissions array first
  // For now, derive from role
  return roleHasPermission(user.role, permission);
}

/**
 * Get all permissions for current user
 */
export async function getUserPermissions(
  ctx: QueryCtx | MutationCtx
): Promise<Permission[]> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return [];

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();

  if (!user) return [];

  // TODO: When orgMembers exists, merge orgMembers.permissions with role permissions
  return getPermissionsForRole(user.role);
}

/**
 * Permission groups for feature gating
 * Used by FeatureGate component and subscription checks
 */
export const PERMISSION_GROUPS = {
  BASIC_ACCESS: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_PROFILE,
    PERMISSIONS.VIEW_INVENTORY,
    PERMISSIONS.VIEW_DEALS,
  ],
  
  DOCUMENTS_SYSTEM: [
    PERMISSIONS.VIEW_DOCUMENTS,
    PERMISSIONS.CREATE_DOCUMENTS,
    PERMISSIONS.MANAGE_DOCUMENTS,
    PERMISSIONS.MANAGE_TEMPLATES,
  ],
  
  ADVANCED_MANAGEMENT: [
    PERMISSIONS.MANAGE_INVENTORY,
    PERMISSIONS.MANAGE_DEALS,
    PERMISSIONS.MANAGE_CLIENTS,
    PERMISSIONS.MANAGE_USERS,
  ],
  
  ANALYTICS: [
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.EXPORT_DATA,
  ],
  
  API_FEATURES: [
    PERMISSIONS.API_ACCESS,
    PERMISSIONS.MANAGE_API_KEYS,
  ],
} as const;

/**
 * Check if user has all permissions in a group
 */
export async function hasPermissionGroup(
  ctx: QueryCtx | MutationCtx,
  group: keyof typeof PERMISSION_GROUPS
): Promise<boolean> {
  const userPermissions = await getUserPermissions(ctx);
  const requiredPermissions = PERMISSION_GROUPS[group];
  
  return requiredPermissions.every(perm => userPermissions.includes(perm));
}