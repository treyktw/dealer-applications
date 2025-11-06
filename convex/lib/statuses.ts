// convex/lib/statuses.ts - Status enums and utilities

// ============================================================================
// VEHICLE STATUSES
// ============================================================================

export const VehicleStatus = {
  // Available for sale
  AVAILABLE: "AVAILABLE",
  FEATURED: "FEATURED",

  // In process
  IN_TRANSIT: "IN_TRANSIT",
  IN_SERVICE: "IN_SERVICE",
  RESERVED: "RESERVED",
  PENDING_SALE: "PENDING_SALE",

  // Sold/Off lot
  SOLD: "SOLD",
  WHOLESALE: "WHOLESALE", // Future-proofing
  TRADED: "TRADED", // Trade-ins

  // Other
  UNAVAILABLE: "UNAVAILABLE",
  ARCHIVED: "ARCHIVED",
} as const;

export type VehicleStatusType = typeof VehicleStatus[keyof typeof VehicleStatus];

// ============================================================================
// CLIENT STATUSES
// ============================================================================

export const ClientStatus = {
  // Lead stages
  PROSPECT: "PROSPECT",
  CONTACTED: "CONTACTED",
  QUALIFIED: "QUALIFIED",
  NEGOTIATING: "NEGOTIATING",

  // Customer stages
  CUSTOMER: "CUSTOMER",
  REPEAT_CUSTOMER: "REPEAT_CUSTOMER",

  // Inactive/Lost
  LOST: "LOST",
  NOT_INTERESTED: "NOT_INTERESTED",
  DO_NOT_CONTACT: "DO_NOT_CONTACT",
  PREVIOUS: "PREVIOUS",
} as const;

export type ClientStatusType = typeof ClientStatus[keyof typeof ClientStatus];

// ============================================================================
// DEAL STATUSES
// ============================================================================

export const DealStatus = {
  // Initial stages
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  APPROVED: "APPROVED",

  // Documentation stages
  DOCS_GENERATING: "DOCS_GENERATING",
  DOCS_READY: "DOCS_READY",
  AWAITING_SIGNATURES: "AWAITING_SIGNATURES",
  PARTIALLY_SIGNED: "PARTIALLY_SIGNED",

  // Financing stages (future-proofing)
  FINANCING_PENDING: "FINANCING_PENDING",
  FINANCING_APPROVED: "FINANCING_APPROVED",
  FINANCING_DECLINED: "FINANCING_DECLINED",

  // Completion stages
  COMPLETED: "COMPLETED",
  DELIVERED: "DELIVERED",
  FINALIZED: "FINALIZED",

  // Problem stages
  ON_HOLD: "ON_HOLD",
  CANCELLED: "CANCELLED",
  VOID: "VOID",
} as const;

export type DealStatusType = typeof DealStatus[keyof typeof DealStatus];

// ============================================================================
// STATUS TRANSITION VALIDATION
// ============================================================================

// Valid transitions for deal statuses
const VALID_DEAL_TRANSITIONS: Record<string, string[]> = {
  [DealStatus.DRAFT]: [
    DealStatus.PENDING_APPROVAL,
    DealStatus.APPROVED, // Can skip approval in some cases
    DealStatus.DOCS_GENERATING, // Allow automatic document generation from DRAFT
    DealStatus.CANCELLED,
  ],
  [DealStatus.PENDING_APPROVAL]: [
    DealStatus.APPROVED,
    DealStatus.DRAFT, // Send back for edits
    DealStatus.CANCELLED,
  ],
  [DealStatus.APPROVED]: [
    DealStatus.DOCS_GENERATING,
    DealStatus.DOCS_READY, // Can skip if docs already exist
    DealStatus.ON_HOLD,
    DealStatus.CANCELLED,
  ],
  [DealStatus.DOCS_GENERATING]: [
    DealStatus.DOCS_READY,
    DealStatus.DRAFT, // Allow reverting to DRAFT if generation fails
    DealStatus.ON_HOLD,
    DealStatus.CANCELLED,
  ],
  [DealStatus.DOCS_READY]: [
    DealStatus.AWAITING_SIGNATURES,
    DealStatus.FINANCING_PENDING, // If financing needed
    DealStatus.ON_HOLD,
    DealStatus.CANCELLED,
  ],
  [DealStatus.AWAITING_SIGNATURES]: [
    DealStatus.PARTIALLY_SIGNED,
    DealStatus.COMPLETED, // All signed at once
    DealStatus.ON_HOLD,
    DealStatus.CANCELLED,
  ],
  [DealStatus.PARTIALLY_SIGNED]: [
    DealStatus.COMPLETED,
    DealStatus.ON_HOLD,
    DealStatus.CANCELLED,
  ],
  [DealStatus.FINANCING_PENDING]: [
    DealStatus.FINANCING_APPROVED,
    DealStatus.FINANCING_DECLINED,
    DealStatus.ON_HOLD,
    DealStatus.CANCELLED,
  ],
  [DealStatus.FINANCING_APPROVED]: [
    DealStatus.AWAITING_SIGNATURES,
    DealStatus.COMPLETED,
    DealStatus.ON_HOLD,
    DealStatus.CANCELLED,
  ],
  [DealStatus.FINANCING_DECLINED]: [
    DealStatus.CANCELLED,
    DealStatus.ON_HOLD,
  ],
  [DealStatus.COMPLETED]: [
    DealStatus.DELIVERED,
    DealStatus.FINALIZED,
    DealStatus.VOID, // Rare, legal issues
  ],
  [DealStatus.DELIVERED]: [
    DealStatus.FINALIZED,
    DealStatus.VOID,
  ],
  [DealStatus.FINALIZED]: [
    DealStatus.VOID, // Very rare
  ],
  [DealStatus.ON_HOLD]: [
    DealStatus.DRAFT,
    DealStatus.APPROVED,
    DealStatus.DOCS_READY,
    DealStatus.AWAITING_SIGNATURES,
    DealStatus.CANCELLED,
  ],
  [DealStatus.CANCELLED]: [], // Terminal state
  [DealStatus.VOID]: [], // Terminal state
};

export function canTransitionDealStatus(from: string, to: string): boolean {
  // Allow same status (no-op)
  if (from === to) return true;

  const validTransitions = VALID_DEAL_TRANSITIONS[from];
  if (!validTransitions) return false;

  return validTransitions.includes(to);
}

// Valid transitions for vehicle statuses
const VALID_VEHICLE_TRANSITIONS: Record<string, string[]> = {
  [VehicleStatus.IN_TRANSIT]: [
    VehicleStatus.IN_SERVICE,
    VehicleStatus.AVAILABLE,
    VehicleStatus.UNAVAILABLE,
  ],
  [VehicleStatus.IN_SERVICE]: [
    VehicleStatus.AVAILABLE,
    VehicleStatus.FEATURED,
    VehicleStatus.UNAVAILABLE,
  ],
  [VehicleStatus.AVAILABLE]: [
    VehicleStatus.FEATURED,
    VehicleStatus.RESERVED,
    VehicleStatus.PENDING_SALE,
    VehicleStatus.IN_SERVICE,
    VehicleStatus.UNAVAILABLE,
    VehicleStatus.WHOLESALE,
    VehicleStatus.TRADED,
  ],
  [VehicleStatus.FEATURED]: [
    VehicleStatus.AVAILABLE,
    VehicleStatus.RESERVED,
    VehicleStatus.PENDING_SALE,
    VehicleStatus.IN_SERVICE,
    VehicleStatus.UNAVAILABLE,
  ],
  [VehicleStatus.RESERVED]: [
    VehicleStatus.PENDING_SALE,
    VehicleStatus.SOLD,
    VehicleStatus.AVAILABLE, // Reservation expired
  ],
  [VehicleStatus.PENDING_SALE]: [
    VehicleStatus.SOLD,
    VehicleStatus.AVAILABLE, // Deal fell through
    VehicleStatus.RESERVED,
  ],
  [VehicleStatus.SOLD]: [
    VehicleStatus.ARCHIVED,
    VehicleStatus.AVAILABLE, // Very rare, deal reversed
  ],
  [VehicleStatus.WHOLESALE]: [
    VehicleStatus.ARCHIVED,
  ],
  [VehicleStatus.TRADED]: [
    VehicleStatus.IN_SERVICE,
    VehicleStatus.AVAILABLE,
    VehicleStatus.WHOLESALE,
  ],
  [VehicleStatus.UNAVAILABLE]: [
    VehicleStatus.AVAILABLE,
    VehicleStatus.IN_SERVICE,
    VehicleStatus.ARCHIVED,
  ],
  [VehicleStatus.ARCHIVED]: [], // Terminal state
};

export function canTransitionVehicleStatus(from: string, to: string): boolean {
  if (from === to) return true;

  const validTransitions = VALID_VEHICLE_TRANSITIONS[from];
  if (!validTransitions) return false;

  return validTransitions.includes(to);
}

// Valid transitions for client statuses
const VALID_CLIENT_TRANSITIONS: Record<string, string[]> = {
  [ClientStatus.PROSPECT]: [
    ClientStatus.CONTACTED,
    ClientStatus.NOT_INTERESTED,
    ClientStatus.DO_NOT_CONTACT,
  ],
  [ClientStatus.CONTACTED]: [
    ClientStatus.QUALIFIED,
    ClientStatus.NOT_INTERESTED,
    ClientStatus.LOST,
    ClientStatus.DO_NOT_CONTACT,
  ],
  [ClientStatus.QUALIFIED]: [
    ClientStatus.NEGOTIATING,
    ClientStatus.CUSTOMER, // Skip negotiation
    ClientStatus.LOST,
    ClientStatus.NOT_INTERESTED,
  ],
  [ClientStatus.NEGOTIATING]: [
    ClientStatus.CUSTOMER,
    ClientStatus.LOST,
    ClientStatus.NOT_INTERESTED,
  ],
  [ClientStatus.CUSTOMER]: [
    ClientStatus.REPEAT_CUSTOMER,
    ClientStatus.PREVIOUS,
  ],
  [ClientStatus.REPEAT_CUSTOMER]: [
    ClientStatus.PREVIOUS,
  ],
  [ClientStatus.LOST]: [
    ClientStatus.CONTACTED, // Re-engaged
    ClientStatus.NOT_INTERESTED,
  ],
  [ClientStatus.NOT_INTERESTED]: [
    ClientStatus.CONTACTED, // Re-engaged later
    ClientStatus.DO_NOT_CONTACT,
  ],
  [ClientStatus.DO_NOT_CONTACT]: [], // Terminal state (compliance)
  [ClientStatus.PREVIOUS]: [
    ClientStatus.CONTACTED, // Re-engaged for new purchase
    ClientStatus.REPEAT_CUSTOMER, // New purchase
  ],
};

export function canTransitionClientStatus(from: string, to: string): boolean {
  if (from === to) return true;

  const validTransitions = VALID_CLIENT_TRANSITIONS[from];
  if (!validTransitions) return false;

  return validTransitions.includes(to);
}

// ============================================================================
// STATUS DISPLAY UTILITIES
// ============================================================================

// Deal status colors (Tailwind classes)
export function getDealStatusColor(status: string): string {
  switch (status) {
    case DealStatus.DRAFT:
      return "gray";
    case DealStatus.PENDING_APPROVAL:
      return "yellow";
    case DealStatus.APPROVED:
      return "green";
    case DealStatus.DOCS_GENERATING:
    case DealStatus.DOCS_READY:
      return "blue";
    case DealStatus.AWAITING_SIGNATURES:
    case DealStatus.PARTIALLY_SIGNED:
      return "purple";
    case DealStatus.FINANCING_PENDING:
      return "orange";
    case DealStatus.FINANCING_APPROVED:
      return "green";
    case DealStatus.FINANCING_DECLINED:
      return "red";
    case DealStatus.COMPLETED:
      return "emerald";
    case DealStatus.DELIVERED:
      return "blue";
    case DealStatus.FINALIZED:
      return "gray";
    case DealStatus.ON_HOLD:
      return "yellow";
    case DealStatus.CANCELLED:
    case DealStatus.VOID:
      return "red";
    default:
      return "gray";
  }
}

// Deal status labels (human-readable)
export function getDealStatusLabel(status: string): string {
  switch (status) {
    case DealStatus.DRAFT:
      return "Draft";
    case DealStatus.PENDING_APPROVAL:
      return "Pending Approval";
    case DealStatus.APPROVED:
      return "Approved";
    case DealStatus.DOCS_GENERATING:
      return "Generating Documents";
    case DealStatus.DOCS_READY:
      return "Documents Ready";
    case DealStatus.AWAITING_SIGNATURES:
      return "Awaiting Signatures";
    case DealStatus.PARTIALLY_SIGNED:
      return "Partially Signed";
    case DealStatus.FINANCING_PENDING:
      return "Financing Pending";
    case DealStatus.FINANCING_APPROVED:
      return "Financing Approved";
    case DealStatus.FINANCING_DECLINED:
      return "Financing Declined";
    case DealStatus.COMPLETED:
      return "Completed";
    case DealStatus.DELIVERED:
      return "Delivered";
    case DealStatus.FINALIZED:
      return "Finalized";
    case DealStatus.ON_HOLD:
      return "On Hold";
    case DealStatus.CANCELLED:
      return "Cancelled";
    case DealStatus.VOID:
      return "Void";
    default:
      return status;
  }
}

// Vehicle status colors
export function getVehicleStatusColor(status: string): string {
  switch (status) {
    case VehicleStatus.AVAILABLE:
      return "green";
    case VehicleStatus.FEATURED:
      return "blue";
    case VehicleStatus.IN_TRANSIT:
      return "yellow";
    case VehicleStatus.IN_SERVICE:
      return "orange";
    case VehicleStatus.RESERVED:
      return "purple";
    case VehicleStatus.PENDING_SALE:
      return "blue";
    case VehicleStatus.SOLD:
      return "gray";
    case VehicleStatus.WHOLESALE:
    case VehicleStatus.TRADED:
      return "gray";
    case VehicleStatus.UNAVAILABLE:
      return "red";
    case VehicleStatus.ARCHIVED:
      return "slate";
    default:
      return "gray";
  }
}

// Vehicle status labels
export function getVehicleStatusLabel(status: string): string {
  switch (status) {
    case VehicleStatus.AVAILABLE:
      return "Available";
    case VehicleStatus.FEATURED:
      return "Featured";
    case VehicleStatus.IN_TRANSIT:
      return "In Transit";
    case VehicleStatus.IN_SERVICE:
      return "In Service";
    case VehicleStatus.RESERVED:
      return "Reserved";
    case VehicleStatus.PENDING_SALE:
      return "Pending Sale";
    case VehicleStatus.SOLD:
      return "Sold";
    case VehicleStatus.WHOLESALE:
      return "Wholesale";
    case VehicleStatus.TRADED:
      return "Trade-In";
    case VehicleStatus.UNAVAILABLE:
      return "Unavailable";
    case VehicleStatus.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
}

// Client status colors
export function getClientStatusColor(status: string): string {
  switch (status) {
    case ClientStatus.PROSPECT:
      return "sky";
    case ClientStatus.CONTACTED:
      return "blue";
    case ClientStatus.QUALIFIED:
      return "green";
    case ClientStatus.NEGOTIATING:
      return "orange";
    case ClientStatus.CUSTOMER:
      return "purple";
    case ClientStatus.REPEAT_CUSTOMER:
      return "amber";
    case ClientStatus.LOST:
      return "red";
    case ClientStatus.NOT_INTERESTED:
      return "gray";
    case ClientStatus.DO_NOT_CONTACT:
      return "slate";
    case ClientStatus.PREVIOUS:
      return "zinc";
    default:
      return "gray";
  }
}

// Client status labels
export function getClientStatusLabel(status: string): string {
  switch (status) {
    case ClientStatus.PROSPECT:
      return "Prospect";
    case ClientStatus.CONTACTED:
      return "Contacted";
    case ClientStatus.QUALIFIED:
      return "Qualified Lead";
    case ClientStatus.NEGOTIATING:
      return "Negotiating";
    case ClientStatus.CUSTOMER:
      return "Customer";
    case ClientStatus.REPEAT_CUSTOMER:
      return "Repeat Customer";
    case ClientStatus.LOST:
      return "Lost";
    case ClientStatus.NOT_INTERESTED:
      return "Not Interested";
    case ClientStatus.DO_NOT_CONTACT:
      return "Do Not Contact";
    case ClientStatus.PREVIOUS:
      return "Previous Customer";
    default:
      return status;
  }
}

// ============================================================================
// STATUS VALIDATION
// ============================================================================

export function isValidDealStatus(status: string): boolean {
  return Object.values(DealStatus).includes(status as DealStatusType);
}

export function isValidVehicleStatus(status: string): boolean {
  return Object.values(VehicleStatus).includes(status as VehicleStatusType);
}

export function isValidClientStatus(status: string): boolean {
  return Object.values(ClientStatus).includes(status as ClientStatusType);
}
