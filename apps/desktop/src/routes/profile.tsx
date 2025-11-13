// src/routes/profile/index.tsx
import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Mail, 
  Camera,
  Save,
  Shield,
  X,
  Download,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect, useId } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { convexClient } from "@/lib/convex";
import { api } from "@dealer/convex";
import { useAuth } from "@/components/auth/AuthContext";
import { checkForUpdatesManually, getCurrentVersion, installUpdateManually } from "@/components/update/UpdateManager";

import type { Update } from "@/components/update/UpdateManager"

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>("Loading...");

  const firstName = user?.name?.split(" ")[0] || "";
  const lastName = user?.name?.split(" ").slice(1).join(" ") || "";

  const emailId = useId();
  const firstNameId = useId();
  const lastNameId = useId();
  
  const [formData, setFormData] = useState({
    firstName: firstName,
    lastName: lastName,
  });

  // Get current app version on mount
  useEffect(() => {
    const fetchVersion = async () => {
      const version = await getCurrentVersion();
      setCurrentVersion(version);
    };
    fetchVersion();
  }, []);

  // Update form data when user changes
  useEffect(() => {
    if (user) {
      const first = user.name?.split(" ")[0] || "";
      const last = user.name?.split(" ").slice(1).join(" ") || "";
      setFormData({
        firstName: first,
        lastName: last,
      });
    }
  }, [user]);

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) {
        throw new Error("User not found");
      }

      if (!token) {
        throw new Error("No authentication token found");
      }

      return await convexClient.mutation(api.api.users.updateUser, {
        clerkId: user.id,
        email: user.email,
        firstName: data.firstName,
        lastName: data.lastName,
        imageUrl: user.image,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth-session"] });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast.error("Failed to update profile", {
        description: error.message,
      });
    },
  });

  const handleSave = () => {
    updateUserMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (user) {
      const first = user.name?.split(" ")[0] || "";
      const last = user.name?.split(" ").slice(1).join(" ") || "";
      setFormData({
        firstName: first,
        lastName: last,
      });
    }
    setIsEditing(false);
  };

  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    currentVersion: string;
    update: {
      version: string;
      currentVersion: string;
      body?: string;
      date?: string;
      downloadAndInstall: (onEvent: (event: { event: string; data?: { chunkLength: number } }) => void) => Promise<void>;
    };
  } | null>(null);
  const [installingUpdate, setInstallingUpdate] = useState(false);

  // ✅ Manual update check with proper loading state
  const handleCheckForUpdates = async () => {
    setCheckingUpdates(true);
    
    try {
      const result = await checkForUpdatesManually();
      
      if (result.available && result.update && result.version) {
        setUpdateInfo({
          version: result.version,
          currentVersion: result.currentVersion || currentVersion,
          update: result.update,
        });
        toast.success(`Update available: v${result.version}`, {
          description: "Click 'Update Now' to install.",
          duration: 5000,
        });
      } else {
        toast.success("You're on the latest version!", {
          description: result.currentVersion ? `Current version: v${result.currentVersion}` : undefined,
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Update check failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Update check failed", {
        description: errorMessage || "Please try again later.",
        duration: 5000,
      });
    } finally {
      setCheckingUpdates(false);
    }
  };

  // ✅ Manual update installation
  const handleInstallUpdate = async () => {
    if (!updateInfo?.update) return;
    
    setInstallingUpdate(true);
    try {
      // Type assertion needed because Tauri's update object has a slightly different signature
      await installUpdateManually(updateInfo.update as Update);
    } catch (error) {
      console.error("Update installation failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error("Update installation failed", {
        description: errorMessage,
        duration: 5000,
      });
      setInstallingUpdate(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full border-4 animate-spin border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const userRole = user.role || "user";
  const userInitials = `${firstName?.[0] || ""}${lastName?.[0] || ""}`;

  return (
    <Layout>
      <div className="mx-auto space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Profile & Account</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your personal information and account settings
          </p>
        </div>

        {/* Profile Overview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex gap-6 items-start">
              <div className="relative group">
                <Avatar className="w-24 h-24 border-4 shadow-lg border-background">
                  <AvatarImage src={user.image} alt={user.name || ""} />
                  <AvatarFallback className="text-2xl bg-linear-to-br from-primary to-primary/60 text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <button 
                  type="button" 
                  className="flex absolute inset-0 justify-center items-center rounded-full opacity-0 transition-opacity bg-black/50 group-hover:opacity-100"
                  onClick={() => toast.info("Profile picture upload coming soon!")}
                >
                  <Camera className="w-6 h-6 text-white" />
                </button>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex gap-2 mt-3">
                  <span className="inline-flex gap-1 items-center px-3 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary">
                    <Shield className="w-3 h-3" />
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()}
                  </span>
                  {user.subscriptionStatus && (
                    <span className="inline-flex gap-1 items-center px-3 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full dark:bg-green-900/30 dark:text-green-400">
                      {user.subscriptionStatus === 'active' ? 'Active' : user.subscriptionStatus}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button 
                      variant="outline"
                      onClick={handleCancel}
                    >
                      <X className="mr-2 w-4 h-4" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave}
                      disabled={updateUserMutation.isPending}
                    >
                      {updateUserMutation.isPending ? (
                        <>
                          <div className="mr-2 w-4 h-4 rounded-full border-2 border-white animate-spin border-t-transparent" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={firstNameId}>First Name</Label>
                <Input
                  id={firstNameId}
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={lastNameId}>Last Name</Label>
                <Input
                  id={lastNameId}
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={emailId}>Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 w-4 h-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id={emailId}
                  type="email"
                  value={user.email}
                  className="pl-10"
                  disabled
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here. Please contact support if you need to update your email.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ✅ App Updates Card */}
        <Card>
          <CardHeader>
            <div className="flex gap-3 items-center">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Download className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle>App Updates</CardTitle>
                <CardDescription className="mt-1">
                  Keep your app up to date with the latest features
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-lg border bg-card">
                <div>
                  <p className="font-medium">Current Version</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    v{currentVersion}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleCheckForUpdates}
                  disabled={checkingUpdates}
                >
                  {checkingUpdates ? (
                    <>
                      <RefreshCw className="mr-2 w-4 h-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 w-4 h-4" />
                      Check for Updates
                    </>
                  )}
                </Button>
              </div>
              
              {updateInfo && (
                <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="font-semibold text-primary">Update Available</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        v{updateInfo.currentVersion} → v{updateInfo.version}
                      </p>
                    </div>
                    <Button 
                      onClick={handleInstallUpdate}
                      disabled={installingUpdate}
                      className="gap-2"
                    >
                      {installingUpdate ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Installing...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Update Now
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}