// apps/web/src/app/(master-admin)/dealerships/[id]/page.tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  Database,
  Key,
  Globe,
  Mail,
  Settings,
  AlertTriangle,
  Check,
  X,
  Copy,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface PageProps {
  params: {
    id: string;
  };
}

export default function DealershipDetailPage({ params }: PageProps) {
  const router = useRouter();
  const dealershipId = params.id as Id<"dealerships">;

  const [editMode, setEditMode] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [editedContactEmail, setEditedContactEmail] = useState("");
  const [editedNotes, setEditedNotes] = useState("");
  const [storageLimit, setStorageLimit] = useState("");

  // Queries
  const dealershipDetails = useQuery(api.masterAdmin.getDealershipDetails, {
    dealershipId,
  });
  const apiKeys = useQuery(api.masterAdmin.getDealershipApiKeys, {
    dealershipId,
  });
  const domains = useQuery(api.masterAdmin.getDealershipDomains, {
    dealershipId,
  });

  // Mutations
  const updateDealership = useMutation(api.masterAdmin.updateDealership);
  const toggleSuspension = useMutation(api.masterAdmin.toggleSuspension);
  const deleteDealership = useMutation(api.masterAdmin.deleteDealership);
  const toggleApiKeyStatus = useMutation(api.masterAdmin.toggleApiKeyStatus);
  const verifyDomain = useMutation(api.masterAdmin.verifyDomain);
  const revokeDomain = useMutation(api.masterAdmin.revokeDomain);

  // Email action
  const sendEmail = useAction(api.emailService.sendToDealershipOwners);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSave = async () => {
    try {
      await updateDealership({
        dealershipId,
        name: editedName || undefined,
        contactEmail: editedContactEmail || undefined,
        notes: editedNotes || undefined,
        storageLimit: storageLimit ? parseInt(storageLimit) * 1024 * 1024 * 1024 : undefined,
      });
      toast.success("Dealership updated successfully");
      setEditMode(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleToggleSuspension = async () => {
    if (!dealershipDetails) return;

    try {
      await toggleSuspension({
        dealershipId,
        suspend: !dealershipDetails.dealership.isSuspended,
        reason: !dealershipDetails.dealership.isSuspended
          ? "Services suspended by master admin"
          : undefined,
      });
      toast.success(
        dealershipDetails.dealership.isSuspended
          ? "Services restored"
          : "Services suspended"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDealership({
        dealershipId,
        reason: "Deleted by master admin",
      });
      toast.success("Dealership deleted");
      router.push("/master-admin/dealerships");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  };

  const handleToggleApiKey = async (apiKeyId: Id<"api_keys">, isActive: boolean) => {
    try {
      await toggleApiKeyStatus({ apiKeyId, isActive });
      toast.success(isActive ? "API key enabled" : "API key disabled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleVerifyDomain = async (domainId: Id<"verified_domains">) => {
    try {
      await verifyDomain({ domainId });
      toast.success("Domain verified");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to verify");
    }
  };

  const handleRevokeDomain = async (domainId: Id<"verified_domains">) => {
    try {
      await revokeDomain({ domainId });
      toast.success("Domain revoked");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke");
    }
  };

  const handleSendEmail = async () => {
    try {
      await sendEmail({
        dealershipIds: [dealershipId],
        subject: "Message from DealerApps Support",
        htmlContent: "<p>Your message here</p>",
      });
      toast.success("Email sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send");
    }
  };

  if (dealershipDetails === undefined) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-zinc-400">Loading dealership details...</p>
        </div>
      </div>
    );
  }

  const { dealership, analytics, subscription, users, recentActivity } = dealershipDetails;

  // Initialize edit fields
  if (editMode && !editedName) {
    setEditedName(dealership.name);
    setEditedContactEmail(dealership.contactEmail || dealership.email || "");
    setEditedNotes(dealership.notes || "");
    setStorageLimit(
      dealership.storageLimit
        ? String(dealership.storageLimit / (1024 * 1024 * 1024))
        : "5"
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-zinc-100">{dealership.name}</h1>
            <p className="text-sm text-zinc-500 font-mono mt-1">{dealership._id}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {dealership.isDeleted ? (
            <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
              Deleted
            </Badge>
          ) : dealership.isSuspended ? (
            <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
              Suspended
            </Badge>
          ) : (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              Active
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-zinc-400">Inventory</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">
              {analytics.vehicleCount.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500 mt-1">vehicles</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-zinc-400">Clients</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">
              {analytics.clientCount.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500 mt-1">customers</p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-zinc-400">Deals</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">
              {analytics.dealCount.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {analytics.dealStats.pending} pending
            </p>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-zinc-400">Storage</p>
            <p className="text-2xl font-bold text-zinc-100 mt-1">
              {formatBytes(analytics.storageUsage)}
            </p>
            <div className="mt-2 w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  (analytics.storageUsage / analytics.storageLimit) * 100 > 90
                    ? "bg-red-500"
                    : (analytics.storageUsage / analytics.storageLimit) * 100 > 75
                    ? "bg-orange-500"
                    : "bg-blue-500"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (analytics.storageUsage / analytics.storageLimit) * 100
                  )}%`,
                }}
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              of {formatBytes(analytics.storageLimit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-zinc-900 border border-zinc-800">
          <TabsTrigger value="info" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
            <Building2 className="h-4 w-4 mr-2" />
            Info
          </TabsTrigger>
          <TabsTrigger value="api" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="domains" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
            <Globe className="h-4 w-4 mr-2" />
            Domains
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="actions" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">
            <Settings className="h-4 w-4 mr-2" />
            Actions
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-zinc-100">Dealership Information</CardTitle>
                {!editMode && !dealership.isDeleted && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editMode ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-zinc-300">Name</Label>
                      <Input
                        id="name"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-zinc-300">Contact Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={editedContactEmail}
                        onChange={(e) => setEditedContactEmail(e.target.value)}
                        className="bg-zinc-800 border-zinc-700 text-zinc-100"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="storageLimit" className="text-zinc-300">Storage Limit (GB)</Label>
                    <Input
                      id="storageLimit"
                      type="number"
                      value={storageLimit}
                      onChange={(e) => setStorageLimit(e.target.value)}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-zinc-300">Master Admin Notes</Label>
                    <Textarea
                      id="notes"
                      value={editedNotes}
                      onChange={(e) => setEditedNotes(e.target.value)}
                      rows={4}
                      className="bg-zinc-800 border-zinc-700 text-zinc-100"
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-4">
                    <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditMode(false)}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-zinc-500 mb-1">Email</p>
                      <p className="text-zinc-100">{dealership.contactEmail || dealership.email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 mb-1">Phone</p>
                      <p className="text-zinc-100">{dealership.contactPhone || dealership.phone || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 mb-1">Address</p>
                      <p className="text-zinc-100">
                        {dealership.address ? (
                          <>
                            {dealership.address}<br />
                            {dealership.city}, {dealership.state} {dealership.zipCode}
                          </>
                        ) : (
                          "—"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-zinc-500 mb-1">Created</p>
                      <p className="text-zinc-100">{formatDate(dealership.createdAt)}</p>
                    </div>
                  </div>

                  {dealership.notes && (
                    <div className="mt-6 pt-6 border-t border-zinc-800">
                      <p className="text-sm text-zinc-500 mb-2">Master Admin Notes</p>
                      <p className="text-zinc-300 whitespace-pre-wrap">{dealership.notes}</p>
                    </div>
                  )}

                  {subscription && (
                    <div className="mt-6 pt-6 border-t border-zinc-800">
                      <p className="text-sm text-zinc-500 mb-2">Subscription</p>
                      <div className="flex items-center space-x-4">
                        <Badge className="capitalize">{subscription.plan}</Badge>
                        <Badge variant="outline" className={
                          subscription.status === "active"
                            ? "border-green-500/20 text-green-500"
                            : "border-zinc-700"
                        }>
                          {subscription.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">API Keys</CardTitle>
              <CardDescription className="text-zinc-400">
                Manage dealership API keys and access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {apiKeys === undefined ? (
                <div className="text-center py-8 text-zinc-400">Loading...</div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No API keys found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Name</TableHead>
                      <TableHead className="text-zinc-400">Key</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Created</TableHead>
                      <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((apiKey) => (
                      <TableRow key={apiKey._id} className="border-zinc-800">
                        <TableCell className="text-zinc-100">{apiKey.name}</TableCell>
                        <TableCell className="font-mono text-xs text-zinc-400">
                          {apiKey.key.substring(0, 20)}...
                        </TableCell>
                        <TableCell>
                          {apiKey.isActive ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              Active
                            </Badge>
                          ) : (
                            <Badge className="bg-zinc-700 text-zinc-400">
                              Disabled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {formatDate(apiKey.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleApiKey(apiKey._id, !apiKey.isActive)}
                            className="text-zinc-400 hover:text-zinc-100"
                          >
                            {apiKey.isActive ? "Disable" : "Enable"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Verified Domains</CardTitle>
              <CardDescription className="text-zinc-400">
                Manage domain verification for this dealership
              </CardDescription>
            </CardHeader>
            <CardContent>
              {domains === undefined ? (
                <div className="text-center py-8 text-zinc-400">Loading...</div>
              ) : domains.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                  <p className="text-zinc-400">No domains found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-800">
                      <TableHead className="text-zinc-400">Domain</TableHead>
                      <TableHead className="text-zinc-400">Status</TableHead>
                      <TableHead className="text-zinc-400">Verified</TableHead>
                      <TableHead className="text-zinc-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {domains.map((domain) => (
                      <TableRow key={domain._id} className="border-zinc-800">
                        <TableCell className="text-zinc-100 font-mono text-sm">
                          {domain.domain}
                        </TableCell>
                        <TableCell>
                          {domain.status === "verified" ? (
                            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                              <Check className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          ) : domain.status === "pending" ? (
                            <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                              Pending
                            </Badge>
                          ) : (
                            <Badge className="bg-zinc-700 text-zinc-400">
                              {domain.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-400">
                          {domain.verifiedAt ? formatDate(domain.verifiedAt) : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          {domain.status !== "verified" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVerifyDomain(domain._id)}
                              className="text-green-500 hover:text-green-400"
                            >
                              Verify
                            </Button>
                          )}
                          {domain.status === "verified" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevokeDomain(domain._id)}
                              className="text-red-500 hover:text-red-400"
                            >
                              Revoke
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Users</CardTitle>
              <CardDescription className="text-zinc-400">
                All users in this dealership
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800">
                    <TableHead className="text-zinc-400">Name</TableHead>
                    <TableHead className="text-zinc-400">Email</TableHead>
                    <TableHead className="text-zinc-400">Role</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user._id} className="border-zinc-800">
                      <TableCell className="text-zinc-100">{user.name}</TableCell>
                      <TableCell className="text-zinc-400">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-zinc-700">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.isActive ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                            Active
                          </Badge>
                        ) : (
                          <Badge className="bg-zinc-700 text-zinc-400">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Communication</CardTitle>
              <CardDescription className="text-zinc-400">
                Send emails to dealership owners
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSendEmail}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email to Owners
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-zinc-100">Service Management</CardTitle>
              <CardDescription className="text-zinc-400">
                Control dealership access and services
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!dealership.isDeleted && (
                <div>
                  <Button
                    onClick={handleToggleSuspension}
                    variant={dealership.isSuspended ? "default" : "destructive"}
                    className={dealership.isSuspended ? "" : "bg-orange-600 hover:bg-orange-700"}
                  >
                    {dealership.isSuspended ? "Resume Services" : "Suspend Services"}
                  </Button>
                  <p className="text-sm text-zinc-500 mt-2">
                    {dealership.isSuspended
                      ? "Restore access to all dealership services"
                      : "Temporarily disable all dealership services"}
                  </p>
                </div>
              )}

              {dealership.isSuspended && dealership.suspensionReason && (
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4">
                  <p className="text-sm text-orange-500 font-medium">Suspension Reason:</p>
                  <p className="text-sm text-orange-400 mt-1">{dealership.suspensionReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {!dealership.isDeleted && (
            <Card className="bg-zinc-900 border-red-500/20">
              <CardHeader>
                <CardTitle className="text-red-500 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Danger Zone
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Irreversible and destructive actions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive">
                      Delete Dealership
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-zinc-900 border-zinc-800">
                    <DialogHeader>
                      <DialogTitle className="text-zinc-100">Confirm Deletion</DialogTitle>
                      <DialogDescription className="text-zinc-400">
                        Are you sure you want to delete this dealership? This action can be
                        undone from the dealership list, but will disable all services.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2 pt-4">
                      <Button onClick={handleDelete} variant="destructive">
                        Yes, Delete
                      </Button>
                      <Button variant="outline" className="border-zinc-700">
                        Cancel
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
