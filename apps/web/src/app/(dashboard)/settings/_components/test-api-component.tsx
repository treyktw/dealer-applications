"use client";

import { useState, useCallback, useMemo, useId } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  PlayCircle,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface TestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

export function TestApiComponent() {

  // Get current dealership
  const dealership = useQuery(api.dealerships.getCurrentDealership, {});
  const dealershipId = dealership?._id;

  // Fetch API keys
  const apiKeys = useQuery(
    api.api_keys.listApiKeys,
    dealershipId ? { dealershipId } : "skip"
  );

  // State
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [endpoint, setEndpoint] = useState<string>("/inventory");
  const [queryParams, setQueryParams] = useState<string>("page=1&limit=10");
  const [response, setResponse] = useState<TestResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const id = useId();

  // Get selected API key
  const selectedKey = useMemo(() => {
    if (!apiKeys || !selectedKeyId) return null;
    return apiKeys.find((key) => key.id === selectedKeyId);
  }, [apiKeys, selectedKeyId]);

  // Build full URL
  const fullUrl = useMemo(() => {
    if (!dealershipId) return "";
    
    const baseUrl = window.location.origin;
    const params = queryParams.trim() ? `?${queryParams}` : "";
    
    return `${baseUrl}/api/public/v1/dealerships/${dealershipId}${endpoint}${params}`;
  }, [dealershipId, endpoint, queryParams]);

  // Predefined endpoints
  const endpoints = useMemo(
    () => [
      {
        value: "/inventory",
        label: "List Inventory",
        description: "Get all vehicles",
        defaultParams: "page=1&limit=10",
      },
      {
        value: "/inventory/filters",
        label: "Get Filters",
        description: "Available filter options",
        defaultParams: "",
      },
      {
        value: "/inventory/{vehicleId}",
        label: "Get Vehicle",
        description: "Single vehicle details",
        defaultParams: "",
      },
      {
        value: "",
        label: "Dealership Info",
        description: "Public dealership data",
        defaultParams: "",
      },
    ],
    []
  );

  // Handle endpoint change
  const handleEndpointChange = useCallback(
    (value: string) => {
      setEndpoint(value);
      const selected = endpoints.find((e) => e.value === value);
      if (selected) {
        setQueryParams(selected.defaultParams);
      }
    },
    [endpoints]
  );

  // Execute test request
  const handleTestRequest = useCallback(async () => {
    if (!selectedKey) {
      toast.error("Please select an API key", {
        description: "Please select an API key",
      });
      return;
    }

    setIsLoading(true);
    setResponse(null);

    const startTime = performance.now();

    try {
      // Note: We need to get the actual key value somehow
      // For now, we'll use a placeholder - in production you'd need to handle this
      const testApiKey = prompt(
        "Enter your API key (this is needed for testing):"
      );

      if (!testApiKey) {
        setIsLoading(false);
        return;
      }

      const res = await fetch(fullUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": testApiKey,
        },
      });

      const duration = Math.round(performance.now() - startTime);

      // Parse response body
      let body: unknown;
      const contentType = res.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        body = await res.json();
      } else {
        body = await res.text();
      }

      // Extract important headers
      const headers: Record<string, string> = {};
      [
        "content-type",
        "cache-control",
        "x-ratelimit-limit",
        "x-ratelimit-remaining",
        "x-ratelimit-reset",
      ].forEach((header) => {
        const value = res.headers.get(header);
        if (value) {
          headers[header] = value;
        }
      });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers,
        body,
        duration,
      });

      toast.success("Request Complete", {
        description: `${res.status} ${res.statusText} (${duration}ms)`,
      });
    } catch (error: unknown) {
      toast.error("Request Failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });

      setResponse({
        status: 0,
        statusText: "Error",
        headers: {},
        body: { error: error instanceof Error ? error.message : "Unknown error" },
        duration: Math.round(performance.now() - startTime),
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedKey, fullUrl]);

  // Copy to clipboard
  const copyToClipboard = useCallback(
    (text: string, field: string) => {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);

      toast.success("Copied to clipboard", {
        description: "Copied to clipboard",
      });
    }, []);

  // Generate cURL command
  const curlCommand = useMemo(() => {
    if (!selectedKey) return "";

    return `curl -X GET "${fullUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY_HERE"`;
  }, [fullUrl, selectedKey]);

  if (!dealership) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex gap-2 items-center">
          <PlayCircle className="w-5 h-5" />
          Test API
        </CardTitle>
        <CardDescription>
          Test your public inventory API endpoints directly from the dashboard
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* API Key Selection */}
          <div className="space-y-2">
            <Label htmlFor="api-key">API Key</Label>
            {!apiKeys || apiKeys.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No API keys available. Generate one first.
              </div>
            ) : (
              <Select value={selectedKeyId} onValueChange={(value) => setSelectedKeyId(value as string)}>
                <SelectTrigger id={id}>
                  <SelectValue placeholder="Select API key" />
                </SelectTrigger>
                <SelectContent>
                  {apiKeys.map((key) => (
                    <SelectItem key={key.id} value={key.id}>
                      <div className="flex gap-2 items-center">
                        <span>{key.name}</span>
                        <Badge
                          variant={key.isActive ? "default" : "outline"}
                          className="text-xs"
                        >
                          {key.keyPrefix}...
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Endpoint Selection */}
          <div className="space-y-2">
            <Label htmlFor="endpoint">Endpoint</Label>
            <Select value={endpoint} onValueChange={handleEndpointChange}>
              <SelectTrigger id={id}>
                <SelectValue placeholder="Select endpoint" />
              </SelectTrigger>
              <SelectContent>
                {endpoints.map((ep) => (
                  <SelectItem key={ep.value} value={ep.value || "default_endpoint"}>
                    <div>
                      <div className="font-medium">{ep.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {ep.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Query Parameters */}
        <div className="space-y-2">
          <Label htmlFor="params">Query Parameters</Label>
          <Input
            id={id}
            placeholder="page=1&limit=10&make=Toyota"
            value={queryParams}
            onChange={(e) => setQueryParams(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Format: key=value&key2=value2 (no leading ?)
          </p>
        </div>

        {/* Full URL Display */}
        <div className="space-y-2">
          <Label>Full URL</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={fullUrl}
              className="font-mono text-xs"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(fullUrl, "url")}
            >
              {copiedField === "url" ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleTestRequest}
            disabled={isLoading || !selectedKeyId || !dealershipId}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 w-4 h-4" />
                Send Request
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => copyToClipboard(curlCommand, "curl")}
            disabled={!selectedKey}
          >
            {copiedField === "curl" ? (
              <Check className="mr-2 w-4 h-4" />
            ) : (
              <Copy className="mr-2 w-4 h-4" />
            )}
            Copy cURL
          </Button>
        </div>

        {/* Response Display */}
        {response && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium">Response</h4>
              <div className="flex gap-2 items-center">
                <Badge
                  variant={
                    response.status >= 200 && response.status < 300
                      ? "default"
                      : "destructive"
                  }
                >
                  {response.status} {response.statusText}
                </Badge>
                <Badge variant="outline">{response.duration}ms</Badge>
              </div>
            </div>

            {/* Response Headers */}
            {Object.keys(response.headers).length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Headers</Label>
                <div className="p-3 space-y-1 rounded-lg bg-muted">
                  {Object.entries(response.headers).map(([key, value]) => (
                    <div key={key} className="flex gap-2 font-mono text-xs">
                      <span className="text-muted-foreground">{key}:</span>
                      <span>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Response Body */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Body</Label>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(response.body, null, 2),
                      "body"
                    )
                  }
                >
                  {copiedField === "body" ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <Textarea
                readOnly
                value={JSON.stringify(response.body, null, 2)}
                className="font-mono text-xs min-h-[300px] max-h-[500px]"
              />
            </div>
          </div>
        )}

        {/* Info Alert */}
        {selectedKey && (
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1 text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Testing with {selectedKey.name}
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Rate Limit: {selectedKey.rateLimitPerHour}/hour
                  {selectedKey.rateLimitPerDay &&
                    ` (${selectedKey.rateLimitPerDay}/day)`}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}