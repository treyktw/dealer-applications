/**
 * Data Export/Import Utilities
 *
 * Provides functionality to export and import dealership data for:
 * - Backup purposes
 * - Migration between instances
 * - Standalone desktop app data portability
 */

import { internalMutation, query } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";

/**
 * Export complete dealership data
 * Includes: dealership info, users, deals, clients, vehicles, documents, etc.
 */
export const exportDealershipData = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    // Verify user has access to this dealership
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.dealershipId !== args.dealershipId) {
      throw new Error("Access denied");
    }

    // Only admins can export data
    if (user.role !== "ADMIN") {
      throw new Error("Admin privileges required");
    }

    console.log(`Exporting data for dealership: ${args.dealershipId}`);

    // Get dealership
    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership) {
      throw new Error("Dealership not found");
    }

    // Get all related data
    const [
      users,
      clients,
      vehicles,
      deals,
      documents,
      templates,
      notifications,
      fileUploads,
    ] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", args.dealershipId)
        )
        .collect(),
      ctx.db
        .query("clients")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", args.dealershipId.toString())
        )
        .collect(),
      ctx.db
        .query("vehicles")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", args.dealershipId.toString())
        )
        .collect(),
      ctx.db
        .query("deals")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", args.dealershipId.toString())
        )
        .collect(),
      ctx.db.query("documents").collect(), // Will filter by dealId
      ctx.db
        .query("documentTemplates")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", args.dealershipId)
        )
        .collect(),
      ctx.db
        .query("notifications")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", args.dealershipId)
        )
        .collect(),
      ctx.db
        .query("file_uploads")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", args.dealershipId)
        )
        .collect(),
    ]);

    // Get deal IDs for filtering documents
    const dealIds = new Set(deals.map((d) => d._id));
    const dealDocuments = documents.filter((doc) => dealIds.has(doc.dealId));

    const exportData = {
      version: "1.0.0",
      exportedAt: Date.now(),
      dealership: {
        ...dealership,
        // Remove sensitive data
        s3AccessKeyId: undefined,
        s3SecretKey: undefined,
        taxId: undefined,
      },
      users: users.map((u) => ({
        ...u,
        // Remove sensitive clerk data
        clerkId: undefined,
      })),
      clients,
      vehicles,
      deals,
      documents: dealDocuments,
      templates,
      notifications,
      fileUploads,
      metadata: {
        totalUsers: users.length,
        totalClients: clients.length,
        totalVehicles: vehicles.length,
        totalDeals: deals.length,
        totalDocuments: dealDocuments.length,
      },
    };

    console.log(`Export completed:`, exportData.metadata);

    return exportData;
  },
});

/**
 * Import dealership data
 * Used for restoring backups or migrating data
 */
export const importDealershipData = internalMutation({
  args: {
    data: v.any(), // The exported data structure
    dealershipId: v.id("dealerships"),
    overwrite: v.optional(v.boolean()), // Whether to overwrite existing data
  },
  handler: async (ctx, args) => {
    console.log(`Starting data import for dealership: ${args.dealershipId}`);

    const data = args.data;

    // Validate data structure
    if (!data.version || !data.exportedAt) {
      throw new Error("Invalid import data format");
    }

    // Map old IDs to new IDs for relationship preservation
    const idMaps: {
      clients: Map<string, Id<"clients">>;
      vehicles: Map<string, Id<"vehicles">>;
      deals: Map<string, Id<"deals">>;
      documents: Map<string, Id<"documents">>;
      templates: Map<string, Id<"documentTemplates">>;
    } = {
      clients: new Map(),
      vehicles: new Map(),
      deals: new Map(),
      documents: new Map(),
      templates: new Map(),
    };

    const stats = {
      clientsImported: 0,
      vehiclesImported: 0,
      dealsImported: 0,
      documentsImported: 0,
      templatesImported: 0,
    };

    // Import clients
    if (data.clients) {
      for (const client of data.clients) {
        const oldId = client._id;
        const { _id, _creationTime, ...clientData } = client;

        const newId = await ctx.db.insert("clients", {
          ...clientData,
          dealershipId: args.dealershipId.toString(),
        });

        idMaps.clients.set(oldId, newId);
        stats.clientsImported++;
      }
    }

    // Import vehicles
    if (data.vehicles) {
      for (const vehicle of data.vehicles) {
        const oldId = vehicle._id;
        const { _id, _creationTime, ...vehicleData } = vehicle;

        const newId = await ctx.db.insert("vehicles", {
          ...vehicleData,
          dealershipId: args.dealershipId.toString(),
        });

        idMaps.vehicles.set(oldId, newId);
        stats.vehiclesImported++;
      }
    }

    // Import deals
    if (data.deals) {
      for (const deal of data.deals) {
        const oldId = deal._id;
        const { _id, _creationTime, ...dealData } = deal;

        // Map client and vehicle IDs
        const clientId = idMaps.clients.get(dealData.clientId);
        const vehicleId = idMaps.vehicles.get(dealData.vehicleId);

        if (!clientId || !vehicleId) {
          console.warn(
            `Skipping deal ${oldId}: missing client or vehicle mapping`
          );
          continue;
        }

        const newId = await ctx.db.insert("deals", {
          ...dealData,
          dealershipId: args.dealershipId.toString(),
          clientId,
          vehicleId,
        });

        idMaps.deals.set(oldId, newId);
        stats.dealsImported++;
      }
    }

    // Import documents
    if (data.documents) {
      for (const document of data.documents) {
        const oldId = document._id;
        const { _id, _creationTime, ...docData } = document;

        // Map deal ID
        const dealId = idMaps.deals.get(docData.dealId);
        if (!dealId) {
          console.warn(`Skipping document ${oldId}: missing deal mapping`);
          continue;
        }

        const newId = await ctx.db.insert("documents", {
          ...docData,
          dealId,
        });

        idMaps.documents.set(oldId, newId);
        stats.documentsImported++;
      }
    }

    // Import templates
    if (data.templates) {
      for (const template of data.templates) {
        const oldId = template._id;
        const { _id, _creationTime, ...templateData } = template;

        const newId = await ctx.db.insert("documentTemplates", {
          ...templateData,
          dealershipId: args.dealershipId,
        });

        idMaps.templates.set(oldId, newId);
        stats.templatesImported++;
      }
    }

    console.log("Import completed:", stats);

    return {
      success: true,
      stats,
    };
  },
});

/**
 * Export deals with specific filters
 */
export const exportDeals = query({
  args: {
    dealershipId: v.id("dealerships"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user has access
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.dealershipId !== args.dealershipId) {
      throw new Error("Access denied");
    }

    // Query deals with filters
    const dealsQuery = ctx.db
      .query("deals")
      .withIndex("by_dealership", (q) =>
        q.eq("dealershipId", args.dealershipId.toString())
      );

    let deals = await dealsQuery.collect();

    // Apply filters
    if (args.startDate !== undefined) {
      const startDate = args.startDate;
      deals = deals.filter((d) => d.createdAt >= startDate);
    }
    if (args.endDate !== undefined) {
      const endDate = args.endDate;
      deals = deals.filter((d) => d.createdAt <= endDate);
    }
    if (args.status !== undefined) {
      const status = args.status;
      deals = deals.filter((d) => d.status === status);
    }

    // Get related data for each deal
    const dealsWithData = await Promise.all(
      deals.map(async (deal) => {
        const [client, vehicle, documents] = await Promise.all([
          ctx.db.get(deal.clientId),
          ctx.db.get(deal.vehicleId),
          ctx.db
            .query("documents")
            .withIndex("by_deal", (q) => q.eq("dealId", deal._id))
            .collect(),
        ]);

        return {
          deal,
          client,
          vehicle,
          documents,
        };
      })
    );

    return {
      version: "1.0.0",
      exportedAt: Date.now(),
      filters: {
        startDate: args.startDate,
        endDate: args.endDate,
        status: args.status,
      },
      deals: dealsWithData,
      metadata: {
        totalDeals: dealsWithData.length,
      },
    };
  },
});

/**
 * Get export status and metadata
 */
export const getExportMetadata = query({
  args: {
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.dealershipId !== args.dealershipId) {
      throw new Error("Access denied");
    }

    const [
      usersCount,
      clientsCount,
      vehiclesCount,
      dealsCount,
      templatesCount,
    ] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", args.dealershipId)
        )
        .collect()
        .then((r) => r.length),
      ctx.db
        .query("clients")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", args.dealershipId.toString())
        )
        .collect()
        .then((r) => r.length),
      ctx.db
        .query("vehicles")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", args.dealershipId.toString())
        )
        .collect()
        .then((r) => r.length),
      ctx.db
        .query("deals")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", args.dealershipId.toString())
        )
        .collect()
        .then((r) => r.length),
      ctx.db
        .query("documentTemplates")
        .withIndex("by_dealership", (q) =>
          q.eq("dealershipId", args.dealershipId)
        )
        .collect()
        .then((r) => r.length),
    ]);

    return {
      dealershipId: args.dealershipId,
      totalUsers: usersCount,
      totalClients: clientsCount,
      totalVehicles: vehiclesCount,
      totalDeals: dealsCount,
      totalTemplates: templatesCount,
      estimatedExportSize:
        "~" +
        Math.ceil(
          (usersCount + clientsCount + vehiclesCount + dealsCount * 2) / 100
        ) +
        "MB",
    };
  },
});
