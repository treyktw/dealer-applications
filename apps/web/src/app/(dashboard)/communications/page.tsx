"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Eye,
  MousePointerClick,
  Plus,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type EmailSend = Doc<"email_sends">;
type EmailStatus = EmailSend["status"];

function getStatusBadge(status: EmailStatus) {
  const statusConfig: Record<
    EmailStatus,
    { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
  > = {
    queued: { label: "Queued", variant: "secondary" },
    sent: { label: "Sent", variant: "default" },
    delivered: { label: "Delivered", variant: "default" },
    opened: { label: "Opened", variant: "default" },
    clicked: { label: "Clicked", variant: "default" },
    bounced: { label: "Bounced", variant: "destructive" },
    failed: { label: "Failed", variant: "destructive" },
  };

  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}

function getStatusIcon(status: EmailStatus) {
  switch (status) {
    case "delivered":
    case "opened":
    case "clicked":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "sent":
      return <Send className="w-4 h-4 text-blue-500" />;
    case "queued":
      return <Clock className="w-4 h-4 text-yellow-500" />;
    case "bounced":
    case "failed":
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Mail className="w-4 h-4 text-gray-500" />;
  }
}

export default function CommunicationsPage() {
  const { user } = useCurrentUser();
  const dealershipId = user?.dealershipId;

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch email history
  const emailHistory = useQuery(
    api.emailService.getEmailHistory,
    dealershipId
      ? {
          dealershipId: dealershipId as Id<"dealerships">,
          limit: 100,
        }
      : "skip"
  );

  // Calculate statistics
  const stats = useMemo(() => {
    if (!emailHistory) return null;

    const total = emailHistory.length;
    const sent = emailHistory.filter((e) => e.status === "sent").length;
    const delivered = emailHistory.filter((e) => e.status === "delivered").length;
    const opened = emailHistory.filter((e) => e.status === "opened").length;
    const clicked = emailHistory.filter((e) => e.status === "clicked").length;
    const failed = emailHistory.filter(
      (e) => e.status === "bounced" || e.status === "failed"
    ).length;
    const queued = emailHistory.filter((e) => e.status === "queued").length;

    // Calculate delivery rate
    const deliveryRate =
      total > 0 ? ((delivered / total) * 100).toFixed(1) : "0";
    // Calculate open rate
    const openRate = total > 0 ? ((opened / total) * 100).toFixed(1) : "0";
    // Calculate click rate
    const clickRate = total > 0 ? ((clicked / total) * 100).toFixed(1) : "0";

    return {
      total,
      sent,
      delivered,
      opened,
      clicked,
      failed,
      queued,
      deliveryRate,
      openRate,
      clickRate,
    };
  }, [emailHistory]);

  // Filter emails
  const filteredEmails = useMemo(() => {
    if (!emailHistory) return [];

    let filtered = [...emailHistory];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (email) =>
          email.subject.toLowerCase().includes(query) ||
          email.recipientEmail.toLowerCase().includes(query) ||
          email.fromName?.toLowerCase().includes(query) ||
          email.fromEmail?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((email) => email.status === statusFilter);
    }

    return filtered;
  }, [emailHistory, searchQuery, statusFilter]);

  // Format date
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  // Format full date
  const formatFullDate = (timestamp?: number) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (!dealershipId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Dealership Found</CardTitle>
            <CardDescription>
              Please ensure you are associated with a dealership.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (emailHistory === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-zinc-400">Loading email history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-100">Communications</h1>
          <p className="text-zinc-400 mt-2">
            View and manage all your email communications
          </p>
        </div>
        <Link href="/communications/email/b2c">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            New Email
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Total Emails
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">{stats.total}</div>
              <p className="text-xs text-zinc-500 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Delivery Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">
                {stats.deliveryRate}%
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.delivered} delivered
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Eye className="w-4 h-4 text-blue-500" />
                Open Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">
                {stats.openRate}%
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.opened} opened
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-purple-500" />
                Click Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">
                {stats.clickRate}%
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.clicked} clicked
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Additional Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Sent</p>
                  <p className="text-xl font-semibold text-zinc-100">{stats.sent}</p>
                </div>
                <Send className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Queued</p>
                  <p className="text-xl font-semibold text-zinc-100">
                    {stats.queued}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Failed</p>
                  <p className="text-xl font-semibold text-zinc-100">
                    {stats.failed}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Delivered</p>
                  <p className="text-xl font-semibold text-zinc-100">
                    {stats.delivered}
                  </p>
                </div>
                <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Email History</CardTitle>
          <CardDescription className="text-zinc-400">
            View and search through all sent emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="Search by subject, recipient, or sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-zinc-800 border-zinc-700 text-zinc-100">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="clicked">Clicked</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email Table */}
          {filteredEmails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400 text-lg font-medium">
                {emailHistory.length === 0
                  ? "No emails sent yet"
                  : "No emails match your filters"}
              </p>
              <p className="text-zinc-500 text-sm mt-2">
                {emailHistory.length === 0
                  ? "Start sending emails to see them here"
                  : "Try adjusting your search or filter criteria"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-zinc-800 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-800 hover:bg-zinc-800">
                    <TableHead className="text-zinc-300">Status</TableHead>
                    <TableHead className="text-zinc-300">Recipient</TableHead>
                    <TableHead className="text-zinc-300">Subject</TableHead>
                    <TableHead className="text-zinc-300">From</TableHead>
                    <TableHead className="text-zinc-300">Sent</TableHead>
                    <TableHead className="text-zinc-300">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmails.map((email) => (
                    <TableRow
                      key={email._id}
                      className="bg-zinc-900 border-zinc-800 hover:bg-zinc-800/50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(email.status)}
                          {getStatusBadge(email.status)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-zinc-100 font-medium">
                            {email.recipientEmail}
                          </span>
                          {email.recipientClientId && (
                            <span className="text-xs text-zinc-500">
                              Client ID: {email.recipientClientId.slice(-8)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="text-zinc-100 font-medium truncate">
                            {email.subject}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-zinc-100 text-sm">
                            {email.fromName}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {email.fromEmail}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-zinc-100 text-sm">
                            {formatDate(email.sentAt || email.createdAt)}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {formatFullDate(email.sentAt || email.createdAt)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-xs">
                          {email.deliveredAt && (
                            <span className="text-green-500">
                              Delivered: {formatDate(email.deliveredAt)}
                            </span>
                          )}
                          {email.openedAt && (
                            <span className="text-blue-500">
                              Opened: {formatDate(email.openedAt)}
                            </span>
                          )}
                          {email.clickedAt && (
                            <span className="text-purple-500">
                              Clicked: {formatDate(email.clickedAt)}
                            </span>
                          )}
                          {email.bouncedAt && (
                            <span className="text-red-500">
                              Bounced: {formatDate(email.bouncedAt)}
                            </span>
                          )}
                          {email.errorMessage && (
                            <span className="text-red-500 truncate max-w-[200px]">
                              Error: {email.errorMessage}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Results Count */}
          {filteredEmails.length > 0 && (
            <div className="mt-4 text-sm text-zinc-500">
              Showing {filteredEmails.length} of {emailHistory.length} emails
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

