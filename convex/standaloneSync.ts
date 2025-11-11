// convex/standaloneSync.ts
// Sync operations for standalone desktop users
// Handles bidirectional sync between SQLite (local) and Convex (cloud)

import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { s3Client, BUCKET_NAME } from "./lib/s3/client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Upload document to S3 (server-side)
 * Desktop app sends document as base64, Convex uploads to S3 using server credentials
 */
export const uploadDocumentToS3 = action({
  args: {
    userId: v.string(),
    dealId: v.string(),
    documentId: v.string(),
    filename: v.string(),
    documentBase64: v.string(), // Base64-encoded PDF
  },
  handler: async (_ctx, args) => {
    const { userId, dealId, documentId, filename, documentBase64 } = args;

    // Convert base64 to buffer
    const base64String = documentBase64.replace(/^data:application\/pdf;base64,/, "");
    const buffer = Buffer.from(base64String, "base64");

    // Generate S3 key: standalone/{userId}/deals/{dealId}/documents/{documentId}_{filename}
    const s3Key = `standalone/${userId}/deals/${dealId}/documents/${documentId}_${filename}`;

    // Upload to S3 using server-side credentials
    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: buffer,
        ContentType: "application/pdf",
      })
    );

    return { success: true, s3Key };
  },
});

/**
 * Get document download URL from S3 (presigned URL)
 */
export const getDocumentDownloadUrl = action({
  args: {
    s3Key: v.string(),
    expiresIn: v.optional(v.number()), // Default 1 hour
  },
  handler: async (_ctx, args) => {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: args.s3Key,
    });

    const url = await getSignedUrl(s3Client, command, {
      expiresIn: args.expiresIn || 3600,
    });

    return { url };
  },
});

/**
 * Upload client data from desktop to Convex
 * Automatic conflict resolution: last-write-wins (based on updatedAt timestamp)
 */
export const uploadClient = mutation({
  args: {
    userId: v.string(),
    client: v.object({
      id: v.string(),
      first_name: v.string(),
      last_name: v.string(),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      zip_code: v.optional(v.string()),
      drivers_license: v.optional(v.string()),
      created_at: v.number(),
      updated_at: v.number(),
      synced_at: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, client } = args;

    // Check if client already exists
    const existing = await ctx.db
      .query("standalone_clients")
      .withIndex("by_local_id", (q) => q.eq("userId", userId).eq("localId", client.id))
      .first();

    const clientData = {
      userId,
      localId: client.id,
      firstName: client.first_name,
      lastName: client.last_name,
      email: client.email ?? undefined, // Convert null to undefined
      phone: client.phone ?? undefined, // Convert null to undefined
      address: client.address ?? undefined, // Convert null to undefined
      city: client.city ?? undefined, // Convert null to undefined
      state: client.state ?? undefined, // Convert null to undefined
      zipCode: client.zip_code ?? undefined, // Convert null to undefined
      driversLicense: client.drivers_license ?? undefined, // Convert null to undefined
      createdAt: client.created_at,
      updatedAt: client.updated_at,
      syncedAt: Date.now(),
    };

    let clientId: Id<"standalone_clients">;
    if (existing) {
      // Automatic conflict resolution: last-write-wins
      // If local update is newer, overwrite; otherwise keep existing
      if (client.updated_at >= existing.updatedAt) {
        await ctx.db.patch(existing._id, clientData);
      }
      clientId = existing._id;
    } else {
      // Insert new record
      clientId = await ctx.db.insert("standalone_clients", clientData);
    }

    return { success: true, id: clientId };
  },
});

/**
 * Upload vehicle data from desktop to Convex
 */
export const uploadVehicle = mutation({
  args: {
    userId: v.string(),
    vehicle: v.object({
      id: v.string(),
      vin: v.string(),
      stock_number: v.optional(v.string()),
      year: v.number(),
      make: v.string(),
      model: v.string(),
      trim: v.optional(v.string()),
      body: v.optional(v.string()),
      doors: v.optional(v.number()),
      transmission: v.optional(v.string()),
      engine: v.optional(v.string()),
      cylinders: v.optional(v.number()),
      title_number: v.optional(v.string()),
      mileage: v.number(),
      color: v.optional(v.string()),
      price: v.number(),
      cost: v.number(),
      status: v.string(),
      description: v.optional(v.string()),
      created_at: v.number(),
      updated_at: v.number(),
      synced_at: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, vehicle } = args;

    // Check if vehicle already exists
    const existing = await ctx.db
      .query("standalone_vehicles")
      .withIndex("by_local_id", (q) => q.eq("userId", userId).eq("localId", vehicle.id))
      .first();

    const vehicleData = {
      userId,
      localId: vehicle.id,
      vin: vehicle.vin,
      stockNumber: vehicle.stock_number,
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      body: vehicle.body,
      doors: vehicle.doors,
      transmission: vehicle.transmission,
      engine: vehicle.engine,
      cylinders: vehicle.cylinders,
      titleNumber: vehicle.title_number,
      mileage: vehicle.mileage,
      color: vehicle.color,
      price: vehicle.price,
      cost: vehicle.cost,
      status: vehicle.status,
      description: vehicle.description,
      createdAt: vehicle.created_at,
      updatedAt: vehicle.updated_at,
      syncedAt: Date.now(),
    };

    let vehicleId: Id<"standalone_vehicles">;
    if (existing) {
      // Automatic conflict resolution: last-write-wins
      if (vehicle.updated_at >= existing.updatedAt) {
        await ctx.db.patch(existing._id, vehicleData);
      }
      vehicleId = existing._id;
    } else {
      // Insert new record
      vehicleId = await ctx.db.insert("standalone_vehicles", vehicleData);
    }

    return { success: true, id: vehicleId };
  },
});

/**
 * Upload deal data from desktop to Convex
 */
export const uploadDeal = mutation({
  args: {
    userId: v.string(),
    deal: v.object({
      id: v.string(),
      type: v.string(),
      client_id: v.string(),
      vehicle_id: v.string(),
      status: v.string(),
      total_amount: v.number(),
      sale_date: v.optional(v.number()),
      sale_amount: v.optional(v.number()),
      sales_tax: v.optional(v.number()),
      doc_fee: v.optional(v.number()),
      trade_in_value: v.optional(v.number()),
      down_payment: v.optional(v.number()),
      financed_amount: v.optional(v.number()),
      document_ids: v.array(v.string()),
      cobuyer_data: v.optional(
        v.object({
          firstName: v.string(),
          lastName: v.string(),
          email: v.optional(v.string()),
          phone: v.optional(v.string()),
          address: v.optional(v.string()),
          addressLine2: v.optional(v.string()),
          city: v.optional(v.string()),
          state: v.optional(v.string()),
          zipCode: v.optional(v.string()),
          driversLicense: v.optional(v.string()),
        })
      ),
      created_at: v.number(),
      updated_at: v.number(),
      synced_at: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, deal } = args;

    // Check if deal already exists
    const existing = await ctx.db
      .query("standalone_deals")
      .withIndex("by_local_id", (q) => q.eq("userId", userId).eq("localId", deal.id))
      .first();

    const dealData = {
      userId,
      localId: deal.id,
      type: deal.type,
      clientLocalId: deal.client_id,
      vehicleLocalId: deal.vehicle_id,
      status: deal.status,
      totalAmount: deal.total_amount,
      saleDate: deal.sale_date,
      saleAmount: deal.sale_amount,
      salesTax: deal.sales_tax,
      docFee: deal.doc_fee,
      tradeInValue: deal.trade_in_value,
      downPayment: deal.down_payment,
      financedAmount: deal.financed_amount,
      documentIds: deal.document_ids,
      cobuyerData: deal.cobuyer_data,
      createdAt: deal.created_at,
      updatedAt: deal.updated_at,
      syncedAt: Date.now(),
    };

    let dealId: Id<"standalone_deals">;
    if (existing) {
      // Automatic conflict resolution: last-write-wins
      if (deal.updated_at >= existing.updatedAt) {
        await ctx.db.patch(existing._id, dealData);
      }
      dealId = existing._id;
    } else {
      // Insert new record
      dealId = await ctx.db.insert("standalone_deals", dealData);
    }

    return { success: true, id: dealId };
  },
});

/**
 * Upload document metadata from desktop to Convex
 * Note: Document file should already be uploaded to S3 via uploadDocumentToS3 action
 */
export const uploadDocumentMetadata = mutation({
  args: {
    userId: v.string(),
    document: v.object({
      id: v.string(),
      deal_id: v.string(),
      type: v.string(),
      filename: v.string(),
      s3_key: v.string(), // S3 key where document is stored
      file_size: v.optional(v.number()),
      file_checksum: v.optional(v.string()),
      created_at: v.number(),
      updated_at: v.number(),
      synced_at: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, document } = args;

    // Check if document already exists
    const existing = await ctx.db
      .query("standalone_documents")
      .withIndex("by_local_id", (q) => q.eq("userId", userId).eq("localId", document.id))
      .first();

    const docData = {
      userId,
      localId: document.id,
      dealLocalId: document.deal_id,
      type: document.type,
      filename: document.filename,
      s3Key: document.s3_key,
      fileSize: document.file_size,
      fileChecksum: document.file_checksum,
      createdAt: document.created_at,
      updatedAt: document.updated_at,
      syncedAt: Date.now(),
    };

    let docId: Id<"standalone_documents">;
    if (existing) {
      // Automatic conflict resolution: last-write-wins
      if (document.updated_at >= existing.updatedAt) {
        await ctx.db.patch(existing._id, docData);
      }
      docId = existing._id;
    } else {
      // Insert new record
      docId = await ctx.db.insert("standalone_documents", docData);
    }

    return { success: true, id: docId };
  },
});

/**
 * Get changes from Convex for a standalone user
 * Returns all items modified since lastSyncAt
 */
export const getChanges = query({
  args: {
    userId: v.string(),
    lastSyncAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { userId, lastSyncAt } = args;

    const since = lastSyncAt || 0;

    // Get all changes since lastSyncAt
    const clients = await ctx.db
      .query("standalone_clients")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId).gt("updatedAt", since))
      .collect();

    const vehicles = await ctx.db
      .query("standalone_vehicles")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId).gt("updatedAt", since))
      .collect();

    const deals = await ctx.db
      .query("standalone_deals")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId).gt("updatedAt", since))
      .collect();

    const documents = await ctx.db
      .query("standalone_documents")
      .withIndex("by_user_updated", (q) => q.eq("userId", userId).gt("updatedAt", since))
      .collect();

    return {
      clients,
      vehicles,
      deals,
      documents,
      syncedAt: Date.now(),
    };
  },
});
