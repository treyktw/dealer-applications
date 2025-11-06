/**
 * IndexedDB Setup for Standalone Desktop App
 * Stores deals, clients, vehicles locally for offline operation
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// Database schema
interface DealerDB extends DBSchema {
  deals: {
    key: string;
    value: LocalDeal;
    indexes: {
      'by_client': string;
      'by_vehicle': string;
      'by_status': string;
      'by_date': number;
    };
  };
  clients: {
    key: string;
    value: LocalClient;
    indexes: {
      'by_email': string;
      'by_name': string;
    };
  };
  vehicles: {
    key: string;
    value: LocalVehicle;
    indexes: {
      'by_vin': string;
      'by_stock': string;
    };
  };
  documents: {
    key: string;
    value: LocalDocument;
    indexes: {
      'by_deal': string;
    };
  };
  settings: {
    key: string;
    value: any;
  };
}

// Type definitions
export interface LocalDeal {
  id: string;
  type: string;
  clientId: string;
  vehicleId: string;
  status: string;
  totalAmount: number;
  saleDate?: number;
  saleAmount?: number;
  salesTax?: number;
  docFee?: number;
  tradeInValue?: number;
  downPayment?: number;
  financedAmount?: number;
  documentIds: string[];
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
}

export interface LocalClient {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  driversLicense?: string;
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
}

export interface LocalVehicle {
  id: string;
  vin: string;
  stockNumber?: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  mileage: number;
  color?: string;
  price: number;
  cost?: number;
  status: string;
  description?: string;
  images?: string[];
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
}

export interface LocalDocument {
  id: string;
  dealId: string;
  type: string;
  filename: string;
  blob: Blob; // PDF stored as blob
  createdAt: number;
  updatedAt: number;
}

const DB_NAME = 'dealer-software';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<DealerDB> | null = null;

/**
 * Initialize IndexedDB
 */
export async function initDB(): Promise<IDBPDatabase<DealerDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<DealerDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Deals store
      if (!db.objectStoreNames.contains('deals')) {
        const dealsStore = db.createObjectStore('deals', { keyPath: 'id' });
        dealsStore.createIndex('by_client', 'clientId');
        dealsStore.createIndex('by_vehicle', 'vehicleId');
        dealsStore.createIndex('by_status', 'status');
        dealsStore.createIndex('by_date', 'createdAt');
      }

      // Clients store
      if (!db.objectStoreNames.contains('clients')) {
        const clientsStore = db.createObjectStore('clients', { keyPath: 'id' });
        clientsStore.createIndex('by_email', 'email');
        clientsStore.createIndex('by_name', 'lastName');
      }

      // Vehicles store
      if (!db.objectStoreNames.contains('vehicles')) {
        const vehiclesStore = db.createObjectStore('vehicles', { keyPath: 'id' });
        vehiclesStore.createIndex('by_vin', 'vin');
        vehiclesStore.createIndex('by_stock', 'stockNumber');
      }

      // Documents store
      if (!db.objectStoreNames.contains('documents')) {
        const documentsStore = db.createObjectStore('documents', { keyPath: 'id' });
        documentsStore.createIndex('by_deal', 'dealId');
      }

      // Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });

  console.log('✅ IndexedDB initialized');
  return dbInstance;
}

/**
 * Get database instance
 */
export async function getDB(): Promise<IDBPDatabase<DealerDB>> {
  if (!dbInstance) {
    return await initDB();
  }
  return dbInstance;
}

/**
 * Clear all data (for testing/reset)
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['deals', 'clients', 'vehicles', 'documents'], 'readwrite');

  await Promise.all([
    tx.objectStore('deals').clear(),
    tx.objectStore('clients').clear(),
    tx.objectStore('vehicles').clear(),
    tx.objectStore('documents').clear(),
  ]);

  await tx.done;
  console.log('✅ All data cleared');
}

/**
 * Get database statistics
 */
export async function getDBStats() {
  const db = await getDB();

  const [dealsCount, clientsCount, vehiclesCount, documentsCount] = await Promise.all([
    db.count('deals'),
    db.count('clients'),
    db.count('vehicles'),
    db.count('documents'),
  ]);

  return {
    deals: dealsCount,
    clients: clientsCount,
    vehicles: vehiclesCount,
    documents: documentsCount,
    total: dealsCount + clientsCount + vehiclesCount + documentsCount,
  };
}

/**
 * Export all data as JSON
 */
export async function exportData(): Promise<string> {
  const db = await getDB();

  const [deals, clients, vehicles] = await Promise.all([
    db.getAll('deals'),
    db.getAll('clients'),
    db.getAll('vehicles'),
  ]);

  const exportData = {
    version: '1.0',
    exportedAt: Date.now(),
    deals,
    clients,
    vehicles,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import data from JSON
 */
export async function importData(jsonData: string): Promise<void> {
  const db = await getDB();
  const data = JSON.parse(jsonData);

  const tx = db.transaction(['deals', 'clients', 'vehicles'], 'readwrite');

  // Import deals
  if (data.deals) {
    for (const deal of data.deals) {
      await tx.objectStore('deals').put(deal);
    }
  }

  // Import clients
  if (data.clients) {
    for (const client of data.clients) {
      await tx.objectStore('clients').put(client);
    }
  }

  // Import vehicles
  if (data.vehicles) {
    for (const vehicle of data.vehicles) {
      await tx.objectStore('vehicles').put(vehicle);
    }
  }

  await tx.done;
  console.log('✅ Data imported successfully');
}
