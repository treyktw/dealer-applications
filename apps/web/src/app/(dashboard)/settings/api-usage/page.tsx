"use client";

import { useMemo } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { TestApiComponent } from "../_components/test-api-component";

export default function ApiUsagePage() {
  // Get current dealership
  const dealership = useQuery(api.dealerships.getCurrentDealership, {});
  const dealershipId = dealership?._id;

  // Fetch API keys for context
  const apiKeys = useQuery(
    api.api_keys.listApiKeys,
    dealershipId ? { dealershipId } : "skip"
  );

  // Fetch security logs for API usage (last 30 days)
  const logs = useQuery(
    api.internal.getApiUsageLogs,
    dealershipId
      ? {
          dealershipId,
          startDate: startOfDay(subDays(new Date(), 30)).getTime(),
          endDate: endOfDay(new Date()).getTime(),
        }
      : "skip"
  );

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!logs || !apiKeys) {
      return {
        totalRequests: 0,
        requestsToday: 0,
        requestsThisWeek: 0,
        requestsThisMonth: 0,
        avgResponseTime: 0,
        errorRate: 0,
        topEndpoint: null,
        rateLimitHits: 0,
      };
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const totalRequests = logs.length;
    const requestsToday = logs.filter((log) => log.timestamp >= oneDayAgo).length;
    const requestsThisWeek = logs.filter((log) => log.timestamp >= oneWeekAgo).length;
    const requestsThisMonth = logs.filter((log) => log.timestamp >= oneMonthAgo).length;

    // Calculate average response time
    const responseTimes = logs
      .map((log) => {
        try {
          const details = JSON.parse(log.details || "{}");
          return details.responseTime || 0;
        } catch {
          return 0;
        }
      })
      .filter((time) => time > 0);

    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    // Calculate error rate
    const errors = logs.filter((log) => !log.success).length;
    const errorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;

    // Find top endpoint
    const endpointCounts: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.resource) {
        endpointCounts[log.resource] = (endpointCounts[log.resource] || 0) + 1;
      }
    });

    const topEndpoint = Object.entries(endpointCounts).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0];

    // Count rate limit hits
    const rateLimitHits = logs.filter(
      (log) => log.action === "public_api_rate_limited"
    ).length;

    return {
      totalRequests,
      requestsToday,
      requestsThisWeek,
      requestsThisMonth,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: errorRate.toFixed(2),
      topEndpoint,
      rateLimitHits,
    };
  }, [logs, apiKeys]);

  // Prepare chart data (requests per day for last 30 days)
  const chartData = useMemo(() => {
    if (!logs) return [];

    const dailyCounts: Record<string, number> = {};

    // Initialize all days in range
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "MMM dd");
      dailyCounts[date] = 0;
    }

    // Count requests per day
    logs.forEach((log) => {
      const date = format(new Date(log.timestamp), "MMM dd");
      if (dailyCounts[date] !== undefined) {
        dailyCounts[date]++;
      }
    });

    return Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      requests: count,
    }));
  }, [logs]);

  // Prepare endpoint usage data
  const endpointData = useMemo(() => {
    if (!logs) return [];

    const endpointCounts: Record<string, number> = {};

    logs.forEach((log) => {
      if (log.resource) {
        const endpoint = log.resource.split("?")[0]; // Remove query params
        endpointCounts[endpoint] = (endpointCounts[endpoint] || 0) + 1;
      }
    });

    return Object.entries(endpointCounts)
      .map(([endpoint, count]) => ({
        endpoint: endpoint.replace("/api/public/v1/", ""),
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 endpoints
  }, [logs]);

  // API key usage breakdown
  const keyUsage = useMemo(() => {
    if (!logs || !apiKeys) return [];

    const keyCounts: Record<string, number> = {};

    logs.forEach((log) => {
      try {
        const details = JSON.parse(log.details || "{}");
        const apiKeyId = details.apiKeyId;
        if (apiKeyId) {
          keyCounts[apiKeyId] = (keyCounts[apiKeyId] || 0) + 1;
        }
      } catch {
        // Ignore
      }
    });

    return apiKeys
      .map((key) => ({
        name: key.name,
        keyPrefix: key.keyPrefix,
        requests: keyCounts[key.id] || 0,
        limit: key.rateLimitPerHour || 0,
        percentage:
          key.rateLimitPerHour && keyCounts[key.id]
            ? Math.round((keyCounts[key.id] / key.rateLimitPerHour) * 100)
            : 0,
      }))
      .sort((a, b) => b.requests - a.requests);
  }, [logs, apiKeys]);

  if (!dealership) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Usage</h1>
        <p className="mt-2 text-muted-foreground">
          Monitor your public inventory API usage and performance
        </p>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row justify-between items-center pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalRequests.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.requestsToday.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.requestsThisWeek.toLocaleString()} this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Across all endpoints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.errorRate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.rateLimitHits} rate limit hits
            </p>
          </CardContent>
        </Card>
      </div>

      <TestApiComponent />

      {/* Requests Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Requests Over Time</CardTitle>
          <CardDescription>
            Daily API requests for the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="requests"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Endpoints */}
        <Card>
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <BarChart3 className="w-5 h-5" />
              Top Endpoints
            </CardTitle>
            <CardDescription>
              Most frequently accessed API endpoints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300} className="flex w-full h-full">
              <BarChart data={endpointData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  dataKey="endpoint"
                  type="category"
                  width={150}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* API Key Usage */}
        <Card>
          <CardHeader>
            <CardTitle>API Key Usage</CardTitle>
            <CardDescription>
              Requests per API key in the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {keyUsage.length === 0 ? (
              <div className="py-12 text-center">
                <AlertCircle className="mx-auto mb-4 w-12 h-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No API usage data available
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key Name</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">% of Limit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keyUsage.map((key) => (
                    <TableRow key={key.keyPrefix}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{key.name}</div>
                          <code className="text-xs text-muted-foreground">
                            {key.keyPrefix}...
                          </code>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {key.requests.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            key.percentage >= 80
                              ? "destructive"
                              : key.percentage >= 60
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {key.percentage}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limit Status</CardTitle>
          <CardDescription>
            Current rate limits for your active API keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!apiKeys || apiKeys.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                No active API keys. Generate a key to start tracking usage.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key Name</TableHead>
                  <TableHead>Environment</TableHead>
                  <TableHead className="text-right">Hourly Limit</TableHead>
                  <TableHead className="text-right">Daily Limit</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
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
                    <TableCell className="text-right">
                      {key.rateLimitPerHour?.toLocaleString() || "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      {key.rateLimitPerDay?.toLocaleString() || "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={key.isActive ? "default" : "outline"}>
                        {key.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}