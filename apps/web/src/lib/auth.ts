// lib/auth.ts (updated version)
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { eq } from "drizzle-orm";
import { users } from "@/db/schema";

export async function getCurrentUser() {
  try {
    // Get Clerk authentication and user
    const { userId } = await auth();
    if (!userId) {
      return null;
    }
    
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return null;
    }
    
    // Get user from our database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, userId),
    });
    
    if (dbUser) {
      return dbUser;
    }
    
    // User doesn't exist in our database, but they're authenticated with Clerk
    // Don't create them here - this should happen via webhook
    return null;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

export async function getUserRole() {
  const user = await getCurrentUser();
  return user?.role || null;
}

export async function checkRole(allowedRoles: string[]) {
  const role = await getUserRole();
  return role && allowedRoles.includes(role);
}

export async function requireRole(allowedRoles: string[]) {
  const hasPermission = await checkRole(allowedRoles);
  if (!hasPermission) {
    throw new Error('Unauthorized - Insufficient permissions');
  }
}