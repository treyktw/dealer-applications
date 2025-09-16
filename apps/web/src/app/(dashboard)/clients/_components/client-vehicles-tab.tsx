"use client";

import Link from "next/link";
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Car } from "lucide-react";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: 'available' | 'sold' | 'pending' | 'reserved';
  lastViewed?: string;
}

interface ClientVehiclesTabProps {
  vehicles: Vehicle[];
}

export function ClientVehiclesTab({ vehicles }: ClientVehiclesTabProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicles of Interest</CardTitle>
      </CardHeader>
      <CardContent>
        {vehicles.length > 0 ? (
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <div 
                key={vehicle.id} 
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-md flex items-center justify-center">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(vehicle.price)}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant={vehicle.status === "available" ? "default" : "outline"}
                >
                  {vehicle.status.charAt(0).toUpperCase() + vehicle.status.slice(1)}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No vehicles associated with this client
          </p>
        )}
      </CardContent>
      <CardFooter className="border-t">
        <Button className="w-full" asChild>
          <Link href="/inventory">
            <Car className="mr-2 h-4 w-4" />
            Browse Inventory
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}