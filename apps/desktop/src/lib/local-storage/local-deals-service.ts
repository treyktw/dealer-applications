/**
 * Local Deals Service
 * Manages deal data in IndexedDB for standalone operation
 */

import { getDB, LocalDeal } from './db';

/**
 * Create a new deal
 */
export async function createDeal(deal: Omit<LocalDeal, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocalDeal> {
  const db = await getDB();
  const now = Date.now();

  const newDeal: LocalDeal = {
    ...deal,
    id: `deal_${crypto.randomUUID()}`,
    createdAt: now,
    updatedAt: now,
  };

  await db.add('deals', newDeal);

  console.log('✅ Deal created:', newDeal.id);
  return newDeal;
}

/**
 * Get deal by ID
 */
export async function getDeal(id: string): Promise<LocalDeal | undefined> {
  const db = await getDB();
  return await db.get('deals', id);
}

/**
 * Get all deals
 */
export async function getAllDeals(): Promise<LocalDeal[]> {
  const db = await getDB();
  return await db.getAll('deals');
}

/**
 * Get deals by client
 */
export async function getDealsByClient(clientId: string): Promise<LocalDeal[]> {
  const db = await getDB();
  return await db.getAllFromIndex('deals', 'by_client', clientId);
}

/**
 * Get deals by vehicle
 */
export async function getDealsByVehicle(vehicleId: string): Promise<LocalDeal[]> {
  const db = await getDB();
  return await db.getAllFromIndex('deals', 'by_vehicle', vehicleId);
}

/**
 * Get deals by status
 */
export async function getDealsByStatus(status: string): Promise<LocalDeal[]> {
  const db = await getDB();
  return await db.getAllFromIndex('deals', 'by_status', status);
}

/**
 * Update deal
 */
export async function updateDeal(id: string, updates: Partial<LocalDeal>): Promise<LocalDeal> {
  const db = await getDB();
  const existing = await db.get('deals', id);

  if (!existing) {
    throw new Error(`Deal ${id} not found`);
  }

  const updated: LocalDeal = {
    ...existing,
    ...updates,
    id: existing.id, // Prevent ID change
    updatedAt: Date.now(),
  };

  await db.put('deals', updated);

  console.log('✅ Deal updated:', id);
  return updated;
}

/**
 * Delete deal
 */
export async function deleteDeal(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('deals', id);
  console.log('✅ Deal deleted:', id);
}

/**
 * Search deals
 */
export async function searchDeals(query: string): Promise<LocalDeal[]> {
  const db = await getDB();
  const allDeals = await db.getAll('deals');

  const lowerQuery = query.toLowerCase();

  return allDeals.filter(deal => {
    return (
      deal.id.toLowerCase().includes(lowerQuery) ||
      deal.status.toLowerCase().includes(lowerQuery) ||
      deal.type.toLowerCase().includes(lowerQuery)
    );
  });
}

/**
 * Get recent deals
 */
export async function getRecentDeals(limit: number = 10): Promise<LocalDeal[]> {
  const db = await getDB();
  const deals = await db.getAll('deals');

  return deals
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/**
 * Get deals statistics
 */
export async function getDealsStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  totalAmount: number;
  averageAmount: number;
}> {
  const db = await getDB();
  const deals = await db.getAll('deals');

  const byStatus: Record<string, number> = {};
  let totalAmount = 0;

  deals.forEach(deal => {
    byStatus[deal.status] = (byStatus[deal.status] || 0) + 1;
    totalAmount += deal.totalAmount;
  });

  return {
    total: deals.length,
    byStatus,
    totalAmount,
    averageAmount: deals.length > 0 ? totalAmount / deals.length : 0,
  };
}

/**
 * Bulk create deals
 */
export async function bulkCreateDeals(deals: Omit<LocalDeal, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<LocalDeal[]> {
  const db = await getDB();
  const tx = db.transaction('deals', 'readwrite');
  const now = Date.now();

  const created: LocalDeal[] = [];

  for (const deal of deals) {
    const newDeal: LocalDeal = {
      ...deal,
      id: `deal_${crypto.randomUUID()}`,
      createdAt: now,
      updatedAt: now,
    };
    await tx.store.add(newDeal);
    created.push(newDeal);
  }

  await tx.done;

  console.log(`✅ ${created.length} deals created`);
  return created;
}
