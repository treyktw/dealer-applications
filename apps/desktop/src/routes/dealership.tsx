// src/routes/dealership/index.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexQuery, convexMutation } from "@/lib/convex";
import { api } from "@dealer/convex";
import { useUser } from "@clerk/clerk-react";
import { useId } from "react";
import { 
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  Upload,
  Save,
  AlertCircle,
  Users,
  DollarSign,
  FileText,
  TrendingUp,
  Loader2,
  Palette,
  Shield,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useState } from "react";
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

interface User {
  _id: string;
  isActive?: boolean;
}

interface Deal {
  status: string;
  totalAmount?: number;
}

export const Route = createFileRoute("/dealership")({
  component: DealershipPage,
});

function DealershipPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  
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

  // Get current user
  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => convexQuery(api.api.users.getCurrentUser, {}),
    enabled: !!user,
  });

  // Get dealership
  const { data: dealership, isLoading: dealershipLoading } = useQuery({
    queryKey: ["current-dealership"],
    queryFn: () => convexQuery(api.api.dealerships.getCurrentDealership, {}),
    enabled: !!user,
  });

  // Get dealership stats
  const { data: stats } = useQuery({
    queryKey: ["dealership-stats", dealership?._id],
    queryFn: async () => {
      if (!dealership?._id) return null;
      
      // Get all users in dealership
      const usersData = await convexQuery(api.api.users.getAllDealershipUsers, {});
      
      // Get all deals in dealership
      const dealsData = await convexQuery(api.api.deals.getDeals, {
        dealershipId: dealership._id,
      });
      
      const deals = Array.isArray(dealsData) ? dealsData : dealsData?.deals || [];
      
      return {
        totalUsers: usersData?.users?.length || 0,
        activeUsers: usersData?.users?.filter((u: User) => u.isActive !== false)?.length || 0,
        totalDeals: deals.length,
        completedDeals: deals.filter((d: Deal) => d.status === "COMPLETED").length,
        totalRevenue: deals.reduce((sum: number, d: Deal) => sum + (d.totalAmount || 0), 0),
      };
    },
    enabled: !!dealership?._id && currentUser?.role === "ADMIN",
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

  // Update form when dealership loads
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
      if (!dealership?._id) {
        throw new Error("Dealership not found");
      }
      return await convexMutation(api.api.dealerships.updateDealership, {
        dealershipId: dealership._id,
        ...data,
      });
    },
    onSuccess: () => {
      toast.success("Dealership updated successfully");
      queryClient.invalidateQueries({ queryKey: ["current-dealership"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update dealership");
    },
  });

  const handleSave = () => {
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
                Only administrators can manage dealership settings.
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

  if (userLoading || dealershipLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dealership...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!dealership) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto mt-12">
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Dealership Found</h2>
              <p className="text-muted-foreground">
                Please contact support to set up your dealership.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 rounded-lg border-2 border-border">
              <AvatarImage src={dealership.logo} />
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-2xl">
                {dealership.name?.charAt(0) || "D"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{dealership.name}</h1>
              <p className="text-muted-foreground mt-1">
                Dealership Management & Settings
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm px-4 py-2">
            <Building2 className="h-4 w-4 mr-2" />
            Active
          </Badge>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{stats.activeUsers}</p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <FileText className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{stats.totalDeals}</p>
                <p className="text-sm text-muted-foreground">Total Deals</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold">{stats.completedDeals}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  ${(stats.totalRevenue / 1000).toFixed(0)}k
                </p>
                <p className="text-sm text-muted-foreground">Revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
                <p className="text-2xl font-bold">
                  {stats.totalDeals > 0 
                    ? Math.round((stats.completedDeals / stats.totalDeals) * 100)
                    : 0}%
                </p>
                <p className="text-sm text-muted-foreground">Close Rate</p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">
              <Building2 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="information">
              <FileText className="h-4 w-4 mr-2" />
              Information
            </TabsTrigger>
            <TabsTrigger value="branding">
              <Palette className="h-4 w-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="advanced">
              <Shield className="h-4 w-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>
                    How customers can reach you
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Address</p>
                      <p className="text-sm text-muted-foreground">
                        {dealership.address || "Not set"}
                        {dealership.city && `, ${dealership.city}`}
                        {dealership.state && `, ${dealership.state}`}
                        {dealership.zipCode && ` ${dealership.zipCode}`}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Phone</p>
                      <p className="text-sm text-muted-foreground">
                        {dealership.phone || "Not set"}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        {dealership.email || "Not set"}
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Website</p>
                      <a 
                        href={dealership.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        {dealership.website || "Not set"}
                        {dealership.website && <ExternalLink className="h-3 w-3" />}
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common dealership tasks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate({ to: "/teams" })}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Manage Team Members
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate({ to: "/subscription" })}
                  >
                    <DollarSign className="mr-2 h-4 w-4" />
                    View Subscription
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => navigate({ to: "/settings" })}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Security Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab("information")}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Update Information
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>About This Dealership</CardTitle>
                <CardDescription>
                  Created {new Date(dealership.createdAt).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {dealership.description || "No description provided."}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Information Tab */}
          <TabsContent value="information" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Your dealership's core details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Dealership Name *</Label>
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
                    placeholder="Describe your dealership..."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
                <CardDescription>
                  How customers can reach you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                      placeholder="https://..."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

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
                      placeholder="GA"
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

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
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
                }}
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateDealershipMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateDealershipMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </TabsContent>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Logo & Branding</CardTitle>
                <CardDescription>
                  Customize your dealership's visual identity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>Dealership Logo</Label>
                  <div className="mt-2 flex items-center gap-4">
                    <Avatar className="h-24 w-24 rounded-lg border-2 border-border">
                      <AvatarImage src={dealership.logo} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold text-3xl">
                        {dealership.name?.charAt(0) || "D"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                      <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Logo
                      </Button>
                      <Button variant="outline" disabled={!dealership.logo}>
                        Remove Logo
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Recommended: Square image, at least 400x400px, PNG or JPG
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
                        value={dealership.primaryColor || "#3b82f6"}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={dealership.primaryColor || "#3b82f6"}
                        readOnly
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id={secondaryColorId}
                        type="color"
                        value={dealership.secondaryColor || "#8b5cf6"}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={dealership.secondaryColor || "#8b5cf6"}
                        readOnly
                        className="flex-1 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>
                    <Save className="mr-2 h-4 w-4" />
                    Save Branding
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Settings</CardTitle>
                <CardDescription>
                  Technical and administrative options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border bg-muted/50">
                  <p className="text-sm font-medium mb-1">Dealership ID</p>
                  <code className="text-xs text-muted-foreground font-mono">
                    {dealership._id}
                  </code>
                </div>
                <div className="p-4 rounded-lg border bg-muted/50">
                  <p className="text-sm font-medium mb-1">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(dealership.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-lg border bg-muted/50">
                  <p className="text-sm font-medium mb-1">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(dealership.updatedAt).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-lg border border-destructive/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Delete Dealership</p>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete this dealership and all associated data
                      </p>
                    </div>
                    <Button variant="destructive" disabled>
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}