import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";

export function useCurrentUser() {
  const { userId } = useAuth();
  // Only call Convex if we have a userId
  const user = useQuery(
    api.users.getUserByClerkId,
    userId ? { clerkId: userId } : "skip"
  );

  return {
    user,
    loading: user === undefined,
    error: null, // Convex hooks don't provide error, handle in UI if needed
    isAdmin: user?.role === "ADMIN",
  };
} 