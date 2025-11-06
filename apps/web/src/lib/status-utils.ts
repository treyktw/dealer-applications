// apps/web/src/lib/status-utils.ts - Frontend status utilities

// ============================================================================
// STATUS ENUMS (matching backend)
// ============================================================================

export const VehicleStatus = {
  AVAILABLE: "AVAILABLE",
  FEATURED: "FEATURED",
  IN_TRANSIT: "IN_TRANSIT",
  IN_SERVICE: "IN_SERVICE",
  RESERVED: "RESERVED",
  PENDING_SALE: "PENDING_SALE",
  SOLD: "SOLD",
  WHOLESALE: "WHOLESALE",
  TRADED: "TRADED",
  UNAVAILABLE: "UNAVAILABLE",
  ARCHIVED: "ARCHIVED",
  // Legacy
  PENDING: "PENDING",
} as const;

export const ClientStatus = {
  PROSPECT: "PROSPECT",
  CONTACTED: "CONTACTED",
  QUALIFIED: "QUALIFIED",
  NEGOTIATING: "NEGOTIATING",
  CUSTOMER: "CUSTOMER",
  REPEAT_CUSTOMER: "REPEAT_CUSTOMER",
  LOST: "LOST",
  NOT_INTERESTED: "NOT_INTERESTED",
  DO_NOT_CONTACT: "DO_NOT_CONTACT",
  PREVIOUS: "PREVIOUS",
  // Legacy
  LEAD: "LEAD",
} as const;

export const DealStatus = {
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",
  DOCS_GENERATING: "DOCS_GENERATING",
  DOCS_READY: "DOCS_READY",
  AWAITING_SIGNATURES: "AWAITING_SIGNATURES",
  PARTIALLY_SIGNED: "PARTIALLY_SIGNED",
  FINANCING_PENDING: "FINANCING_PENDING",
  FINANCING_APPROVED: "FINANCING_APPROVED",
  FINANCING_DECLINED: "FINANCING_DECLINED",
  COMPLETED: "COMPLETED",
  DELIVERED: "DELIVERED",
  FINALIZED: "FINALIZED",
  ON_HOLD: "ON_HOLD",
  CANCELLED: "CANCELLED",
  VOID: "VOID",
  // Legacy
  draft: "draft",
  on_hold: "on_hold",
  completed: "completed",
} as const;

// ============================================================================
// STATUS LABELS
// ============================================================================

export function getDealStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [DealStatus.DRAFT]: "Draft",
    [DealStatus.PENDING_APPROVAL]: "Pending Approval",
    [DealStatus.APPROVED]: "Approved",
    [DealStatus.DOCS_GENERATING]: "Generating Documents",
    [DealStatus.DOCS_READY]: "Documents Ready",
    [DealStatus.AWAITING_SIGNATURES]: "Awaiting Signatures",
    [DealStatus.PARTIALLY_SIGNED]: "Partially Signed",
    [DealStatus.FINANCING_PENDING]: "Financing Pending",
    [DealStatus.FINANCING_APPROVED]: "Financing Approved",
    [DealStatus.FINANCING_DECLINED]: "Financing Declined",
    [DealStatus.COMPLETED]: "Completed",
    [DealStatus.DELIVERED]: "Delivered",
    [DealStatus.FINALIZED]: "Finalized",
    [DealStatus.ON_HOLD]: "On Hold",
    [DealStatus.CANCELLED]: "Cancelled",
    [DealStatus.VOID]: "Void",
    // Legacy
    draft: "Draft",
    on_hold: "On Hold",
    completed: "Completed",
  };
  return labels[status] || status;
}

export function getVehicleStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [VehicleStatus.AVAILABLE]: "Available",
    [VehicleStatus.FEATURED]: "Featured",
    [VehicleStatus.IN_TRANSIT]: "In Transit",
    [VehicleStatus.IN_SERVICE]: "In Service",
    [VehicleStatus.RESERVED]: "Reserved",
    [VehicleStatus.PENDING_SALE]: "Pending Sale",
    [VehicleStatus.SOLD]: "Sold",
    [VehicleStatus.WHOLESALE]: "Wholesale",
    [VehicleStatus.TRADED]: "Trade-In",
    [VehicleStatus.UNAVAILABLE]: "Unavailable",
    [VehicleStatus.ARCHIVED]: "Archived",
    // Legacy
    [VehicleStatus.PENDING]: "Pending",
  };
  return labels[status] || status;
}

export function getClientStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    [ClientStatus.PROSPECT]: "Prospect",
    [ClientStatus.CONTACTED]: "Contacted",
    [ClientStatus.QUALIFIED]: "Qualified Lead",
    [ClientStatus.NEGOTIATING]: "Negotiating",
    [ClientStatus.CUSTOMER]: "Customer",
    [ClientStatus.REPEAT_CUSTOMER]: "Repeat Customer",
    [ClientStatus.LOST]: "Lost",
    [ClientStatus.NOT_INTERESTED]: "Not Interested",
    [ClientStatus.DO_NOT_CONTACT]: "Do Not Contact",
    [ClientStatus.PREVIOUS]: "Previous Customer",
    // Legacy
    [ClientStatus.LEAD]: "Lead",
  };
  return labels[status] || status;
}

// ============================================================================
// STATUS COLORS (Tailwind classes)
// ============================================================================

export function getDealStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    [DealStatus.DRAFT]: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
    },
    [DealStatus.PENDING_APPROVAL]: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-300",
    },
    [DealStatus.APPROVED]: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
    },
    [DealStatus.DOCS_GENERATING]: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-300",
    },
    [DealStatus.DOCS_READY]: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-300",
    },
    [DealStatus.AWAITING_SIGNATURES]: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      border: "border-purple-300",
    },
    [DealStatus.PARTIALLY_SIGNED]: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      border: "border-purple-300",
    },
    [DealStatus.FINANCING_PENDING]: {
      bg: "bg-orange-100",
      text: "text-orange-800",
      border: "border-orange-300",
    },
    [DealStatus.FINANCING_APPROVED]: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
    },
    [DealStatus.FINANCING_DECLINED]: {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
    },
    [DealStatus.COMPLETED]: {
      bg: "bg-emerald-100",
      text: "text-emerald-800",
      border: "border-emerald-300",
    },
    [DealStatus.DELIVERED]: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-300",
    },
    [DealStatus.FINALIZED]: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
    },
    [DealStatus.ON_HOLD]: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-300",
    },
    [DealStatus.CANCELLED]: {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
    },
    [DealStatus.VOID]: {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
    },
  };

  return (
    colors[status] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
    }
  );
}

export function getVehicleStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    [VehicleStatus.AVAILABLE]: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
    },
    [VehicleStatus.FEATURED]: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-300",
    },
    [VehicleStatus.IN_TRANSIT]: {
      bg: "bg-yellow-100",
      text: "text-yellow-800",
      border: "border-yellow-300",
    },
    [VehicleStatus.IN_SERVICE]: {
      bg: "bg-orange-100",
      text: "text-orange-800",
      border: "border-orange-300",
    },
    [VehicleStatus.RESERVED]: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      border: "border-purple-300",
    },
    [VehicleStatus.PENDING_SALE]: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-300",
    },
    [VehicleStatus.SOLD]: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
    },
    [VehicleStatus.WHOLESALE]: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
    },
    [VehicleStatus.TRADED]: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
    },
    [VehicleStatus.UNAVAILABLE]: {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
    },
    [VehicleStatus.ARCHIVED]: {
      bg: "bg-slate-100",
      text: "text-slate-800",
      border: "border-slate-300",
    },
  };

  return (
    colors[status] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
    }
  );
}

export function getClientStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    [ClientStatus.PROSPECT]: {
      bg: "bg-sky-100",
      text: "text-sky-800",
      border: "border-sky-300",
    },
    [ClientStatus.CONTACTED]: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-300",
    },
    [ClientStatus.QUALIFIED]: {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-300",
    },
    [ClientStatus.NEGOTIATING]: {
      bg: "bg-orange-100",
      text: "text-orange-800",
      border: "border-orange-300",
    },
    [ClientStatus.CUSTOMER]: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      border: "border-purple-300",
    },
    [ClientStatus.REPEAT_CUSTOMER]: {
      bg: "bg-amber-100",
      text: "text-amber-800",
      border: "border-amber-300",
    },
    [ClientStatus.LOST]: {
      bg: "bg-red-100",
      text: "text-red-800",
      border: "border-red-300",
    },
    [ClientStatus.NOT_INTERESTED]: {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
    },
    [ClientStatus.DO_NOT_CONTACT]: {
      bg: "bg-slate-100",
      text: "text-slate-800",
      border: "border-slate-300",
    },
    [ClientStatus.PREVIOUS]: {
      bg: "bg-zinc-100",
      text: "text-zinc-800",
      border: "border-zinc-300",
    },
  };

  return (
    colors[status] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
    }
  );
}

// ============================================================================
// STATUS OPTIONS FOR DROPDOWNS
// ============================================================================

export const dealStatusOptions = [
  { value: DealStatus.DRAFT, label: "Draft" },
  { value: DealStatus.PENDING_APPROVAL, label: "Pending Approval" },
  { value: DealStatus.APPROVED, label: "Approved" },
  { value: DealStatus.DOCS_GENERATING, label: "Generating Documents" },
  { value: DealStatus.DOCS_READY, label: "Documents Ready" },
  { value: DealStatus.AWAITING_SIGNATURES, label: "Awaiting Signatures" },
  { value: DealStatus.PARTIALLY_SIGNED, label: "Partially Signed" },
  { value: DealStatus.FINANCING_PENDING, label: "Financing Pending" },
  { value: DealStatus.FINANCING_APPROVED, label: "Financing Approved" },
  { value: DealStatus.FINANCING_DECLINED, label: "Financing Declined" },
  { value: DealStatus.COMPLETED, label: "Completed" },
  { value: DealStatus.DELIVERED, label: "Delivered" },
  { value: DealStatus.FINALIZED, label: "Finalized" },
  { value: DealStatus.ON_HOLD, label: "On Hold" },
  { value: DealStatus.CANCELLED, label: "Cancelled" },
  { value: DealStatus.VOID, label: "Void" },
];

export const vehicleStatusOptions = [
  { value: VehicleStatus.AVAILABLE, label: "Available" },
  { value: VehicleStatus.FEATURED, label: "Featured" },
  { value: VehicleStatus.IN_TRANSIT, label: "In Transit" },
  { value: VehicleStatus.IN_SERVICE, label: "In Service" },
  { value: VehicleStatus.RESERVED, label: "Reserved" },
  { value: VehicleStatus.PENDING_SALE, label: "Pending Sale" },
  { value: VehicleStatus.SOLD, label: "Sold" },
  { value: VehicleStatus.WHOLESALE, label: "Wholesale" },
  { value: VehicleStatus.TRADED, label: "Trade-In" },
  { value: VehicleStatus.UNAVAILABLE, label: "Unavailable" },
  { value: VehicleStatus.ARCHIVED, label: "Archived" },
];

export const clientStatusOptions = [
  { value: ClientStatus.PROSPECT, label: "Prospect" },
  { value: ClientStatus.CONTACTED, label: "Contacted" },
  { value: ClientStatus.QUALIFIED, label: "Qualified Lead" },
  { value: ClientStatus.NEGOTIATING, label: "Negotiating" },
  { value: ClientStatus.CUSTOMER, label: "Customer" },
  { value: ClientStatus.REPEAT_CUSTOMER, label: "Repeat Customer" },
  { value: ClientStatus.LOST, label: "Lost" },
  { value: ClientStatus.NOT_INTERESTED, label: "Not Interested" },
  { value: ClientStatus.DO_NOT_CONTACT, label: "Do Not Contact" },
  { value: ClientStatus.PREVIOUS, label: "Previous Customer" },
];
