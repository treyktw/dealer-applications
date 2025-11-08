/**
 * Local Vehicles Service
 * Manages vehicle data in IndexedDB for standalone operation
 */

import { getDB, type LocalVehicle } from './db';

/**
 * Create a new vehicle
 */
export async function createVehicle(vehicle: Omit<LocalVehicle, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocalVehicle> {
  const db = await getDB();
  const now = Date.now();

  // Check if VIN already exists
  if (vehicle.vin) {
    const existing = await getVehicleByVIN(vehicle.vin);
    if (existing) {
      throw new Error(`Vehicle with VIN ${vehicle.vin} already exists`);
    }
  }

  const newVehicle: LocalVehicle = {
    ...vehicle,
    id: `vehicle_${crypto.randomUUID()}`,
    createdAt: now,
    updatedAt: now,
  };

  await db.add('vehicles', newVehicle);

  console.log('✅ Vehicle created:', newVehicle.id);
  return newVehicle;
}

/**
 * Get vehicle by ID
 */
export async function getVehicle(id: string): Promise<LocalVehicle | undefined> {
  const db = await getDB();
  return await db.get('vehicles', id);
}

/**
 * Get all vehicles
 */
export async function getAllVehicles(): Promise<LocalVehicle[]> {
  const db = await getDB();
  return await db.getAll('vehicles');
}

/**
 * Get vehicle by VIN
 */
export async function getVehicleByVIN(vin: string): Promise<LocalVehicle | undefined> {
  const db = await getDB();
  const vehicles = await db.getAllFromIndex('vehicles', 'by_vin', vin);
  return vehicles[0];
}

/**
 * Get vehicle by stock number
 */
export async function getVehicleByStockNumber(stockNumber: string): Promise<LocalVehicle | undefined> {
  const db = await getDB();
  const vehicles = await db.getAllFromIndex('vehicles', 'by_stock', stockNumber);
  return vehicles[0];
}

/**
 * Update vehicle
 */
export async function updateVehicle(id: string, updates: Partial<LocalVehicle>): Promise<LocalVehicle> {
  const db = await getDB();
  const existing = await db.get('vehicles', id);

  if (!existing) {
    throw new Error(`Vehicle ${id} not found`);
  }

  const updated: LocalVehicle = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: Date.now(),
  };

  await db.put('vehicles', updated);

  console.log('✅ Vehicle updated:', id);
  return updated;
}

/**
 * Delete vehicle
 */
export async function deleteVehicle(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('vehicles', id);
  console.log('✅ Vehicle deleted:', id);
}

/**
 * Search vehicles
 */
export async function searchVehicles(query: string): Promise<LocalVehicle[]> {
  const db = await getDB();
  const allVehicles = await db.getAll('vehicles');

  const lowerQuery = query.toLowerCase();

  return allVehicles.filter(vehicle => {
    const searchString = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`.toLowerCase();
    return (
      searchString.includes(lowerQuery) ||
      vehicle.vin?.toLowerCase().includes(lowerQuery) ||
      vehicle.stockNumber?.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * Get vehicles by status
 */
export async function getVehiclesByStatus(status: string): Promise<LocalVehicle[]> {
  const db = await getDB();
  const allVehicles = await db.getAll('vehicles');
  return allVehicles.filter(v => v.status === status);
}

/**
 * Get recent vehicles
 */
export async function getRecentVehicles(limit: number = 10): Promise<LocalVehicle[]> {
  const db = await getDB();
  const vehicles = await db.getAll('vehicles');

  return vehicles
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/**
 * Get vehicles statistics
 */
export async function getVehiclesStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  totalValue: number;
  averagePrice: number;
}> {
  const db = await getDB();
  const vehicles = await db.getAll('vehicles');

  const byStatus: Record<string, number> = {};
  let totalValue = 0;

  vehicles.forEach(vehicle => {
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

/**
 * Bulk create vehicles
 */
export async function bulkCreateVehicles(vehicles: Omit<LocalVehicle, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<LocalVehicle[]> {
  const db = await getDB();
  const tx = db.transaction('vehicles', 'readwrite');
  const now = Date.now();

  const created: LocalVehicle[] = [];

  for (const vehicle of vehicles) {
    const newVehicle: LocalVehicle = {
      ...vehicle,
      id: `vehicle_${crypto.randomUUID()}`,
      createdAt: now,
      updatedAt: now,
    };
    await tx.store.add(newVehicle);
    created.push(newVehicle);
  }

  await tx.done;

  console.log(`✅ ${created.length} vehicles created`);
  return created;
}
