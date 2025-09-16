"use client";


import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Car,
  DollarSign,
  Tag,
  BarChart
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";


export default function InventoryStatsWidget() {
  const stats = useQuery(api.inventory.getStats, {});
  const isLoading = stats === undefined;

  if (isLoading || !stats) {
    return (
      <Card className="col-span-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Inventory Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="space-y-2 animate-pulse">
                <div className="h-5 w-24 bg-muted rounded"></div>
                <div className="h-8 w-16 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Inventory Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatItem
            title="Total Vehicles"
            value={stats.totalVehicles}
            icon={<Car className="h-4 w-4" />}
            change={stats.inventoryChange}
            changeSuffix="%"
            changeLabel="from last month"
          />
          
          <StatItem
            title="Inventory Value"
            value={formatCurrency(stats.totalValue)}
            icon={<DollarSign className="h-4 w-4" />}
          />
          
          <StatItem
            title="Status Breakdown"
            customContent={
              <div className="flex flex-wrap gap-1.5 mt-1">
                <Badge variant="default">{stats.availableVehicles} Available</Badge>
                <Badge variant="secondary">{stats.pendingVehicles} Pending</Badge>
                <Badge variant="outline">{stats.soldVehicles} Sold</Badge>
                <Badge variant="destructive">{stats.reservedVehicles} Reserved</Badge>
              </div>
            }
            icon={<Tag className="h-4 w-4" />}
          />
          
          <StatItem
            title="Top Make"
            value={`${stats.topMake} (${stats.topMakeCount})`}
            icon={<BarChart className="h-4 w-4" />}
            subvalue={`Average: ${formatCurrency(stats.avgPrice)}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface StatItemProps {
  title: string;
  value?: React.ReactNode;
  subvalue?: string;
  icon: React.ReactNode;
  change?: number;
  changeLabel?: string;
  changeSuffix?: string;
  customContent?: React.ReactNode;
}

function StatItem({ 
  title, 
  value, 
  subvalue,
  icon, 
  change, 
  changeLabel = "change",
  changeSuffix = "",
  customContent 
}: StatItemProps) {
  const isPositive = (change || 0) >= 0;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <div className="text-muted-foreground">{icon}</div>
        <span className="text-sm text-muted-foreground">{title}</span>
      </div>
      
      {value && <div className="text-2xl font-bold">{value}</div>}
      
      {subvalue && (
        <div className="text-sm text-muted-foreground">{subvalue}</div>
      )}
      
      {customContent}
      
      {change !== undefined && (
        <div className="flex items-center text-xs">
          <Badge variant="outline" className={
            isPositive ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : 
                       "text-red-500 border-red-500/20 bg-red-500/10"
          }>
            {isPositive ? 
              <TrendingUp className="h-3 w-3 mr-1" /> : 
              <TrendingDown className="h-3 w-3 mr-1" />
            }
            {Math.abs(change)}{changeSuffix}
          </Badge>
          {changeLabel && <span className="ml-1 text-muted-foreground">{changeLabel}</span>}
        </div>
      )}
    </div>
  );
}