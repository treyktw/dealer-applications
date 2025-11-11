/**
 * SQLite Vehicles Service
 * Wraps Tauri commands for vehicle CRUD operations
 */

import { invoke } from "@tauri-apps/api/core";

export interface LocalVehicle {
  id: string;
  vin: string;
  stock_number?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  body?: string;
  doors?: number;
  transmission?: string;
  engine?: string;
  cylinders?: number;
  title_number?: string;
  mileage: number;
  color?: string;
  price: number;
  cost?: number;
  status: string;
  description?: string;
  images?: string[];
  created_at: number;
  updated_at: number;
  synced_at?: number;
}

/**
 * Create a new vehicle
 */
export async function createVehicle(
  vehicle: Omit<LocalVehicle, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<LocalVehicle> {
  const now = Date.now();
  const vehicleData: any = {
    ...vehicle,
    id: vehicle.id || `vehicle_${crypto.randomUUID()}`,
    created_at: now,
    updated_at: now,
  };

  // Only include images if provided, and convert to JSON string
  if (vehicle.images && vehicle.images.length > 0) {
    vehicleData.images = JSON.stringify(vehicle.images);
  } else {
    vehicleData.images = null;
  }

  const result = await invoke<any>("db_create_vehicle", {
    vehicle: vehicleData,
  });

  return {
    ...result,
    images: result.images ? JSON.parse(result.images) : undefined,
  };
}

/**
 * Get vehicle by ID
 */
export async function getVehicle(
  id: string
): Promise<LocalVehicle | undefined> {
  const result = await invoke<any>("db_get_vehicle", { id });
  if (!result) return undefined;

  return {
    ...result,
    images: result.images ? JSON.parse(result.images) : undefined,
  };
}

/**
 * Get all vehicles
 */
export async function getAllVehicles(userId?: string): Promise<LocalVehicle[]> {
  const vehicles = await invoke<any[]>("db_get_all_vehicles", { userId: userId || null });
  return vehicles.map((v) => ({
    ...v,
    images: v.images ? JSON.parse(v.images) : undefined,
  }));
}

/**
 * Get vehicle by VIN
 */
export async function getVehicleByVIN(
  vin: string
): Promise<LocalVehicle | undefined> {
  const result = await invoke<any>("db_get_vehicle_by_vin", { vin });
  if (!result) return undefined;

  return {
    ...result,
    images: result.images ? JSON.parse(result.images) : undefined,
  };
}

/**
 * Get vehicle by stock number
 */
export async function getVehicleByStockNumber(
  stockNumber: string
): Promise<LocalVehicle | undefined> {
  const result = await invoke<any>("db_get_vehicle_by_stock", {
    stock_number: stockNumber,
  });
  if (!result) return undefined;

  return {
    ...result,
    images: result.images ? JSON.parse(result.images) : undefined,
  };
}

/**
 * Update vehicle
 */
export async function updateVehicle(
  id: string,
  updates: Partial<LocalVehicle>
): Promise<LocalVehicle> {
  const updateData: any = { ...updates };
  
  // Remove images from updateData if not provided, or convert to JSON string if provided
  if (updates.images !== undefined) {
    if (updates.images && updates.images.length > 0) {
      updateData.images = JSON.stringify(updates.images);
    } else {
      updateData.images = null;
    }
  }
  // If images is not in updates, don't include it (don't update the field)

  const result = await invoke<any>("db_update_vehicle", {
    id,
    updates: updateData,
  });

  return {
    ...result,
    images: result.images ? JSON.parse(result.images) : undefined,
  };
}

/**
 * Delete vehicle
 */
export async function deleteVehicle(id: string): Promise<void> {
  await invoke("db_delete_vehicle", { id });
}

/**
 * Search vehicles
 */
export async function searchVehicles(query: string): Promise<LocalVehicle[]> {
  const vehicles = await invoke<any[]>("db_search_vehicles", { query });
  return vehicles.map((v) => ({
    ...v,
    images: v.images ? JSON.parse(v.images) : undefined,
  }));
}

/**
 * Get vehicles by status
 */
export async function getVehiclesByStatus(
  status: string
): Promise<LocalVehicle[]> {
  const vehicles = await invoke<any[]>("db_get_vehicles_by_status", {
    status,
  });
  return vehicles.map((v) => ({
    ...v,
    images: v.images ? JSON.parse(v.images) : undefined,
  }));
}

/**
 * Get vehicles statistics
 */
export async function getVehiclesStats(userId?: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
  totalValue: number;
  averagePrice: number;
}> {
  const vehicles = await getAllVehicles(userId);

  const byStatus: Record<string, number> = {};
  let totalValue = 0;

  vehicles.forEach((vehicle) => {
    byStatus[vehicle.status] = (byStatus[vehicle.status] || 0) + 1;
    totalValue += vehicle.price;
  });

  return {
    total: vehicles.length,
    byStatus,
    totalValue,
    averagePrice: vehicles.length > 0 ? totalValue / vehicles.length : 0,
  };
}

