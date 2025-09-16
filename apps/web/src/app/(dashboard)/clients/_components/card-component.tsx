"use client";

import { Mail, Phone, MapPin, Calendar } from "lucide-react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface ClientInfoCardProps {
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  updatedAt: string;
}

export function ClientInfoCard({
  email,
  phone,
  address,
  city,
  state,
  zipCode,
  updatedAt,
}: ClientInfoCardProps) {
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {email && (
          <div className="flex items-start gap-2">
            <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>
        )}
        
        {phone && (
          <div className="flex items-start gap-2">
            <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="text-sm text-muted-foreground">{phone}</p>
            </div>
          </div>
        )}
        
        {(address || city || state) && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Address</p>
              <p className="text-sm text-muted-foreground">
                {address && <>{address}<br /></>}
                {city && state && (
                  <>
                    {city}, {state} {zipCode}
                  </>
                )}
              </p>
            </div>
          </div>
        )}
        
        <div className="flex items-start gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium">Last Updated</p>
            <p className="text-sm text-muted-foreground">{formatDate(updatedAt.toString())}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}