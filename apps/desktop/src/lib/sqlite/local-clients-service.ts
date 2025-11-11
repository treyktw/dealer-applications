/**
 * SQLite Clients Service
 * Wraps Tauri commands for client CRUD operations
 */

import { invoke } from "@tauri-apps/api/core";

export interface LocalClient {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  drivers_license?: string;
  created_at: number;
  updated_at: number;
  synced_at?: number;
}

/**
 * Create a new client
 */
export async function createClient(
  client: Omit<LocalClient, "id" | "created_at" | "updated_at"> & { id?: string },
  userId?: string
): Promise<LocalClient> {
  console.log("🔍 [CREATE-CLIENT] Function called with userId:", userId);
  console.log("  - typeof userId:", typeof userId);
  console.log("  - userId value:", JSON.stringify(userId));
  
  const now = Date.now();
  const newClient: LocalClient = {
    ...client,
    id: client.id || `client_${crypto.randomUUID()}`,
    created_at: now,
    updated_at: now,
  };

  // Tauri automatically converts camelCase to snake_case for Rust parameters
  // Other functions use userId (camelCase), so we'll use that too
  if (!userId) {
    console.error("❌ [CREATE-CLIENT] userId is missing!");
    throw new Error("User ID is required");
  }
  
  console.log("🔍 [CREATE-CLIENT] Passing to Rust:");
  console.log("  - client:", newClient.id);
  console.log("  - userId:", userId);
  console.log("  - typeof userId:", typeof userId);

  // Use camelCase to match other Tauri invocations - Tauri will convert to snake_case
  return await invoke<LocalClient>("db_create_client", {
    client: newClient,
    userId: userId, // camelCase - Tauri converts to user_id in Rust
  });
}

/**
 * Get client by ID
 */
export async function getClient(id: string, userId?: string): Promise<LocalClient | undefined> {
  if (!userId) {
    console.error("❌ [GET-CLIENT] userId is missing!");
    throw new Error("User ID is required");
  }
  
  return await invoke<LocalClient | null>("db_get_client", { 
    id,
    userId: userId, // camelCase - Tauri converts to user_id in Rust
  }).then(
    (result) => result || undefined
  );
}

/**
 * Get all clients
 */
export async function getAllClients(userId?: string): Promise<LocalClient[]> {
  return await invoke<LocalClient[]>("db_get_all_clients", { userId: userId || null });
}

/**
 * Update client
 */
export async function updateClient(
  id: string,
  updates: Partial<LocalClient>
): Promise<LocalClient> {
  return await invoke<LocalClient>("db_update_client", { id, updates });
}

/**
 * Delete client
 */
export async function deleteClient(id: string): Promise<void> {
  await invoke("db_delete_client", { id });
}

/**
 * Search clients
 */
export async function searchClients(query: string): Promise<LocalClient[]> {
  return await invoke<LocalClient[]>("db_search_clients", { query });
}

