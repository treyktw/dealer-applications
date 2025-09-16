"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function UserSync() {
  const { user, isLoaded } = useUser();
  const createUser = useMutation(api.users.createUser);
  const updateUser = useMutation(api.users.updateUser);
  const syncTriggered = useRef<string | false>(false);

  useEffect(() => {
    // Only run when user is loaded and we haven't synced yet for this user
    if (!isLoaded || !user) return;
    
    // Create a unique key for this user to prevent duplicate syncing
    const userKey = user.id;
    if (syncTriggered.current === userKey) return;
    
    syncTriggered.current = userKey;

    const syncUser = async () => {
      try {
        console.log("UserSync: Syncing user", user.id);
        
        // Try to create user first (this handles invitation logic properly)
        await createUser({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress || "",
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          imageUrl: user.imageUrl || undefined,
        });
        
        console.log("UserSync: User created/synced successfully");
      } catch {
        console.log("UserSync: User might already exist, trying update...");
        
        // User might already exist, try to update
        try {
          await updateUser({
            clerkId: user.id,
            email: user.primaryEmailAddress?.emailAddress || "",
            firstName: user.firstName || undefined,
            lastName: user.lastName || undefined,
            imageUrl: user.imageUrl || undefined,
          });
          
          console.log("UserSync: User updated successfully");
        } catch (updateError) {
          console.error("UserSync: Failed to sync user:", updateError);
          // Reset flag on error so we can try again
          syncTriggered.current = false;
        }
      }
    };

    syncUser();
  }, [user, isLoaded, createUser, updateUser]);

  // Reset sync flag when user changes (sign out/in)
  useEffect(() => {
    if (!user) {
      syncTriggered.current = false;
    }
  }, [user]);

  return null;
}