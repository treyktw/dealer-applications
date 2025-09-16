/* eslint-disable @typescript-eslint/no-explicit-any */
// migrateToConvex.ts
import { api } from "@/convex/_generated/api.js";
import { ConvexHttpClient } from "convex/browser"; // or "convex/node" if running in Node

import { Client } from "pg"; // or your DB client

// 1. Connect to your SQL DB
const db = new Client({
  connectionString: "postgresql://neondb_owner:npg_eCw4RP7IutgN@ep-white-star-a4r52fac-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"  // Set this in your .env
});
await db.connect();

// 2. Connect to Convex
const convex = new ConvexHttpClient("https://greedy-kingfisher-79.convex.cloud"); // Use your Convex deployment URL

// 3. Fetch all data from your DB
async function getAllDealerships() {
  const res = await db.query("SELECT * FROM dealerships");
  return res.rows;
}
async function getAllVehicles() {
  const res = await db.query("SELECT * FROM vehicles");
  return res.rows;
}
async function getAllClients() {
  const res = await db.query("SELECT * FROM clients");
  return res.rows;
}

function mapDealershipRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    phone: row.phone,
    email: row.email,
    website: row.website,
    logo: row.logo,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    s3BucketName: row.s3_bucket_name,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

function mapVehicleRow(row: any) {
  return {
    id: row.id,
    stock: row.stock,
    vin: row.vin,
    make: row.make,
    model: row.model,
    year: row.year,
    trim: row.trim ?? undefined,
    mileage: row.mileage,
    price: row.price,
    exteriorColor: row.exterior_color ?? undefined,
    interiorColor: row.interior_color ?? undefined,
    fuelType: row.fuel_type ?? undefined,
    transmission: row.transmission ?? undefined,
    engine: row.engine ?? undefined,
    description: row.description ?? undefined,
    status: row.status,
    featured: row.featured ?? false,
    dealershipId: row.dealership_id,
    clientId: row.client_id ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    features: row.features ?? undefined,
    images: row.images ?? undefined,
  };
}

function nullToUndefined<T>(obj: T): T {
  // Recursively convert all nulls to undefined
  if (Array.isArray(obj)) {
    return obj.map(nullToUndefined) as any;
  } else if (obj && typeof obj === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = v === null ? undefined : nullToUndefined(v);
    }
    return out;
  }
  return obj;
}

// 4. Migrate to Convex
async function migrateAll() {
  const dealerships = await getAllDealerships();
  for (const d of dealerships) {
    const mapped = mapDealershipRow(d);
    await convex.mutation(api.dealerships.createDealership, nullToUndefined(mapped));
    console.log("Migrated dealership:", d.id);
  }

  const vehicles = await getAllVehicles();
  for (const v of vehicles) {
    await convex.mutation(api.inventory.upsertVehicle, mapVehicleRow(v));
    console.log("Migrated vehicle:", v.id);
  }

  const clients = await getAllClients();
  for (const c of clients) {
    await convex.mutation(api.clients.createClient, c);
    console.log("Migrated client:", c.id);
  }
}

migrateAll()
  .then(() => {
    console.log("Migration complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });