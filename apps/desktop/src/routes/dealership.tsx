// src/routes/dealership.tsx - Fixed with proper data fetching
import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, MapPin, Phone, Mail, Save } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { convexClient } from "@/lib/convex";
import { api, type Id } from "@dealer/convex";
import { useAuth } from "@/components/auth/AuthContext";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useId } from "react";

export const Route = createFileRoute("/dealership")({
  component: DealershipPage,
});

function DealershipPage() {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();


  const nameId = useId();
  const addressId = useId();
  const cityId = useId();
  const stateId = useId();
  const zipCodeId = useId();
  const phoneId = useId();
  const emailId = useId();  
  const websiteId = useId();

  // Fetch dealership data using the correct pattern
  const { data: dealership, isLoading } = useQuery({
    queryKey: ["dealership", user?.dealershipId],
    queryFn: async () => {
      if (!user?.dealershipId) {
        throw new Error("User not associated with a dealership");
      }

      const token = session?.token;
      if (!token) {
        throw new Error("No authentication token found");
      }

      return await convexClient.query(api.api.dealerships.getDealership, {
        dealershipId: user.dealershipId as Id<"dealerships">,
        token: token,
      });
    },
    enabled: !!user?.dealershipId && !!session?.token,
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    email: "",
    website: "",
  });

  // Update form when dealership data loads
  useEffect(() => {
    if (dealership) {
      setFormData({
        name: dealership.name || "",
        address: dealership.address || "",
        city: dealership.city || "",
        state: dealership.state || "",
        zipCode: dealership.zipCode || "",
        phone: dealership.phone || "",
        email: dealership.email || "",
        website: dealership.website || "",
      });
    }
  }, [dealership]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.dealershipId) {
        throw new Error("User not associated with a dealership");
      }

      const token = session?.token;
      if (!token) {
        throw new Error("No authentication token found");
      }

      return await convexClient.mutation(api.api.dealerships.updateDealership, {
        dealershipId: user.dealershipId as Id<"dealerships">,
        ...data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dealership"] });
      toast.success("Dealership updated successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to update dealership", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading dealership information...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (!dealership) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Dealership</h1>
            <p className="text-muted-foreground mt-1">
              Manage your dealership information
            </p>
          </div>

          <Card className="border-none shadow-lg">
            <CardContent className="p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Dealership Found</h3>
              <p className="text-muted-foreground">
                Unable to load dealership information. Please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dealership Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your dealership information and settings
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription className="mt-1">
                    Your dealership's basic details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Dealership Name</Label>
                  <Input
                    id={nameId}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter dealership name"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle>Location</CardTitle>
                  <CardDescription className="mt-1">
                    Physical address and location details
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id={addressId}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter street address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id={cityId}
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id={stateId}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code</Label>
                  <Input
                    id={zipCodeId}
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="ZIP"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <Phone className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription className="mt-1">
                    How customers can reach you
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id={phoneId}
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(555) 123-4567"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id={emailId}
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@dealership.com"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id={websiteId}
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.dealership.com"
                />
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}