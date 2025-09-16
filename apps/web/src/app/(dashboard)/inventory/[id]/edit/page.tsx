// src/app/(dashboard)/inventory/[id]/edit/page.tsx
'use client'
import React from "react";
import EditVehiclePage from "../../_components/inventory-edit-page";

export default function VehicleEditPage({ params }: { params: Promise<{ id: string }> }) {

  const unwrappedParams = React.use(params);
  const vehicleId = unwrappedParams;

  return <EditVehiclePage params={vehicleId} />;
}
