/**
 * Local Clients Service
 * Manages client data in IndexedDB for standalone operation
 */

import { getDB, LocalClient } from './db';

/**
 * Create a new client
 */
export async function createClient(client: Omit<LocalClient, 'id' | 'createdAt' | 'updatedAt'>): Promise<LocalClient> {
  const db = await getDB();
  const now = Date.now();

  const newClient: LocalClient = {
    ...client,
    id: `client_${crypto.randomUUID()}`,
    createdAt: now,
    updatedAt: now,
  };

  await db.add('clients', newClient);

  console.log('✅ Client created:', newClient.id);
  return newClient;
}

/**
 * Get client by ID
 */
export async function getClient(id: string): Promise<LocalClient | undefined> {
  const db = await getDB();
  return await db.get('clients', id);
}

/**
 * Get all clients
 */
export async function getAllClients(): Promise<LocalClient[]> {
  const db = await getDB();
  return await db.getAll('clients');
}

/**
 * Get client by email
 */
export async function getClientByEmail(email: string): Promise<LocalClient | undefined> {
  const db = await getDB();
  const clients = await db.getAllFromIndex('clients', 'by_email', email);
  return clients[0];
}

/**
 * Update client
 */
export async function updateClient(id: string, updates: Partial<LocalClient>): Promise<LocalClient> {
  const db = await getDB();
  const existing = await db.get('clients', id);

  if (!existing) {
    throw new Error(`Client ${id} not found`);
  }

  const updated: LocalClient = {
    ...existing,
    ...updates,
    id: existing.id,
    updatedAt: Date.now(),
  };

  await db.put('clients', updated);

  console.log('✅ Client updated:', id);
  return updated;
}

/**
 * Delete client
 */
export async function deleteClient(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('clients', id);
  console.log('✅ Client deleted:', id);
}

/**
 * Search clients
 */
export async function searchClients(query: string): Promise<LocalClient[]> {
  const db = await getDB();
  const allClients = await db.getAll('clients');

  const lowerQuery = query.toLowerCase();

  return allClients.filter(client => {
    const fullName = `${client.firstName} ${client.lastName}`.toLowerCase();
    return (
      fullName.includes(lowerQuery) ||
      client.email?.toLowerCase().includes(lowerQuery) ||
      client.phone?.includes(query)
    );
  });
}

/**
 * Get recent clients
 */
export async function getRecentClients(limit: number = 10): Promise<LocalClient[]> {
  const db = await getDB();
  const clients = await db.getAll('clients');

  return clients
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

/**
 * Bulk create clients
 */
export async function bulkCreateClients(clients: Omit<LocalClient, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<LocalClient[]> {
  const db = await getDB();
  const tx = db.transaction('clients', 'readwrite');
  const now = Date.now();

  const created: LocalClient[] = [];

  for (const client of clients) {
    const newClient: LocalClient = {
      ...client,
      id: `client_${crypto.randomUUID()}`,
      createdAt: now,
      updatedAt: now,
    };
    await tx.store.add(newClient);
    created.push(newClient);
  }

  await tx.done;

  console.log(`✅ ${created.length} clients created`);
  return created;
}
