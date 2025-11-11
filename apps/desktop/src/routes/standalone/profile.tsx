// src/routes/standalone/profile.tsx
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
import { useState, useEffect, useId, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Id } from "@dealer/convex";
import { useUnifiedAuth } from "@/components/auth/useUnifiedAuth";
import { checkForUpdatesManually, getCurrentVersion } from "@/components/update/UpdateManager";

export const Route = createFileRoute("/standalone/profile")({
  component: StandaloneProfilePage,
});

function StandaloneProfilePage() {
  const { user } = useUnifiedAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string>("Loading...");

  const emailId = useId();
  const firstNameId = useId();
  const lastNameId = useId();
  const businessNameId = useId();
  
  // Memoize user-derived values to prevent unnecessary re-renders
  const userValues = useMemo(() => {
    const userName = user?.name || "";
    const userBusinessName = user?.businessName || "";
    const firstName = userName.split(" ")[0] || "";
    const lastName = userName.split(" ").slice(1).join(" ") || "";
    return { firstName, lastName, businessName: userBusinessName };
  }, [user?.name, user?.businessName]);
  
  // Track previous user values to detect actual changes
  const prevUserValuesRef = useRef<{ firstName: string; lastName: string; businessName: string } | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: userValues.firstName,
    lastName: userValues.lastName,
    businessName: userValues.businessName,
  });

  // Update form data when user changes (but only if not editing and values actually changed)
  useEffect(() => {
    if (!user) return;
    
    const prevValues = prevUserValuesRef.current;
    const hasChanged = 
      !prevValues ||
      prevValues.firstName !== userValues.firstName ||
      prevValues.lastName !== userValues.lastName ||
      prevValues.businessName !== userValues.businessName;
    
    if (hasChanged && !isEditing) {
      setFormData({
        firstName: userValues.firstName,
        lastName: userValues.lastName,
        businessName: userValues.businessName,
      });
      prevUserValuesRef.current = { ...userValues };
    }
  }, [user, userValues, isEditing]);

  // Get current app version on mount
  useEffect(() => {
    const fetchVersion = async () => {
      const version = await getCurrentVersion();
      setCurrentVersion(version);
    };
    fetchVersion();
  }, []);

  // Update user mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) {
        throw new Error("User not found");
      }

      const { convexMutation } = await import("@/lib/convex");
      return await convexMutation(api.api.standaloneAuth.updateProfile, {
        userId: user.id as unknown as Id<"standalone_users">,
        name: `${data.firstName} ${data.lastName}`.trim(),
        businessName: data.businessName || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["standalone-session"] });
      queryClient.invalidateQueries({ queryKey: ["user-license-check"] });
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
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    if (user) {
      const first = user.name?.split(" ")[0] || "";
      const last = user.name?.split(" ").slice(1).join(" ") || "";
      setFormData({
        firstName: first,
        lastName: last,
        businessName: user.businessName || "",
      });
    }
    setIsEditing(false);
  };

  // Manual update check
  const handleCheckForUpdates = async () => {
    setCheckingUpdates(true);
    
    try {
      const result = await checkForUpdatesManually();
      
      if (result.available) {
        toast.success(`Update available: v${result.version}`, {
          description: "A dialog will appear to install the update.",
          duration: 5000,
        });
        window.location.reload();
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

  const userInitials = `${userValues.firstName?.[0] || ""}${userValues.lastName?.[0] || ""}`;
  const subscriptionStatus = user.subscriptionStatus || "none";

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
                  <AvatarImage src={undefined} alt={user.name || ""} />
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
                {user.businessName && (
                  <p className="text-muted-foreground text-sm">{user.businessName}</p>
                )}
                <div className="flex gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    <Shield className="h-3 w-3" />
                    Standalone
                  </span>
                  {subscriptionStatus === "active" && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Active Subscription
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
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
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
              <Label htmlFor={businessNameId}>Business Name (Optional)</Label>
              <Input
                id={businessNameId}
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                disabled={!isEditing}
                placeholder="Your business name"
              />
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

        {/* App Updates Card */}
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
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
              <div>
                <p className="font-medium">Current Version</p>
                <p className="text-sm text-muted-foreground mt-1">
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

