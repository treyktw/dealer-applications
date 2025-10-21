"use client";

import { useState, useCallback, useMemo, useId } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Copy,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns"; 

interface VerifiedDomain {
  _id: Id<"verifiedDomains">;
  domain: string;
  verificationToken: string;
  status: "verified" | "failed" | "pending" | "revoked";
  lastCheckedAt?: number;
  verificationAttempts: number;
  verifiedAt?: number;
  createdAt: number;
}

export default function DomainsPage() {
  // Get current dealership
  const dealership = useQuery(api.dealerships.getCurrentDealership, {});
  const dealershipId = dealership?._id;

  // Fetch domains
  const domains = useQuery(
    api.domain_verification.listDomainsForDealership,
    dealershipId ? { dealershipId } : "skip"
  );

  // State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedDomainId, setSelectedDomainId] =
    useState<Id<"verifiedDomains"> | null>(null);
  const [isVerifying, setIsVerifying] = useState<Id<"verifiedDomains"> | null>(
    null
  );

  // Mutations
  const createDomain = useMutation(
    api.domain_verification.createDomainVerification
  );
  const verifyDomain = useAction(api.domain_verification.verifyDomain);

  // Handlers
  const handleAddDomain = useCallback(
    async (domain: string) => {
      if (!dealershipId) return;

      try {
        const result = await createDomain({
          dealershipId,
          domain: domain.toLowerCase().trim(),
        });

        setSelectedDomainId(result.domainId);
        setIsAddDialogOpen(false);

        toast.success("Domain Added", {
          description: "Follow the instructions to verify your domain",
        });
      } catch (error) {
        toast.error("Failed to add domain", {
          description:
            error instanceof Error ? error.message : "Failed to add domain",
        });
      }
    },
    [dealershipId, createDomain]
  );

  const handleVerifyDomain = useCallback(
    async (domainId: Id<"verifiedDomains">) => {
      setIsVerifying(domainId);

      try {
        const result = await verifyDomain({ domainId });

        if (result.success) {
          toast.success("Domain Verified!", {
            description: result.message,
          });
          setSelectedDomainId(null);
        } else {
          toast.error("Verification Failed", {
            description: result.error,
          });
        }
      } catch (error) {
        toast.error("Failed to verify domain", {
          description:
            error instanceof Error ? error.message : "Failed to verify domain",
        });
      } finally {
        setIsVerifying(null);
      }
    },
    [verifyDomain]
  );

  const handleDownloadVerificationFile = useCallback(
    (token: string, domain: string) => {
      const blob = new Blob([token], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "uab-verify.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("File Downloaded", {
        description: `Upload uab-verify.txt to ${domain}/.well-known/`,
      });
    },
    []
  );

  const copyToken = useCallback((token: string) => {
    navigator.clipboard.writeText(token);
    toast.success("Token Copied", {
      description: "Verification token copied to clipboard",
    });
  }, []);

  const sortedDomains = useMemo(() => {
    if (!domains) return [];
    return [...domains].sort((a, b) => {
      // Verified first, then by creation date
      if (a.status === "verified" && b.status !== "verified") return -1;
      if (a.status !== "verified" && b.status === "verified") return 1;
      return b.createdAt - a.createdAt;
    });
  }, [domains]);

  if (!dealership) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Domain Verification
        </h1>
        <p className="mt-2 text-muted-foreground">
          Verify domains to allow CORS access to your inventory API
        </p>
      </div>

      {/* Instructions Card */}
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertTitle>How Domain Verification Works</AlertTitle>
        <AlertDescription>
          <ol className="mt-2 space-y-1 text-sm list-decimal list-inside">
            <li>Add your domain (e.g., example-dealer.com)</li>
            <li>Download the verification file</li>
            <li>
              Upload it to your website at{" "}
              <code className="bg-muted px-1 py-0.5 rounded">
                /.well-known/uab-verify.txt
              </code>
            </li>
            <li>Click &quot;Verify&quot; to confirm ownership</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Verified Domains</CardTitle>
              <CardDescription>
                Manage domains that can access your inventory API
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 w-4 h-4" />
              Add Domain
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedDomains.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No Domains Added</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Add your website domain to enable API access
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="mr-2 w-4 h-4" />
                Add Domain
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification Method</TableHead>
                  <TableHead>Last Checked</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDomains.map((domain) => (
                  <TableRow key={domain._id}>
                    <TableCell className="font-medium">
                      <div className="flex gap-2 items-center">
                        {domain.status === "verified" && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {domain.status === "failed" && (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        {domain.status === "pending" && (
                          <Clock className="w-4 h-4 text-yellow-600" />
                        )}
                        {domain.domain}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          domain.status === "verified"
                            ? "default"
                            : domain.status === "failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {domain.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">HTTP File</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {domain.lastCheckedAt
                        ? formatDistanceToNow(domain.lastCheckedAt, {
                            addSuffix: true,
                          })
                        : "Never"}
                    </TableCell>
                    <TableCell>{domain.verificationAttempts || 0}/5</TableCell>
                    <TableCell className="space-x-2 text-right">
                      {domain.status !== "verified" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDownloadVerificationFile(
                                domain.verificationToken,
                                domain.domain
                              )
                            }
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleVerifyDomain(domain._id)}
                            disabled={
                              isVerifying === domain._id ||
                              domain.verificationAttempts >= 5
                            }
                          >
                            {isVerifying === domain._id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </Button>
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDomainId(domain._id)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <AddDomainDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onAdd={handleAddDomain}
      />

      {/* Domain Details Dialog */}
      {selectedDomainId && (
        <DomainDetailsDialog
          domainId={selectedDomainId}
          domains={sortedDomains}
          onClose={() => setSelectedDomainId(null)}
          onVerify={() => handleVerifyDomain(selectedDomainId)}
          onDownload={(token, domain) =>
            handleDownloadVerificationFile(token, domain)
          }
          onCopyToken={copyToken}
          isVerifying={isVerifying === selectedDomainId}
        />
      )}
    </div>
  );
}

// Add Domain Dialog
function AddDomainDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (domain: string) => void;
}) {
  const [domain, setDomain] = useState("");

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!domain.trim()) return;

      // Remove protocol if provided
      let cleanDomain = domain.trim().toLowerCase();
      cleanDomain = cleanDomain.replace(/^https?:\/\//, "");
      cleanDomain = cleanDomain.replace(/\/$/, "");

      onAdd(cleanDomain);
      setDomain("");
    },
    [domain, onAdd]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Domain</DialogTitle>
          <DialogDescription>
            Enter your website domain to verify ownership
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="domain">Domain</Label>
            <Input
              id={useId()}
              placeholder="example-dealer.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Don&apos;t include http:// or https://
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Add Domain</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Domain Details Dialog
function DomainDetailsDialog({
  domainId,
  domains,
  onClose,
  onVerify,
  onDownload,
  onCopyToken,
  isVerifying,
}: {
  domainId: Id<"verifiedDomains">;
  domains: VerifiedDomain[];
  onClose: () => void;
  onVerify: () => void;
  onDownload: (token: string, domain: string) => void;
  onCopyToken: (token: string) => void;
  isVerifying: boolean;
}) {
  const domain = domains.find((d) => d._id === domainId);
  
  if (!domain) return null;
  return (
    <Dialog open={!!domain} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Domain Verification</DialogTitle>
          <DialogDescription>{domain.domain}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status */}
          <div>
            <Label>Status</Label>
            <div className="mt-2">
              <Badge
                variant={
                  domain.status === "verified"
                    ? "default"
                    : domain.status === "failed"
                      ? "destructive"
                      : "secondary"
                }
              >
                {domain.status}
              </Badge>
            </div>
          </div>

          {/* Verification Instructions */}
          {domain.status !== "verified" && (
            <>
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertTitle>Verification Steps</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <ol className="space-y-1 text-sm list-decimal list-inside">
                    <li>Download the verification file below</li>
                    <li>
                      Upload it to your website at:
                      <br />
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">
                        https://{domain.domain}/.well-known/uab-verify.txt
                      </code>
                    </li>
                    <li>Click &quot;Verify Domain&quot; to confirm</li>
                  </ol>
                </AlertDescription>
              </Alert>

              {/* Verification Token */}
              <div className="space-y-2">
                <Label>Verification Token</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={domain.verificationToken}
                    className="font-mono text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={() => onCopyToken(domain.verificationToken)}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => onDownload(domain.verificationToken, domain.domain)}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="mr-2 w-4 h-4" />
                  Download File
                </Button>
                <Button
                  onClick={onVerify}
                  disabled={isVerifying || domain.verificationAttempts >= 5}
                  className="flex-1"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="mr-2 w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 w-4 h-4" />
                      Verify Domain
                    </>
                  )}
                </Button>
              </div>

              {domain.verificationAttempts >= 5 && (
                <Alert variant="destructive">
                  <AlertCircle className="w-4 h-4" />
                  <AlertTitle>Too Many Attempts</AlertTitle>
                  <AlertDescription>
                    You&apos;ve reached the maximum verification attempts. Please
                    contact support.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          {/* Verified Status */}
          {domain.status === "verified" && (
            <Alert>
              <CheckCircle className="w-4 h-4" />
              <AlertTitle>Domain Verified</AlertTitle>
              <AlertDescription>
                This domain is verified and can access your inventory API.
                {domain.verifiedAt && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Verified{" "}
                    {formatDistanceToNow(domain.verifiedAt, { addSuffix: true })}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
