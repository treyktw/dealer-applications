// apps/web/src/app/(dashboard)/communications/email/b2c/page.tsx
"use client";

import { useState, useId } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Send, Users, History } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Email preview component to handle HTML rendering
// This is safe because it's only used for previewing user-entered email content
function EmailPreview({ content }: { content: string }) {
  // Strip HTML tags for a simple text preview, or render as-is if needed
  // For now, we'll show a sanitized version
  const textContent = content.replace(/<[^>]*>/g, "").trim();
  
  return (
    <div className="text-sm text-gray-700 whitespace-pre-wrap">
      {textContent || content}
    </div>
  );
}

export default function B2CEmailPage() {
  const fromEmailId = useId();
  const fromNameId = useId();
  const replyToId = useId();
  const subjectId = useId();
  const messageId = useId();

  const [selectedClients, setSelectedClients] = useState<Id<"clients">[]>([]);
  const [subject, setSubject] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Get current user's dealership
  const { user } = useCurrentUser();
  const dealershipId = user?.dealershipId as Id<"dealerships"> | undefined;

  // Fetch clients for the dealership
  const clientsResult = useQuery(
    api.clients.listClients,
    dealershipId ? { dealershipId: dealershipId as string } : "skip"
  );
  
  const clients = clientsResult?.data || [];

  // Fetch email history
  const emailHistory = useQuery(
    api.emailService.getEmailHistory,
    dealershipId
      ? {
          dealershipId,
          limit: 20,
        }
      : "skip"
  );

  const sendToClients = useAction(api.emailService.sendToClients);

  const handleSelectClient = (clientId: Id<"clients">) => {
    if (selectedClients.includes(clientId)) {
      setSelectedClients(selectedClients.filter((id) => id !== clientId));
    } else {
      setSelectedClients([...selectedClients, clientId]);
    }
  };

  const handleSelectAll = () => {
    if (!clients || clients.length === 0) return;
    if (selectedClients.length === clients.length) {
      setSelectedClients([]);
    } else {
      setSelectedClients(clients.map((c) => c._id));
    }
  };

  const handleSend = async () => {
    if (!dealershipId) {
      toast.error("No dealership found. Please contact support.");
      return;
    }

    if (selectedClients.length === 0) {
      toast.error("Please select at least one client");
      return;
    }

    if (!subject || !htmlContent) {
      toast.error("Please fill in subject and message");
      return;
    }

    setIsSending(true);

    try {
      const result = await sendToClients({
        dealershipId,
        clientIds: selectedClients,
        subject,
        htmlContent,
        fromEmail: fromEmail || undefined,
        fromName: fromName || undefined,
        replyTo: replyTo || undefined,
      });

      toast.success(`Email sent to ${result.sent} clients`);

      // Reset form
      setSelectedClients([]);
      setSubject("");
      setHtmlContent("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send emails"
      );
    } finally {
      setIsSending(false);
    }
  };

  if (!dealershipId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Dealership Found
            </h3>
            <p className="text-gray-600 mb-4">
              Please contact support to associate your account with a dealership.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Email Your Clients (B2C)
        </h1>
        <p className="text-gray-600 mt-1">
          Send promotional emails, newsletters, or updates to your clients
        </p>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList>
          <TabsTrigger value="compose" className="flex items-center">
            <Mail className="w-4 h-4 mr-2" />
            Compose Email
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center">
            <History className="w-4 h-4 mr-2" />
            Email History
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recipients */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Select Recipients</CardTitle>
                <CardDescription>
                  Choose which clients will receive this email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedClients.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedClients.length === clients.length
                      ? "Deselect All"
                      : "Select All"}
                  </Button>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-2">
                  {clientsResult === undefined ? (
                    <p className="text-sm text-gray-600 text-center py-4">
                      Loading clients...
                    </p>
                  ) : clients.length === 0 ? (
                    <p className="text-sm text-gray-600 text-center py-4">
                      No clients found
                    </p>
                  ) : (
                    clients.map((client) => {
                      const clientName = `${client.firstName || ""} ${client.lastName || ""}`.trim() || client.email || "Unknown";
                      return (
                        <label
                          key={client._id}
                          className={`flex items-center space-x-2 p-2 rounded cursor-pointer hover:bg-gray-100 ${
                            selectedClients.includes(client._id)
                              ? "bg-blue-50 border border-blue-300"
                              : "border border-transparent"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedClients.includes(client._id)}
                            onChange={() => handleSelectClient(client._id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {clientName}
                            </p>
                            <p className="text-xs text-gray-600 truncate">
                              {client.email || "No email"}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Email Composer */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Compose Email</CardTitle>
                <CardDescription>
                  Write your email message to clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sender Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={fromEmailId}>From Email (Optional)</Label>
                    <Input
                      id={fromEmailId}
                      type="email"
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="sales@yourdealership.com"
                    />
                    <p className="text-xs text-gray-600">
                      Leave blank to use default
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={fromNameId}>From Name (Optional)</Label>
                    <Input
                      id={fromNameId}
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="Your Dealership"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={replyToId}>Reply To (Optional)</Label>
                  <Input
                    id={replyToId}
                    type="email"
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="contact@yourdealership.com"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor={subjectId}>Subject *</Label>
                  <Input
                    id={subjectId}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Special offer just for you!"
                    required
                  />
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor={messageId}>Message *</Label>
                  <Textarea
                    id={messageId}
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    placeholder="Write your email message here..."
                    rows={12}
                    required
                  />
                  <p className="text-xs text-gray-600">
                    You can use HTML for formatting. Variables: {"{"}
                    {"{"}clientName{"}"}{"}"}
                  </p>
                </div>

                {/* Preview */}
                {htmlContent && (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Preview
                    </h4>
                    <div className="bg-white border rounded p-4">
                      <p className="text-sm font-semibold mb-2">{subject || "(No subject)"}</p>
                      {/* Preview of HTML email content - safe as it's user-generated preview */}
                      <EmailPreview content={htmlContent} />
                    </div>
                  </div>
                )}

                {/* Send Button */}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    <Users className="w-4 h-4 inline mr-1" />
                    Sending to {selectedClients.length} recipient
                    {selectedClients.length !== 1 ? "s" : ""}
                  </div>
                  <Button
                    onClick={handleSend}
                    disabled={isSending || selectedClients.length === 0}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSending ? "Sending..." : "Send Email"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Email History</CardTitle>
              <CardDescription>
                Recent emails sent to your clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailHistory === undefined ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600">Loading...</p>
                </div>
              ) : emailHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    No emails sent yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {emailHistory.map((email) => (
                    <div
                      key={email._id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {email.subject}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            To: {email.recipientEmail}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(email.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge
                          variant={
                            email.status === "sent" ||
                            email.status === "delivered"
                              ? "default"
                              : email.status === "failed" ||
                                email.status === "bounced"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {email.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
