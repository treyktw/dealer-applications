// hooks/useUserManagement.ts
import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

export type UserRole = "ADMIN" | "STAFF" | "READONLY";

export function useUserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Get all users and invitations
  const usersData = useQuery(api.users.getAllDealershipUsers);
  const isLoadingUsers = usersData === undefined;

  // Mutations
  const inviteUserMutation = useMutation(api.employees.createInvitation);
  const updateUserRoleMutation = useMutation(api.users.updateUserRole);
  const deleteUserMutation = useMutation(api.users.deleteUser);
  const revokeInvitationMutation = useMutation(api.employees.revokeInvitation);

  // Get current user's dealership (needed for invitations)
  const currentDealership = useQuery(api.dealerships.getCurrentDealership, {});

  // Extract users and invitations from the response
  const users = useMemo(() => usersData?.users || [], [usersData?.users]);
  const invitations = useMemo(() => usersData?.invitations || [], [usersData?.invitations]);
  const currentUser = usersData?.currentUser;

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    
    const query = searchQuery.toLowerCase();
    return users.filter(user => 
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.role?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Filter pending invitations based on search query
  const filteredInvitations = useMemo(() => {
    if (!searchQuery.trim()) return invitations;
    
    const query = searchQuery.toLowerCase();
    return invitations.filter(invitation => 
      invitation.email?.toLowerCase().includes(query) ||
      invitation.role?.toLowerCase().includes(query)
    );
  }, [invitations, searchQuery]);

  // Invite user function with improved error handling
  const inviteUser = async (email: string, role: UserRole) => {
    if (!currentDealership?._id) {
      throw new Error("No dealership found. Please contact support.");
    }

    try {
      const result = await inviteUserMutation({
        email,
        role,
        dealershipId: currentDealership._id,
      });

      toast.success("Invitation sent successfully!");
      return result;
    } catch (error: unknown) {
      console.error("Invitation error:", error);
      
      // Handle specific error cases gracefully
      let errorMessage = "Failed to send invitation. Please try again.";
      
      if (error instanceof Error && error.message?.includes("User already exists")) {
        errorMessage = "A user with this email already exists in the system";
      } else if (error instanceof Error && error.message?.includes("Invitation already exists")) {
        errorMessage = "An invitation has already been sent to this email. A new invitation has been sent.";
        toast.success("Invitation updated and resent!");
        return; // Don't throw error for this case
      } else if (error instanceof Error && error.message?.includes("Not authorized")) {
        errorMessage = "You don't have permission to send invitations";
      } else if (error instanceof Error && error.message?.includes("email failed")) {
        errorMessage = "Invitation created but email failed to send. The user can still access via the admin panel.";
        toast.warning(errorMessage);
        return; // Don't throw error for this case
      }
      
      throw new Error(errorMessage);
    }
  };

  // Update user role
  const updateUserRole = async (userId: Id<"users">, role: UserRole) => {
    try {
      await updateUserRoleMutation({ userId, role });
      toast.success("User role updated successfully");
    } catch (error: unknown) {
      console.error("Error updating user role:", error);
      
      let errorMessage = "Failed to update user role. Please try again.";
      if (error instanceof Error && error.message?.includes("Not authorized")) {
        errorMessage = "You don't have permission to update user roles";
      } else if (error instanceof Error && error.message?.includes("cannot change your own role")) {
        errorMessage = "You cannot change your own role";
      } else if (error instanceof Error && error.message?.includes("same dealership")) {
        errorMessage = "You can only manage users in your own dealership";
      }
      
      throw new Error(errorMessage);
    }
  };

  // Delete user
  const deleteUser = async (userId: Id<"users">) => {
    try {
      await deleteUserMutation({ userId });
      toast.success("User removed successfully");
    } catch (error: unknown) {
      console.error("Error deleting user:", error);
      
      let errorMessage = "Failed to remove user. Please try again.";
      if (error instanceof Error && error.message?.includes("Not authorized")) {
        errorMessage = "You don't have permission to remove users";
      } else if (error instanceof Error && error.message?.includes("cannot delete your own account")) {
        errorMessage = "You cannot delete your own account";
      } else if (error instanceof Error && error.message?.includes("same dealership")) {
        errorMessage = "You can only manage users in your own dealership";
      }
      
      throw new Error(errorMessage);
    }
  };

  // Revoke invitation
  const revokeInvitation = async (invitationId: Id<"invitations">) => {
    try {
      await revokeInvitationMutation({ invitationId });
      toast.success("Invitation revoked successfully");
    } catch (error: unknown) {
      console.error("Error revoking invitation:", error);
      
      let errorMessage = "Failed to revoke invitation. Please try again.";
      if (error instanceof Error && error.message?.includes("Not authorized")) {
        errorMessage = "You don't have permission to revoke invitations";
      } else if (error instanceof Error && error.message?.includes("no longer valid")) {
        errorMessage = "This invitation is no longer valid";
      }
      
      throw new Error(errorMessage);
    }
  };

  return {
    // Data
    users,
    invitations,
    currentUser,
    filteredUsers,
    filteredInvitations,
    isLoadingUsers,
    
    // Search
    searchQuery,
    setSearchQuery,
    
    // Actions
    inviteUser,
    updateUserRole,
    deleteUser,
    revokeInvitation,
    
    // Helpers
    currentDealership,
  };
}