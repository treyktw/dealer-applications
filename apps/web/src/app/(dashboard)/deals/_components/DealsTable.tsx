// app/(dashboard)/deals/_components/DealsTable.tsx
"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Search,
  Filter,
  FileText,
  Car,
  User,
  Link2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { DealStatus } from "@/types/documents";
import type { Client } from "@/types/client";
import type { Vehicle } from "@/types/vehicle";
import { useQuery as useConvexQuery } from "convex/react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

// Extended Deal type with relations
interface DealWithRelations extends Doc<"deals"> {
  id: string;
  totalAmount: number;
  status: string;
  client?: Client | null;
  vehicle?: Vehicle | null;
}

// Helper to map Convex client to frontend Client type
function mapConvexClientToClient(convexClient: Doc<"clients">): Client {
  return {
    id: String(convexClient._id),
    firstName: convexClient.firstName ?? "",
    lastName: convexClient.lastName ?? "",
    email: convexClient.email ?? null,
    phone: convexClient.phone ?? null,
    address: convexClient.address ?? null,
    city: convexClient.city ?? null,
    state: convexClient.state ?? null,
    zipCode: convexClient.zipCode ?? null,
    source: convexClient.source ?? null,
    status: convexClient.status ?? "LEAD",
    notes: convexClient.notes ?? null,
    createdAt: convexClient.createdAt ? String(convexClient.createdAt) : "",
    updatedAt: convexClient.updatedAt ? String(convexClient.updatedAt) : "",
    dealershipId: convexClient.dealershipId ?? "",
  };
}

// Helper to map Convex vehicle to frontend Vehicle type
function mapConvexVehicleToVehicle(convexVehicle: Doc<"vehicles">): Vehicle {
  return {
    id: String(convexVehicle._id),
    make: convexVehicle.make ?? "",
    model: convexVehicle.model ?? "",
    year: convexVehicle.year ?? 0,
    price: convexVehicle.price ?? 0,
    status: (convexVehicle.status?.toLowerCase?.() ??
      "available") as Vehicle["status"],
    vin: convexVehicle.vin ?? "",
    stock: convexVehicle.stock ?? "",
    mileage: convexVehicle.mileage ?? 0,
    exteriorColor: convexVehicle.exteriorColor ?? null,
    interiorColor: convexVehicle.interiorColor ?? null,
    transmission: convexVehicle.transmission ?? null,
    fuelType: convexVehicle.fuelType ?? null,
    engine: convexVehicle.engine ?? null,
    trim: convexVehicle.trim ?? null,
    featured: convexVehicle.featured ?? false,
    dealershipId: convexVehicle.dealershipId ?? "",
    description: convexVehicle.description ?? null,
    createdAt: convexVehicle.createdAt ? String(convexVehicle.createdAt) : "",
    updatedAt: convexVehicle.updatedAt ? String(convexVehicle.updatedAt) : "",
    images: [],
    features: [],
  };
}

function mapDeal(
  deal: Doc<"deals"> & {
    client?: Doc<"clients"> | null;
    vehicle?: Doc<"vehicles"> | null;
  }
): DealWithRelations {
  return {
    ...deal,
    id: String(deal._id),
    status: "DRAFT", // Default, since not in Convex
    totalAmount: 0, // Default, since not in Convex
    client: deal.client ? mapConvexClientToClient(deal.client) : null,
    vehicle: deal.vehicle ? mapConvexVehicleToVehicle(deal.vehicle) : null,
  };
}

export function DealsTable() {
  // State for filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Get current user for dealershipId
  const currentUser = useConvexQuery(api.users.getCurrentUser);
  const dealershipId = currentUser?.dealershipId;

  const [generatingLink, setGeneratingLink] = useState<string | null>(null);

  const generateDeepLink = useAction(api.deeplink.generateDeepLinkToken);

  const handleGenerateDeepLink = async (dealId: string) => {
    setGeneratingLink(dealId);
    try {
      const result = await generateDeepLink({
        dealId: dealId as Id<"deals">,
      });

      if (result?.deepLink) {
        // Copy to clipboard
        await navigator.clipboard.writeText(result.deepLink);
        toast.success("Deep-link copied to clipboard!");

        // Optionally auto-open
        const shouldOpen = confirm("Open in desktop app?");
        if (shouldOpen) {
          window.location.href = result.deepLink;
        }
      }
    } catch (error) {
      console.error("Failed to generate deep-link:", error);
      toast.error("Failed to generate deep-link");
    } finally {
      setGeneratingLink(null);
    }
  };

  // Fetch deals from Convex
  const dealsData = useQuery(
    api.deals.getDeals,
    dealershipId
      ? { dealershipId, status: statusFilter, search: searchQuery }
      : "skip"
  );
  const isLoading = dealsData === undefined;
  const isError = !isLoading && !dealsData;

  // Get status badge
  const getStatusBadge = (status: DealStatus) => {
    switch (status) {
      case DealStatus.DRAFT:
        return <Badge variant="outline">Draft</Badge>;
      case DealStatus.PENDING:
        return <Badge variant="secondary">Pending</Badge>;
      case DealStatus.COMPLETED:
        return <Badge variant="default">Completed</Badge>;
      case DealStatus.CANCELLED:
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Handle status filter change
  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold mb-2">Error Loading Deals</h2>
        <p className="text-muted-foreground mb-4">
          There was a problem loading your deals. Please try again later.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Management</CardTitle>
        <CardDescription>
          View and manage all vehicle sales and documents
        </CardDescription>
      </CardHeader>

      <Button
        variant="default"
        size="sm"
        onClick={() => {
          const firstDeal = dealsData.deals[0];
          if (firstDeal) {
            handleGenerateDeepLink(firstDeal._id);
          }
        }}
        disabled={generatingLink === dealsData.deals[0]?._id}
      >
        {generatingLink === dealsData.deals[0]?._id ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Link2 className="mr-2 h-4 w-4" />
        )}
        Test with First Deal
      </Button>

      <CardContent>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by client, vehicle, or deal ID"
              className="pl-8"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>

          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Deals</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {dealsData?.deals && dealsData.deals.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dealsData.deals.map(
                (
                  deal: Doc<"deals"> & {
                    client?: Doc<"clients"> | null;
                    vehicle?: Doc<"vehicles"> | null;
                  }
                ) => {
                  const mappedDeal = mapDeal(deal);
                  return (
                    <TableRow key={mappedDeal.id}>
                      <TableCell className="font-medium">
                        #{String(mappedDeal.id).substring(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-muted-foreground" />
                          {mappedDeal.client
                            ? `${mappedDeal.client.firstName} ${mappedDeal.client.lastName}`
                            : "Unknown Client"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Car className="h-4 w-4 mr-2 text-muted-foreground" />
                          {mappedDeal.vehicle
                            ? `${mappedDeal.vehicle.year} ${mappedDeal.vehicle.make} ${mappedDeal.vehicle.model}`
                            : "Unknown Vehicle"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(mappedDeal.totalAmount ?? 0)}
                      </TableCell>
                      <TableCell>
                        {formatDate(new Date(mappedDeal.createdAt))}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(mappedDeal.status as DealStatus)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateDeepLink(deal._id)}
                            disabled={generatingLink === deal._id}
                          >
                            {generatingLink === deal._id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Link2 className="mr-2 h-4 w-4" />
                            )}
                            Deep Link
                          </Button>
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/deals/${mappedDeal.id}`}>
                              <FileText className="mr-2 h-4 w-4" />
                              View Deal
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }
              )}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center h-64">
            <FileText className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No deals found</p>
            {searchQuery || statusFilter !== "all" ? (
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Create a deal by selecting a client and clicking &quot;Create
                Deal Documents&quot;
              </p>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="bg-muted/20 border-t">
        <div className="flex items-center justify-between w-full">
          <p className="text-sm text-muted-foreground">
            Showing {dealsData?.deals?.length || 0} deals
          </p>
          <div>
            <Button variant="outline" asChild>
              <Link href="/clients">
                <User className="mr-2 h-4 w-4" />
                View Clients
              </Link>
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
