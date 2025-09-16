"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  ImageIcon,
  Loader2,
  Check,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  SecureImageWithSkeleton,
} from "@/components/dashboard/inventory/SecureImage";

export default function VehicleDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("details");
  // Convex hooks
  const vehicleId = params.id as Id<"vehicles">;
  const vehicle = useQuery(
    api.inventory.getVehicle,
    params.id && params.id.trim() !== "" ? { id: vehicleId } : "skip"
  );
  const updateVehicle = useMutation(api.inventory.updateVehicle);
  const deleteVehicle = useMutation(api.inventory.deleteVehicle);
  const [isLoading, setIsLoading] = useState(false);

  // Map features for display (Convex stores as newline string)
  const featuresArr = vehicle?.features
    ? vehicle.features.split("\n").filter(Boolean)
    : [];

  // Handle status change
  const handleStatusChange = async (newStatus: string) => {
    if (!vehicle || newStatus === vehicle.status) return;
    try {
      setIsLoading(true);
      await updateVehicle({
        id: vehicleId,
        stock: vehicle.stock,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        trim: vehicle.trim,
        mileage: vehicle.mileage,
        price: vehicle.price,
        exteriorColor: vehicle.exteriorColor,
        interiorColor: vehicle.interiorColor,
        fuelType: vehicle.fuelType,
        transmission: vehicle.transmission,
        engine: vehicle.engine,
        description: vehicle.description,
        status: newStatus as "pending" | "available" | "sold" | "reserved",
        featured: vehicle.featured,
        features: vehicle.features,
        images: vehicle.images,
      });
      toast.success("Status updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete
  const handleDeleteVehicle = async () => {
    if (!vehicle) return;
    if (
      !confirm(
        `Are you sure you want to delete ${vehicle.year} ${vehicle.make} ${vehicle.model}?`
      )
    )
      return;
    try {
      setIsLoading(true);
      await deleteVehicle({ id: vehicleId });
      toast.success("Vehicle deleted successfully");
      router.push("/inventory");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete vehicle");
    } finally {
      setIsLoading(false);
    }
  };

  if (!vehicle) {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <h2 className="text-xl font-semibold mb-2">Vehicle Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The vehicle you&apos;re looking for doesn&apos;t exist or has been
          removed.
        </p>
        <Button asChild variant="outline">
          <Link href="/inventory">Back to Inventory</Link>
        </Button>
      </div>
    );
  }

  // Get status badge variant
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "available":
        return "default";
      case "pending":
        return "secondary";
      case "sold":
        return "outline";
      case "maintenance":
        return "destructive";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getStatusBadgeVariant(vehicle.status)}>
                {vehicle.status.charAt(0).toUpperCase() +
                  vehicle.status.slice(1)}
              </Badge>
              <span className="text-muted-foreground text-sm">
                Stock #{vehicle.stock}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={vehicle.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Update Status" />
            </SelectTrigger>
            <SelectContent>
              {["available", "pending", "sold", "maintenance"].map((item) => (
                <SelectItem key={item} value={item}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" asChild>
            <Link href={`/inventory/${params.id}/edit`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>

          <Button variant="destructive" onClick={handleDeleteVehicle}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Main Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Price</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(vehicle.price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Mileage</p>
                    <p className="text-xl font-bold">
                      {vehicle.mileage.toLocaleString()} mi
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-y-4">
                  {[
                    { label: "Make", value: vehicle.make },
                    { label: "Model", value: vehicle.model },
                    { label: "Year", value: vehicle.year },
                    { label: "Trim", value: vehicle.trim || "N/A" },
                    { label: "Stock Number", value: vehicle.stock },
                    { label: "VIN", value: vehicle.vin },
                  ].map((item, index) => (
                    <div key={index}>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Specs Card */}
            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-y-4">
                  {[
                    { label: "Engine", value: vehicle.engine || "N/A" },
                    {
                      label: "Transmission",
                      value: vehicle.transmission || "N/A",
                    },
                    { label: "Fuel Type", value: vehicle.fuelType || "N/A" },
                    {
                      label: "Exterior Color",
                      value: vehicle.exteriorColor || "N/A",
                    },
                    {
                      label: "Interior Color",
                      value: vehicle.interiorColor || "N/A",
                    },
                  ].map((item, index) => (
                    <div key={index}>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm mt-1">
                    {vehicle.description || "No description available"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="images">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Images</CardTitle>
            </CardHeader>
            <CardContent>
              {vehicle?.images && vehicle.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {vehicle.images?.map(
                    (
                      image: { url: string; isPrimary?: boolean },
                      index: number
                    ) => (
                      <div
                        key={index}
                        className="relative aspect-[4/3] border rounded-md overflow-hidden"
                      >
                        {/* Replace Image with SecureImage */}
                        <SecureImageWithSkeleton
                          filePath={image.url}
                          dealershipId={vehicle.dealershipId || ""}
                          alt={`${vehicle?.year} ${vehicle?.make} ${vehicle?.model} - Image ${index + 1}`}
                          className="object-cover w-full h-full"
                          fill
                        />
                        {/* Add primary badge if this is the primary image */}
                        {image.isPrimary && (
                          <div className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded-full">
                            Primary
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-center py-12 border rounded-md bg-muted/20">
                  <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">
                    No images available
                  </p>

                  <Button className="mt-4" variant="outline" asChild>
                    <Link href={`/inventory/${params.id}/edit?tab=images`}>
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Add Images
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Features & Options</CardTitle>
            </CardHeader>
            <CardContent>
              {featuresArr.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-2">
                  {featuresArr.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 py-1">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">
                    No features listed
                  </p>

                  <Button className="mt-4" variant="outline" asChild>
                    <Link href={`/inventory/${params.id}/edit?tab=features`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Add Features
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
