"use client";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function QuickStatsWidget() {
  const inventoryStats = useQuery(api.inventory.getStats, {});
  const clientStats = useQuery(api.clients.getStats, {});
  // Add more queries as needed for sales/leads
  const isLoading = inventoryStats === undefined || clientStats === undefined;
  if (isLoading) {
    return <div className="grid grid-cols-2 gap-4 animate-pulse">{Array(4).fill(0).map((_, i) => <div key={i} className="h-12 bg-muted rounded" />)}</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-muted-foreground">Total Vehicles</p>
        <p className="text-2xl font-bold font-mono">{inventoryStats?.totalVehicles ?? 0}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Active Clients</p>
        <p className="text-2xl font-bold font-mono">{clientStats?.activeClients ?? 0}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Recent Sales</p>
        <p className="text-2xl font-bold font-mono">{inventoryStats?.recentSales ?? 0}</p>
      </div>
      <div>
        <p className="text-muted-foreground">Leads This Month</p>
        <p className="text-2xl font-bold font-mono">{clientStats?.leadsThisMonth ?? 0}</p>
      </div>
    </div>
  );
} 