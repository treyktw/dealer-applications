import { createFileRoute, useNavigate } from "@tanstack/react-router"
// src/routes/settings/index.tsx
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexQuery, convexMutation } from "@/lib/convex";
import { api, type Id } from "@dealer/convex";
import { 
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Palette,
  Shield,
  Key,
  Upload,
  Save,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "react-hot-toast";

// Type definitions
interface DealershipFormData {
  name?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  
  // Generate all IDs at the top level
  const nameId = useId();
  const descriptionId = useId();
  const phoneId = useId();
  const emailId = useId();
  const websiteId = useId();
  const addressId = useId();
  const cityId = useId();
  const stateId = useId();
  const zipCodeId = useId();
  const primaryColorId = useId();
  const secondaryColorId = useId();

  // Get current user and dealership
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => convexQuery(api.api.users.getCurrentUser, {}),
  });

  const { data: dealership, isLoading } = useQuery({
    queryKey: ["current-dealership"],
    queryFn: () => convexQuery(api.api.dealerships.getCurrentDealership, {}),
    enabled: !!currentUser,
  });

  // Form state
  const [dealershipForm, setDealershipForm] = useState({
    name: "",
    description: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
  });

  // Update form when dealership data loads
  useState(() => {
    if (dealership) {
      setDealershipForm({
        name: dealership.name || "",
        description: dealership.description || "",
        address: dealership.address || "",
        city: dealership.city || "",
        state: dealership.state || "",
        zipCode: dealership.zipCode || "",
        phone: dealership.phone || "",
        email: dealership.email || "",
        website: dealership.website || "",
      });
    }
  });

  // Update dealership mutation
  const updateDealershipMutation = useMutation({
    mutationFn: async (data: DealershipFormData) => {
      return await convexMutation(api.api.dealerships.updateDealershipSettings, {
        dealershipId: dealership?._id as Id<"dealerships">,
        ...data,
      });
    },
    onSuccess: () => {
      toast.success("Dealership settings updated successfully");
      queryClient.invalidateQueries({ queryKey: ["current-dealership"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update settings");
    },
  });

  const handleSaveDealership = () => {
    updateDealershipMutation.mutate(dealershipForm);
  };

  if (currentUser?.role !== "ADMIN") {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-12">
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
              <p className="text-muted-foreground mb-6">
                You need administrator privileges to access settings.
              </p>
              <Button onClick={() => navigate({ to: "/" })}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your dealership and account settings
          </p>
        </div>

        <Tabs defaultValue="dealership" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dealership">
              <Building2 className="h-4 w-4 mr-2" />
              Dealership
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="integrations">
              <Key className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* Dealership Tab */}
          <TabsContent value="dealership" className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Your dealership's public information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Dealership Name</Label>
                  <Input
                    id={nameId}
                    value={dealershipForm.name}
                    onChange={(e) => setDealershipForm({ ...dealershipForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id={descriptionId}
                    rows={3}
                    value={dealershipForm.description}
                    onChange={(e) => setDealershipForm({ ...dealershipForm, description: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={phoneId}
                        type="tel"
                        className="pl-10"
                        value={dealershipForm.phone}
                        onChange={(e) => setDealershipForm({ ...dealershipForm, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id={emailId}
                        type="email"
                        className="pl-10"
                        value={dealershipForm.email}
                        onChange={(e) => setDealershipForm({ ...dealershipForm, email: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id={websiteId}
                      type="url"
                      className="pl-10"
                      value={dealershipForm.website}
                      onChange={(e) => setDealershipForm({ ...dealershipForm, website: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
                <CardDescription>
                  Your dealership's physical address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id={addressId}
                    value={dealershipForm.address}
                    onChange={(e) => setDealershipForm({ ...dealershipForm, address: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id={cityId}
                      value={dealershipForm.city}
                      onChange={(e) => setDealershipForm({ ...dealershipForm, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id={stateId}
                      value={dealershipForm.state}
                      onChange={(e) => setDealershipForm({ ...dealershipForm, state: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id={zipCodeId}
                    value={dealershipForm.zipCode}
                    onChange={(e) => setDealershipForm({ ...dealershipForm, zipCode: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveDealership}
                disabled={updateDealershipMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateDealershipMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logo & Branding</CardTitle>
                <CardDescription>
                  Customize your dealership's appearance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Dealership Logo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <Avatar className="h-20 w-20 rounded-lg">
                      <AvatarImage src={dealership?.logo} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-2xl">
                        {dealership?.name?.charAt(0) || "D"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Logo
                      </Button>
                      <Button variant="outline" disabled={!dealership?.logo}>
                        Remove
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: Square image, at least 200x200px
                  </p>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id={primaryColorId}
                        type="color"
                        value={dealership?.primaryColor || "#3b82f6"}
                        className="w-20 h-10"
                      />
                      <Input
                        value={dealership?.primaryColor || "#3b82f6"}
                        readOnly
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id={secondaryColorId}
                        type="color"
                        value={dealership?.secondaryColor || "#8b5cf6"}
                        className="w-20 h-10"
                      />
                      <Input
                        value={dealership?.secondaryColor || "#8b5cf6"}
                        readOnly
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Save Appearance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage access control and security features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require 2FA for all team members
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>IP Whitelisting</Label>
                    <p className="text-sm text-muted-foreground">
                      Restrict access to specific IP addresses
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Session Timeout</Label>
                    <p className="text-sm text-muted-foreground">
                      Auto-logout after 30 minutes of inactivity
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                  Recent security events and user activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">User login from new device</p>
                        <p className="text-xs text-muted-foreground">2 hours ago</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Access
                </CardTitle>
                <CardDescription>
                  Manage API keys and integrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/50">
                  <div className="flex items-center justify-between mb-2">
                    <Label>API Key</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                    >
                      {showApiKey ? (
                        <><EyeOff className="h-4 w-4 mr-2" /> Hide</>
                      ) : (
                        <><Eye className="h-4 w-4 mr-2" /> Show</>
                      )}
                    </Button>
                  </div>
                  <Input
                    value={showApiKey ? "sk_live_1234567890abcdef" : "••••••••••••••••"}
                    readOnly
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Keep your API key secure. Don't share it publicly.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Regenerate Key</Button>
                  <Button variant="outline">View Documentation</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Connected Services</CardTitle>
                <CardDescription>
                  Third-party integrations and services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No integrations connected yet
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}