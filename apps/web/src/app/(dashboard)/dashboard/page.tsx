'use client'

// src/app/(dashboard)/dashboard/page.tsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import InventoryStatsWidget from "../inventory/_components/inventory-stats-widget";
import { useConvexAuth, useQuery } from "convex/react";
import QuickStatsWidget from "./QuickStatsWidget";
import { api } from "@/convex/_generated/api";

export default function DashboardPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }
  if (!isAuthenticated) {
    return <div className="flex justify-center items-center h-64">You must be signed in to view the dashboard.</div>;
  }
  if (currentUser === undefined) {
    return <div className="flex justify-center items-center h-64">Loading user info...</div>;
  }
  if (!currentUser || !currentUser.dealershipId) {
    return <div className="flex justify-center items-center h-64">No dealership associated with your account.</div>;
  }
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your dealership admin dashboard
        </p>
      </div>

      <div className="mb-8">
        <InventoryStatsWidget />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>
              Manage your vehicle inventory
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/inventory">View Inventory</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clients</CardTitle>
            <CardDescription>
              Manage your client database
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/clients">View Clients</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Deals</CardTitle>
            <CardDescription>
              Manage Your Deals
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/deals">View Your Deals</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">No recent activity</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <QuickStatsWidget />
          </CardContent>
        </Card>
      </div>
    </>
  );
}