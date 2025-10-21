"use client";

import { useState, useCallback, useMemo, useId } from "react";
import { useQuery, useMutation } from "convex/react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function ApiKeysPage() {
  // Get current dealership
  const dealership = useQuery(api.dealerships.getCurrentDealership, {});
  const dealershipId = dealership?._id;

  // Fetch API keys
  const apiKeys = useQuery(
    api.api_keys.listApiKeys,
    dealershipId ? { dealershipId } : "skip"
  );

  // State
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<Id<"api_keys"> | null>(null);
  const [generatedKey, setGeneratedKey] = useState<{
    key: string;
    keyPrefix: string;
  } | null>(null);
  const [showFullKey, setShowFullKey] = useState(false);
  const [showDealershipIdDialog, setShowDealershipIdDialog] = useState(false);
  const [revealedDealershipId, setRevealedDealershipId] = useState(false);
  const [verificationApiKey, setVerificationApiKey] = useState("");
  const verifyApiKeyInputId = useId();

  // Mutations
  const generateKey = useMutation(api.api_keys.generateApiKey);
  const revokeKey = useMutation(api.api_keys.revokeApiKey);

  // Handler to verify API key and reveal dealership ID
  const handleRevealDealershipId = useCallback(async () => {
    if (!verificationApiKey.trim() || !dealershipId) {
      toast.error("Invalid Input", {
        description: "Please enter a valid API key",
      });
      return;
    }

    // Check if the entered key matches any of the user's keys
    const matchingKey = apiKeys?.find(
      (key) =>
        key.status === "active" &&
        verificationApiKey.startsWith(key.keyPrefix)
    );

    if (!matchingKey) {
      toast.error("Invalid API Key", {
        description: "The provided API key is not valid or has been revoked",
      });
      return;
    }

    // Reveal the dealership ID
    setRevealedDealershipId(true);
    toast.success("Dealership ID Revealed", {
      description: "You can now view your dealership ID",
    });
  }, [verificationApiKey, dealershipId, apiKeys]);

  const handleCloseDealershipIdDialog = useCallback(() => {
    setShowDealershipIdDialog(false);
    setRevealedDealershipId(false);
    setVerificationApiKey("");
  }, []);

  // Handlers
  const handleGenerateKey = useCallback(
    async (data: { name: string; environment: "production" | "test" }) => {
      if (!dealershipId) return;

      try {
        const result = await generateKey({
          dealershipId,
          name: data.name,
          environment: data.environment,
        });

        setGeneratedKey({
          key: result.key,
          keyPrefix: result.keyPrefix,
        });

        toast.success("API Key Generated", {
          description: "Copy your key now. You won't be able to see it again.",
        });
      } catch (error) {
        toast.error("Failed to generate API key", {
          description:
            error instanceof Error
              ? error.message
              : "Failed to generate API key",
        });
      }
    },
    [dealershipId, generateKey]
  );

  const handleRevokeKey = useCallback(async () => {
    if (!keyToRevoke) return;

    try {
      await revokeKey({ apiKeyId: keyToRevoke });

      toast.success("API Key Revoked", {
        description: "The API key has been revoked successfully.",
      });
    } catch (error) {
      toast.error("Failed to revoke API key", {
        description:
          error instanceof Error ? error.message : "Failed to revoke API key",
      });
    }
  }, [keyToRevoke, revokeKey]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard", {
      description: "API key copied to clipboard",
    });
  }, []);

  const sortedKeys = useMemo(() => {
    if (!apiKeys) return [];
    return [...apiKeys].sort((a, b) => b.createdAt - a.createdAt);
  }, [apiKeys]);

  if (!dealership) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
        <p className="mt-2 text-muted-foreground">
          Manage API keys for accessing your inventory data from external
          websites
        </p>
      </div>

      {/* Dealership ID - Secured */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dealership ID</CardTitle>
          <CardDescription>
            Required for API integration - verify with an API key to reveal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-center">
            <div className="flex-1 p-3 font-mono text-sm rounded-md bg-muted">
              ••••••••••••••••••••
            </div>
            <Button
              variant="outline"
              onClick={() => setShowDealershipIdDialog(true)}
            >
              <Eye className="mr-2 w-4 h-4" />
              Reveal
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Create and manage API keys for your dealership
              </CardDescription>
            </div>
            <Button onClick={() => setIsGenerateDialogOpen(true)}>
              <Plus className="mr-2 w-4 h-4" />
              Generate Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sortedKeys.length === 0 ? (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-medium">No API Keys</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Generate your first API key to start accessing your inventory
                data
              </p>
              <Button onClick={() => setIsGenerateDialogOpen(true)}>
                <Plus className="mr-2 w-4 h-4" />
                Generate Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <code className="px-2 py-1 text-xs rounded bg-muted">
                        {key.keyPrefix}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          key.keyPrefix.startsWith("sk_live")
                            ? "default"
                            : "secondary"
                        }
                      >
                        {key.keyPrefix.startsWith("sk_live")
                          ? "Production"
                          : "Test"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.isActive ? "default" : "destructive"}>
                        {key.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {key.requestCount?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.rateLimitPerHour}/hr
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.lastUsedAt
                        ? formatDistanceToNow(key.lastUsedAt, {
                            addSuffix: true,
                          })
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setKeyToRevoke(key.id)}
                        disabled={!key.isActive}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Key Dialog */}
      <GenerateKeyDialog
        open={isGenerateDialogOpen}
        onOpenChange={setIsGenerateDialogOpen}
        onGenerate={handleGenerateKey}
      />

      {/* Show Generated Key Dialog */}
      {generatedKey && (
        <Dialog
          open={!!generatedKey}
          onOpenChange={() => setGeneratedKey(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>API Key Generated</DialogTitle>
              <DialogDescription>
                Copy your API key now. For security reasons, you won&apos;t be able
                to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Input
                    readOnly
                    type={showFullKey ? "text" : "password"}
                    value={generatedKey.key}
                    className="pr-20 font-mono text-sm"
                  />
                  <div className="flex absolute right-2 top-1/2 gap-1 -translate-y-1/2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowFullKey(!showFullKey)}
                    >
                      {showFullKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(generatedKey.key)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Important:</strong> Store this key securely. It
                  won&apos;t be shown again.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setGeneratedKey(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={!!keyToRevoke}
        onOpenChange={() => setKeyToRevoke(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately stop all requests using this API key. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeKey}>
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reveal Dealership ID Dialog */}
      <Dialog
        open={showDealershipIdDialog}
        onOpenChange={handleCloseDealershipIdDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reveal Dealership ID</DialogTitle>
            <DialogDescription>
              Enter one of your active API keys to verify your identity and
              reveal your dealership ID.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!revealedDealershipId ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor={verifyApiKeyInputId}>API Key</Label>
                  <Input
                    id={verifyApiKeyInputId}
                    type="password"
                    placeholder="Enter your API key"
                    value={verificationApiKey}
                    onChange={(e) => setVerificationApiKey(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleRevealDealershipId();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    This verification ensures only authorized users can view the
                    dealership ID
                  </p>
                </div>
                <Button
                  onClick={handleRevealDealershipId}
                  className="w-full"
                  disabled={!verificationApiKey.trim()}
                >
                  <Eye className="mr-2 w-4 h-4" />
                  Verify & Reveal
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Dealership ID</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={dealershipId || ""}
                      className="font-mono text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(dealershipId || "");
                        toast.success("Copied!", {
                          description: "Dealership ID copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
                  <p className="text-xs text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Use this ID when making API requests
                    to identify your dealership.
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDealershipIdDialog}>
              {revealedDealershipId ? "Close" : "Cancel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Generate Key Dialog Component
function GenerateKeyDialog({
  open,
  onOpenChange,
  onGenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (data: {
    name: string;
    environment: "production" | "test";
  }) => void;
}) {
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<"production" | "test">(
    "production"
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;

      onGenerate({ name: name.trim(), environment });

      // Reset form
      setName("");
      setEnvironment("production");
      onOpenChange(false);
    },
    [name, environment, onGenerate, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for accessing your inventory data
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Key Name</Label>
            <Input
              id={useId()}
              placeholder="e.g., Main Website"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="environment">Environment</Label>
            <select
              id={useId()}
              className="flex px-3 py-2 w-full h-10 text-sm rounded-md border border-input bg-background ring-offset-background"
              value={environment}
              onChange={(e) =>
                setEnvironment(e.target.value as "production" | "test")
              }
            >
              <option value="production">Production</option>
              <option value="test">Test</option>
            </select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Generate Key</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
