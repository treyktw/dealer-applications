// src/app/(dashboard)/inventory/[id]/page.tsx

import React from "react";
import VehicleDetailPage from "../_components/vehicle-details-page";


export default function VehicleEditPage({ params }: { params: Promise<{ id: string }> }) {

  const unwrappedParams = React.use(params);
  const vehicleId = unwrappedParams;

  return <VehicleDetailPage params={vehicleId} />;
}