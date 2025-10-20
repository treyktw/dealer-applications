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
import { checkForUpdatesManually } from "@/components/update/UpdateManager";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>("");

  const firstName = user?.name?.split(" ")[0] || "";
  const lastName = user?.name?.split(" ").slice(1).join(" ") || "";

  const emailId = useId();
  const firstNameId = useId();
  const lastNameId = useId();
  
  const [formData, setFormData] = useState({
    firstName: firstName,
    lastName: lastName,
  });

  // Get current app version
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const updateInfo = await check();
        if (updateInfo) {
          setCurrentVersion(updateInfo.currentVersion);
        } else {
          // If no update info available, try to get version from package.json or use fallback
          setCurrentVersion("0.1.2"); // Fallback to version from tauri.conf.json
        }
      } catch (error) {
        console.error("Failed to get app version:", error);
        setCurrentVersion("0.1.2"); // Fallback to version from tauri.conf.json
      }
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

      const token = session?.token;
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
    // Reset form to original values
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

  // ✅ Manual update check function
  const handleCheckForUpdates = async () => {
    setCheckingUpdates(true);
    try {
      const result = await checkForUpdatesManually();
      if (result.available) {
        toast.success(`Update available: v${result.version}`, {
          description: "The update will be downloaded automatically.",
        });
        // The UpdateManager component will handle showing the dialog
        relaunch(); // Reload to trigger UpdateManager
      } else {
        toast.success("You're on the latest version!", {
          description: `Current version: v${result.currentVersion}`,
        });
      }
    } catch (error) {
      console.error("Update check failed:", error);
      toast.error("Failed to check for updates", {
        description: "Please try again later.",
      });
    } finally {
      setCheckingUpdates(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Profile & Account</h1>
          <p className="text-muted-foreground mt-1">
            Manage your personal information and account settings
          </p>
        </div>

        {/* Profile Overview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                  <AvatarImage src={user.image} alt={user.name || ""} />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <button 
                  type="button" 
                  className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => toast.info("Profile picture upload coming soon!")}
                >
                  <Camera className="h-6 w-6 text-white" />
                </button>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{user.name}</h2>
                <p className="text-muted-foreground">{user.email}</p>
                <div className="flex gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    <Shield className="h-3 w-3" />
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase()}
                  </span>
                  {user.subscriptionStatus && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
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
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSave}
                      disabled={updateUserMutation.isPending}
                    >
                      {updateUserMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
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
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
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
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">Current Version</p>
                <p className="text-sm text-muted-foreground">
                  {currentVersion}
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleCheckForUpdates}
                disabled={checkingUpdates}
              >
                {checkingUpdates ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Check for Updates
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}