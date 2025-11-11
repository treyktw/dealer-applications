/**
 * SQLite Deals Service
 * Wraps Tauri commands for deal CRUD operations
 */

import { invoke } from "@tauri-apps/api/core";

export interface LocalDeal {
  id: string;
  type: string;
  client_id: string;
  vehicle_id: string;
  status: string;
  total_amount: number;
  sale_date?: number;
  sale_amount?: number;
  sales_tax?: number;
  doc_fee?: number;
  trade_in_value?: number;
  down_payment?: number;
  financed_amount?: number;
  document_ids: string[];
  cobuyer_data?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    driversLicense?: string;
  };
  created_at: number;
  updated_at: number;
  synced_at?: number;
}

/**
 * Create a new deal
 */
export async function createDeal(
  deal: Omit<LocalDeal, "id" | "created_at" | "updated_at"> & { id?: string },
  userId?: string
): Promise<LocalDeal> {
  console.log("🔍 [CREATE-DEAL] Function called");
  console.log("  - userId:", userId);
  console.log("  - deal.client_id:", deal.client_id);
  console.log("  - deal.vehicle_id:", deal.vehicle_id);
  
  if (!userId) {
    console.error("❌ [CREATE-DEAL] userId is missing!");
    throw new Error("User ID is required");
  }
  
  const now = Date.now();
  const newDeal: any = {
    ...deal,
    id: deal.id || `deal_${crypto.randomUUID()}`,
    created_at: now,
    updated_at: now,
    document_ids: JSON.stringify(deal.document_ids || []),
    cobuyer_data: deal.cobuyer_data
      ? JSON.stringify(deal.cobuyer_data)
      : null,
  };

  console.log("🔍 [CREATE-DEAL] Calling Rust with:", {
    dealId: newDeal.id,
    userId: userId,
  });

  const result = await invoke<any>("db_create_deal", { 
    deal: newDeal, 
    userId: userId, // camelCase - Tauri converts to user_id in Rust
  });

  console.log("✅ [CREATE-DEAL] Deal created in Rust, result:", {
    id: result.id,
    client_id: result.client_id,
    vehicle_id: result.vehicle_id,
  });

  return {
    ...result,
    document_ids: JSON.parse(result.document_ids || "[]"),
    cobuyer_data: result.cobuyer_data
      ? JSON.parse(result.cobuyer_data)
      : undefined,
  };
}

/**
 * Get deal by ID
 */
export async function getDeal(id: string, userId?: string): Promise<LocalDeal | undefined> {
  const result = await invoke<any>("db_get_deal", { id, userId: userId || null });
  if (!result) return undefined;

  return {
    ...result,
    document_ids: JSON.parse(result.document_ids || "[]"),
    cobuyer_data: result.cobuyer_data
      ? JSON.parse(result.cobuyer_data)
      : undefined,
  };
}

/**
 * Get all deals
 */
export async function getAllDeals(userId?: string): Promise<LocalDeal[]> {
  const deals = await invoke<any[]>("db_get_all_deals", { userId: userId || null });
  return deals.map((deal) => ({
    ...deal,
    document_ids: JSON.parse(deal.document_ids || "[]"),
    cobuyer_data: deal.cobuyer_data ? JSON.parse(deal.cobuyer_data) : undefined,
  }));
}

/**
 * Get deals by client
 */
export async function getDealsByClient(
  clientId: string
): Promise<LocalDeal[]> {
  const deals = await invoke<any[]>("db_get_deals_by_client", {
    client_id: clientId,
  });
  return deals.map((deal) => ({
    ...deal,
    document_ids: JSON.parse(deal.document_ids || "[]"),
    cobuyer_data: deal.cobuyer_data ? JSON.parse(deal.cobuyer_data) : undefined,
  }));
}

/**
 * Get deals by vehicle
 */
export async function getDealsByVehicle(
  vehicleId: string,
  userId?: string
): Promise<LocalDeal[]> {
  const deals = await invoke<any[]>("db_get_deals_by_vehicle", {
    vehicle_id: vehicleId,
    userId: userId || null,
  });
  return deals.map((deal) => ({
    ...deal,
    document_ids: JSON.parse(deal.document_ids || "[]"),
    cobuyer_data: deal.cobuyer_data ? JSON.parse(deal.cobuyer_data) : undefined,
  }));
}

/**
 * Get deals by status
 */
export async function getDealsByStatus(status: string, userId?: string): Promise<LocalDeal[]> {
  const deals = await invoke<any[]>("db_get_deals_by_status", { status, userId: userId || null });
  return deals.map((deal) => ({
    ...deal,
    document_ids: JSON.parse(deal.document_ids || "[]"),
    cobuyer_data: deal.cobuyer_data ? JSON.parse(deal.cobuyer_data) : undefined,
  }));
}

/**
 * Update deal
 */
export async function updateDeal(
  id: string,
  updates: Partial<LocalDeal>,
  userId?: string
): Promise<LocalDeal> {
  const updateData: any = { ...updates };
  if (updates.document_ids) {
    updateData.document_ids = JSON.stringify(updates.document_ids);
  }
  if (updates.cobuyer_data !== undefined) {
    updateData.cobuyer_data = updates.cobuyer_data
      ? JSON.stringify(updates.cobuyer_data)
      : null;
  }

  const result = await invoke<any>("db_update_deal", {
    id,
    updates: updateData,
    userId: userId || null,
  });

  return {
    ...result,
    document_ids: JSON.parse(result.document_ids || "[]"),
    cobuyer_data: result.cobuyer_data
      ? JSON.parse(result.cobuyer_data)
      : undefined,
  };
}

/**
 * Delete deal
 */
export async function deleteDeal(id: string, userId?: string): Promise<void> {
  await invoke("db_delete_deal", { id, userId: userId || null });
}

/**
 * Search deals
 */
export async function searchDeals(query: string, userId?: string): Promise<LocalDeal[]> {
  const deals = await invoke<any[]>("db_search_deals", { query, userId: userId || null });
  return deals.map((deal) => ({
    ...deal,
    document_ids: JSON.parse(deal.document_ids || "[]"),
    cobuyer_data: deal.cobuyer_data ? JSON.parse(deal.cobuyer_data) : undefined,
  }));
}

/**
 * Get recent deals (sorted by created_at descending)
 */
export async function getRecentDeals(limit: number = 10, userId?: string): Promise<LocalDeal[]> {
  const deals = await getAllDeals(userId);
  return deals
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, limit);
}

/**
 * Get deals statistics
 */
export async function getDealsStats(userId?: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  totalAmount: number;
  averageAmount: number;
}> {
  return await invoke("db_get_deals_stats", { userId: userId || null });
}

