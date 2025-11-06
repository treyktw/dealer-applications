// apps/web/src/components/shared/StatusBadge.tsx

import { Badge } from "@/components/ui/badge";
import {
  getDealStatusLabel,
  getDealStatusColor,
  getVehicleStatusLabel,
  getVehicleStatusColor,
  getClientStatusLabel,
  getClientStatusColor,
} from "@/lib/status-utils";

interface StatusBadgeProps {
  status: string;
  type: "deal" | "vehicle" | "client";
  className?: string;
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  let label: string;
  let colors: { bg: string; text: string; border: string };

  switch (type) {
    case "deal":
      label = getDealStatusLabel(status);
      colors = getDealStatusColor(status);
      break;
    case "vehicle":
      label = getVehicleStatusLabel(status);
      colors = getVehicleStatusColor(status);
      break;
    case "client":
      label = getClientStatusLabel(status);
      colors = getClientStatusColor(status);
      break;
  }

  return (
    <Badge
      variant="outline"
      className={`${colors.bg} ${colors.text} ${colors.border} border ${className || ""}`}
    >
      {label}
    </Badge>
  );
}

// Convenience components for each type
export function DealStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return <StatusBadge status={status} type="deal" className={className} />;
}

export function VehicleStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return <StatusBadge status={status} type="vehicle" className={className} />;
}

export function ClientStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return <StatusBadge status={status} type="client" className={className} />;
}
