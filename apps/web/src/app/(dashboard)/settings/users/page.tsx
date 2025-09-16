// app/(dashboard)/settings/users/page.tsx - Enhanced with Invitations
"use client";

import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { 
  UserPlus, 
  UserX, 
  Mail, 
  Search, 
  AlertTriangle, 
  Loader2,
  Clock,
  XCircle,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { Id } from "@/convex/_generated/dataModel";
import { useUserManagement } from "@/hooks/useUserManagement";

type UserRole = "ADMIN" | "STAFF" | "READONLY";

export default function UserManagementPage() {
  // State for new user invitation
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("STAFF");
  const [inviting, setInviting] = useState(false);
  const [lastInviteSent, setLastInviteSent] = useState<{ [email: string]: number }>({}); 
  const [resendingInvites, setResendingInvites] = useState<Set<string>>(new Set());

  // Use our custom hook for user management
  const {
    filteredUsers,
    filteredInvitations,
    isLoadingUsers,
    searchQuery,
    setSearchQuery,
    inviteUser,
    updateUserRole,
    deleteUser,
    revokeInvitation,
  } = useUserManagement();

  // Function to send a user invitation
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserEmail) {
      toast.error("Please enter an email address.");
      return;
    }

    try {
      setInviting(true);
      await inviteUser(newUserEmail, newUserRole);
      
      // Reset form only if successful (error handling is in the hook)
      setNewUserEmail("");
      setNewUserRole("STAFF");
    } catch (error: unknown) {
      // Error is already handled in the hook with toast
      console.error("Error inviting user:", error);
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvitation = async (email: string) => {
    const now = Date.now();
    const lastSent = lastInviteSent[email] || 0;
    const timeSinceLastSent = now - lastSent;
    const rateLimit = 30 * 1000; // 30 seconds

    if (timeSinceLastSent < rateLimit) {
      const remainingTime = Math.ceil((rateLimit - timeSinceLastSent) / 1000);
      toast.error(`Please wait ${remainingTime} more seconds before resending to ${email}`);
      return;
    }

    // Find the invitation to get the role and dealership info
    const invitation = filteredInvitations.find(inv => inv.email === email);
    if (!invitation) {
      toast.error("Invitation not found");
      return;
    }

    setResendingInvites(prev => new Set(prev).add(email));
    
    try {
      await inviteUser(email, invitation.role as UserRole);
      setLastInviteSent(prev => ({ ...prev, [email]: now }));
      toast.success(`Invitation resent to ${email}`);
    } catch (error: unknown) {
      // Error is already handled in the hook
      console.error("Error resending invitation:", error);
    } finally {
      setResendingInvites(prev => {
        const newSet = new Set(prev);
        newSet.delete(email);
        return newSet;
      });
    }
  };

  // Function to change a user's role
  const handleChangeUserRole = async (userId: Id<"users">, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
    } catch (error: unknown) {
      // Error is already handled in the hook with toast
      console.error("Error changing user role:", error);
    }
  };

  // Function to remove a user
  const handleRemoveUser = async (userId: Id<"users">) => {
    if (!confirm("Are you sure you want to remove this user?")) {
      return;
    }

    try {
      await deleteUser(userId);
    } catch (error: unknown) {
      // Error is already handled in the hook with toast
      console.error("Error removing user:", error);
    }
  };

  // Function to revoke invitation
  const handleRevokeInvitation = async (invitationId: Id<"invitations">) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) {
      return;
    }

    try {
      await revokeInvitation(invitationId);
    } catch (error: unknown) {
      // Error is already handled in the hook with toast
      console.error("Error revoking invitation:", error);
    }
  };

  // Helper function to get badge variant based on role
  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return "default";
      case "STAFF":
        return "secondary";
      case "READONLY":
        return "outline";
      default:
        return "outline";
    }
  };

  // Helper function to format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getRemainingCooldown = (email: string): number => {
    const now = Date.now();
    const lastSent = lastInviteSent[email] || 0;
    const timeSinceLastSent = now - lastSent;
    const rateLimit = 30 * 1000; // 30 seconds
    
    if (timeSinceLastSent < rateLimit) {
      return Math.ceil((rateLimit - timeSinceLastSent) / 1000);
    }
    return 0;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage user accounts and access permissions
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Invite new user */}
        <Card>
          <CardHeader>
            <CardTitle>Invite User</CardTitle>
            <CardDescription>
              Send an invitation to add a new user to the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="text-sm font-medium block mb-1"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="role"
                  className="text-sm font-medium block mb-1"
                >
                  User Role
                </label>
                <Select
                  value={newUserRole}
                  onValueChange={(value: UserRole) => setNewUserRole(value)}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin (Full access)</SelectItem>
                    <SelectItem value="STAFF">Staff (Limited access)</SelectItem>
                    <SelectItem value="READONLY">Read Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Be careful when assigning admin roles - admins have full
                  system access.
                </p>
              </div>

              <Button type="submit" disabled={inviting}>
                {inviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* User roles info */}
        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
            <CardDescription>Understanding permission levels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-4 space-y-3">
              <div>
                <h3 className="text-sm font-medium flex items-center">
                  <Badge>Admin</Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Full access to all system features including user management,
                  settings, and sensitive data.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium flex items-center">
                  <Badge variant="secondary">Staff</Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Access to day-to-day operations like inventory management and
                  client data, but cannot manage users or system settings.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-medium flex items-center">
                  <Badge variant="outline">Read Only</Badge>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Can view data but cannot make any changes to the system. Ideal
                  for reporting, auditing, or view-only team members.
                </p>
              </div>
            </div>

            <div className="rounded-md bg-destructive/10 p-4 flex items-start">
              <AlertTriangle className="h-5 w-5 text-destructive mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-destructive">
                  Security Note
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Regularly audit your user accounts and remove access for users
                  who no longer require it. Use the principle of least privilege
                  when assigning roles.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invitations */}
      {filteredInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Users who have been invited but haven&apos;t joined yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredInvitations.map((invitation) => (
                <div
                  key={invitation._id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-zinc-900 border-amber-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-zinc-900 rounded-full">
                      <Clock className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-amber-900">{invitation.email}</p>
                      <div className="flex items-center gap-2 text-sm text-amber-700">
                        <Badge variant="outline">
                          {invitation.role}
                        </Badge>
                        <span>•</span>
                        <span>
                          Expires {formatDate(invitation.expiresAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendInvitation(invitation.email)}
                      disabled={resendingInvites.has(invitation.email) || getRemainingCooldown(invitation.email) > 0}
                      className="relative"
                    >
                      {resendingInvites.has(invitation.email) ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Sending...
                        </>
                      ) : getRemainingCooldown(invitation.email) > 0 ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Wait {getRemainingCooldown(invitation.email)}s
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Resend
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeInvitation(invitation._id)}
                      className="text-destructive hover:text-destructive/90"
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Revoke
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User list */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>Manage existing user accounts</CardDescription>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-8 w-full md:w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="text-center py-4">
              <Loader2 className="inline-block h-6 w-6 animate-spin text-primary" />
              <p className="mt-2 text-sm text-muted-foreground">
                Loading user accounts...
              </p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No user accounts found.</p>
              {searchQuery && (
                <p className="text-sm mt-1">Try adjusting your search query.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user._id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-md"
                >
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-4">
                      <AvatarImage src={user.image} alt={user.name} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{user.name}</h3>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-3 w-3 mr-1" />
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center mt-4 md:mt-0 gap-2 md:gap-4">
                    <div className="flex items-center">
                      <p className="text-xs text-muted-foreground mr-2">
                        Joined: {formatDate(user.createdAt)}
                      </p>
                      <Badge
                        variant={getRoleBadgeVariant(user.role as UserRole)}
                        className="ml-auto md:ml-0"
                      >
                        {user.role}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 ml-auto">
                      <Select
                        value={user.role}
                        onValueChange={(value: UserRole) =>
                          handleChangeUserRole(user._id, value)
                        }
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue placeholder="Change role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                          <SelectItem value="STAFF">Staff</SelectItem>
                          <SelectItem value="READONLY">Read Only</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveUser(user._id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <UserX className="h-4 w-4" />
                        <span className="sr-only">Remove User</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between border-t px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredUsers.length} users 
            {filteredInvitations.length > 0 && ` and ${filteredInvitations.length} pending invitations`}
          </p>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Activity log */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>User management audit log</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>Activity logging will be available in a future update.</p>
            <p className="text-sm mt-1">
              This feature will track user creation, role changes, and access
              revocation.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}