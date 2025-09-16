// src/app/(dashboard)/settings/ip-management/page.tsx
"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useIPManagement } from "@/hooks/useIPManagement";

export default function IPManagementPage() {
  const [newIP, setNewIP] = useState("");
  const [newIPDescription, setNewIPDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const {
    allowedIPs,
    currentIP,
    addIP,
    removeIP,
    ipCheckEnabled,
  } = useIPManagement();

  // Function to add a new IP
  const handleAddIP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIP) {
      toast("Error", { description: "Please enter an IP address." });
      return;
    }
    try {
      setSubmitting(true);
      await addIP(newIP, newIPDescription);
      toast("Success", { description: "IP address added successfully." });
      setNewIP("");
      setNewIPDescription("");
    } catch (error: unknown) {
      toast("Error", { description: error instanceof Error ? error.message : "Failed to add IP address. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  // Function to delete an IP
  const handleDeleteIP = async (ip: string) => {
    if (!confirm("Are you sure you want to remove this IP address?")) return;
    try {
      await removeIP(ip);
      toast("Success", { description: "IP address removed successfully." });
    } catch (error: unknown) {
      toast("Error", { description: error instanceof Error ? error.message : "Failed to remove IP address. Please try again." });
    }
  };

  // Function to add current IP
  const addCurrentIP = () => {
    if (currentIP) {
      setNewIP(currentIP);
      setNewIPDescription("My current IP address");
      document.getElementById("ip-form")?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">IP Access Management</h1>
        <p className="text-muted-foreground mt-1">
          Control which IP addresses can access the admin area
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Add new IP */}
        <Card>
          <CardHeader>
            <CardTitle>Add Authorized IP</CardTitle>
            <CardDescription>
              Add new IP addresses that should have access to the admin area
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="ip-form" onSubmit={handleAddIP} className="space-y-4">
              <div>
                <label htmlFor="ip" className="text-sm font-medium block mb-1">
                  IP Address
                </label>
                <Input
                  id="ip"
                  placeholder="e.g., 192.168.1.1"
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="text-sm font-medium block mb-1">
                  Description (Optional)
                </label>
                <Input
                  id="description"
                  placeholder="e.g., Office Network"
                  value={newIPDescription}
                  onChange={(e) => setNewIPDescription(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={submitting}>
                <Plus className="mr-2 h-4 w-4" />
                {submitting ? "Adding..." : "Add IP Address"}
              </Button>
            </form>
          </CardContent>
        </Card>
        {/* Current status */}
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
            <CardDescription>
              Information about your current IP access settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md bg-muted p-4">
              <div className="flex">
                <Shield className="h-5 w-5 text-primary mr-2" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium">IP Restriction Status</h3>
                  <p className="text-sm text-muted-foreground">
                    {ipCheckEnabled
                      ? "IP restrictions are enabled"
                      : "IP restrictions are disabled"}
                  </p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium mb-2">Your Current IP</h3>
              <div className="text-sm font-mono bg-muted p-2 rounded flex justify-between items-center">
                {currentIP || (
                  <span className="text-muted-foreground">Detecting...</span>
                )}
                {currentIP && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={addCurrentIP}
                    className="ml-2"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                If you&apos;re using a proxy or VPN, the detected IP may differ from your actual IP.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Authorized IPs list */}
      <Card>
        <CardHeader>
          <CardTitle>Authorized IP Addresses</CardTitle>
          <CardDescription>
            IP addresses that are allowed to access the admin area
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allowedIPs === undefined ? (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading IP addresses...</p>
            </div>
          ) : allowedIPs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No authorized IP addresses found.</p>
              <p className="text-sm mt-1">
                Add IP addresses above to restrict admin access.
              </p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left">IP Address</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Added On</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allowedIPs.map((ip) => (
                    <tr key={ip._id} className="border-b">
                      <td className="px-4 py-3 font-mono">{ip.ip}</td>
                      <td className="px-4 py-3">{ip.description || "—"}</td>
                      <td className="px-4 py-3">{new Date(ip.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteIP(ip.ip)}
                          className="text-destructive hover:text-destructive/90"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Important notes */}
      <Card>
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <h3 className="text-sm font-medium mb-2">Caution with IP Restrictions</h3>
            <p className="text-sm text-muted-foreground">
              Be careful when removing IP addresses. If you remove your current IP and don&apos;t have another
              authorized IP, you may lock yourself out of the admin area.
            </p>
          </div>
          <div className="rounded-md bg-muted p-4">
            <h3 className="text-sm font-medium mb-2">IP Addresses vs. Network Ranges</h3>
            <p className="text-sm text-muted-foreground">
              This system currently supports individual IP addresses only. If you need to authorize 
              entire network ranges (e.g., 192.168.1.0/24), contact your system administrator.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}