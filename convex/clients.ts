import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
// import type { Id } from "./_generated/dataModel";
// import { nanoid } from "nanoid";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  canTransitionClientStatus,
  ClientStatus,
  getClientStatusLabel,
  ClientStatusType,
} from "./lib/statuses";

export const createClient = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.optional(v.union(v.literal("LEAD"), v.literal("CUSTOMER"), v.literal("PREVIOUS"))),
    notes: v.optional(v.string()),
    clientId: v.string(),
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("create client called with args", args);
    const now = Date.now();
    const clientId = await ctx.db.insert("clients", {
      client_id: args.clientId,
      firstName: args.firstName,
      lastName: args.lastName,
      email: args.email ?? undefined,
      phone: args.phone ?? undefined,
      address: args.address ?? undefined,
      city: args.city ?? undefined,
      state: args.state ?? undefined,
      zipCode: args.zipCode ?? undefined,
      source: args.source ?? undefined,
      status: args.status ?? "LEAD",
      notes: args.notes ?? undefined,
      dealershipId: args.dealershipId,
      createdAt: now,
      updatedAt: now,
    });
    return { clientId };
  },
});

export const getClientById = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.clientId);
  },
});

export const updateClient = mutation({
  args: {
    clientId: v.id("clients"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.optional(v.union(v.literal("LEAD"), v.literal("CUSTOMER"), v.literal("PREVIOUS"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { clientId, ...fields } = args;
    await ctx.db.patch(clientId, fields);
    return { success: true };
  },
});

export const getClientVehicles = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vehicles")
      .filter((q) => q.eq(q.field("clientId"), args.clientId))
      .order("desc")
      .collect();
  },
});

export const getClientActivities = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("activities")
      .filter((q) => q.eq(q.field("clientId"), args.clientId))
      .order("desc")
      .collect();
  },
});

export const deleteClient = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.clientId);
    return { success: true };
  },
});

export const addClientNote = mutation({
  args: {
    clientId: v.id("clients"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the client to get dealershipId
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");
    const now = Date.now();
    await ctx.db.insert("activities", {
      type: "NOTE",
      content: args.content,
      clientId: args.clientId,
      dealershipId: client.dealershipId,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true };
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const activeClients = clients.filter(c => c.status === "CUSTOMER" || c.status === "LEAD").length;
    const leadsThisMonth = clients.filter(c => {
      if (c.status !== "LEAD") return false;
      const d = new Date(c.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    return {
      activeClients,
      leadsThisMonth,
    };
  },
});

// Bulk delete clients by IDs
export const bulkDeleteClients = mutation({
  args: { clientIds: v.array(v.id("clients")) },
  handler: async (ctx, args) => {
    let deletedCount = 0;
    for (const clientId of args.clientIds) {
      await ctx.db.delete(clientId);
      deletedCount++;
    }
    return { deletedCount };
  },
});


// Import clients from CSV
export const importClients = action({
  args: {
    fileContent: v.string(),
    fileName: v.string(),
    dealershipId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; importedCount: number; errors?: string[] }> => {
    console.log("🚀 Starting client import");
    console.log("📁 File:", args.fileName);
    console.log("🏢 Dealership ID:", args.dealershipId);
    
    try {
      // Parse CSV content
      const lines: string[] = args.fileContent.split("\n").filter(line => line.trim() !== "");
      
      if (lines.length < 2) {
        return {
          success: false,
          importedCount: 0,
          errors: ["File appears to be empty or missing header row"]
        };
      }
      
      // Get headers and normalize them
      const headerLine = lines[0];
      const headers: string[] = headerLine.split(",").map(h => h.trim().replace(/"/g, ""));
      
      console.log("📋 Headers found:", headers);
      
      // Helper function to normalize headers for flexible matching
      // Handles: "First Name", "first_name", "firstname", "first-name", etc.
      const normalizeHeader = (header: string): string => {
        return header
          .toLowerCase()
          .replace(/[\s_\-\.]+/g, "") // Remove spaces, underscores, hyphens, and dots
          .trim();
      };

      // Map headers to expected field names (case insensitive, flexible formatting)
      const headerMap: Record<string, string> = {};
      headers.forEach((header, index) => {
        const normalizedHeader = normalizeHeader(header);
        
        // Map various header formats to our field names
        // First Name variations: "firstname", "first_name", "first-name", "first name", "first", "fname"
        if (normalizedHeader.includes("firstname") || normalizedHeader === "first" || normalizedHeader === "fname") {
          headerMap["firstName"] = String(index);
        } 
        // Last Name variations: "lastname", "last_name", "last-name", "last name", "last", "lname", "surname"
        else if (normalizedHeader.includes("lastname") || normalizedHeader === "last" || normalizedHeader === "lname" || normalizedHeader.includes("surname")) {
          headerMap["lastName"] = String(index);
        } 
        // Email variations: "email", "e-mail", "emailaddress"
        else if (normalizedHeader.includes("email") && !normalizedHeader.includes("address")) {
          headerMap["email"] = String(index);
        } 
        // Phone variations: "phone", "telephone", "tel", "mobile", "cell"
        else if (normalizedHeader.includes("phone") || normalizedHeader.includes("tel") || normalizedHeader.includes("mobile") || normalizedHeader === "cell") {
          headerMap["phone"] = String(index);
        } 
        // Address variations: "address", "street", "streetaddress", "addr"
        else if ((normalizedHeader.includes("address") && !normalizedHeader.includes("email")) || normalizedHeader.includes("street") || normalizedHeader === "addr") {
          headerMap["address"] = String(index);
        } 
        // City variations: "city", "town"
        else if (normalizedHeader.includes("city") || normalizedHeader === "town") {
          headerMap["city"] = String(index);
        } 
        // State variations: "state", "province", "region"
        else if (normalizedHeader.includes("state") || normalizedHeader.includes("province") || normalizedHeader === "region") {
          headerMap["state"] = String(index);
        } 
        // Zip Code variations: "zip", "zipcode", "postal", "postalcode", "zip_code"
        else if (normalizedHeader.includes("zip") || normalizedHeader.includes("postal")) {
          headerMap["zipCode"] = String(index);
        } 
        // Source variations: "source", "leadsource", "lead_source"
        else if (normalizedHeader.includes("source")) {
          headerMap["source"] = String(index);
        } 
        // Status variations: "status", "clientstatus"
        else if (normalizedHeader.includes("status")) {
          headerMap["status"] = String(index);
        } 
        // Notes variations: "note", "notes", "comment", "comments", "remarks"
        else if (normalizedHeader.includes("note") || normalizedHeader.includes("comment") || normalizedHeader.includes("remark")) {
          headerMap["notes"] = String(index);
        }
      });
      
      console.log("🗺️ Header mapping:", headerMap);
      
      // Check required fields
      if (!headerMap["firstName"] || !headerMap["lastName"]) {
        return {
          success: false,
          importedCount: 0,
          errors: ["Missing required columns: First Name and Last Name are required"]
        };
      }
      
      const errors: string[] = [];
      let importedCount = 0;
      
      // Process each data row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
          // Parse CSV row (handle quoted values)
          const values: string[] = [];
          let currentValue = "";
          let inQuotes = false;
          
          for (let j = 0; j < line.length; j++) {
            const char = line[j];
            
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentValue.trim());
              currentValue = "";
            } else {
              currentValue += char;
            }
          }
          values.push(currentValue.trim()); // Add the last value
          
          console.log(`📝 Row ${i} values:`, values);
          
          if (values.length !== headers.length) {
            errors.push(`Row ${i}: Expected ${headers.length} columns, got ${values.length}`);
            continue;
          }
          
          // Extract data using header mapping
          const firstName = values[parseInt(headerMap["firstName"])]?.replace(/"/g, "").trim();
          const lastName = values[parseInt(headerMap["lastName"])]?.replace(/"/g, "").trim();
          
          if (!firstName || !lastName) {
            errors.push(`Row ${i}: First Name and Last Name are required`);
            continue;
          }
          
          // Get other fields (with defaults)
          const email = headerMap["email"] ? values[parseInt(headerMap["email"])]?.replace(/"/g, "").trim() : "";
          const phone = headerMap["phone"] ? values[parseInt(headerMap["phone"])]?.replace(/"/g, "").trim() : "";
          const address = headerMap["address"] ? values[parseInt(headerMap["address"])]?.replace(/"/g, "").trim() : "";
          const city = headerMap["city"] ? values[parseInt(headerMap["city"])]?.replace(/"/g, "").trim() : "";
          const state = headerMap["state"] ? values[parseInt(headerMap["state"])]?.replace(/"/g, "").trim() : "";
          const zipCode = headerMap["zipCode"] ? values[parseInt(headerMap["zipCode"])]?.replace(/"/g, "").trim() : "";
          const source = headerMap["source"] ? values[parseInt(headerMap["source"])]?.replace(/"/g, "").trim() : "";
          const notes = headerMap["notes"] ? values[parseInt(headerMap["notes"])]?.replace(/"/g, "").trim() : "";
          
          // Validate and normalize status
          let status: "LEAD" | "CUSTOMER" | "PREVIOUS" = "LEAD";
          if (headerMap["status"]) {
            const statusValue = values[parseInt(headerMap["status"])]?.replace(/"/g, "").trim().toUpperCase();
            if (["LEAD", "CUSTOMER", "PREVIOUS"].includes(statusValue)) {
              status = statusValue as "LEAD" | "CUSTOMER" | "PREVIOUS";
            }
          }
          
          // Validate email if provided
          if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            errors.push(`Row ${i}: Invalid email format: ${email}`);
            continue;
          }
          
          // Create client data
          const clientData = {
            firstName,
            lastName,
            email: email || undefined,
            phone: phone || undefined,
            address: address || undefined,
            city: city || undefined,
            state: state || undefined,
            zipCode: zipCode || undefined,
            source: source || undefined,
            status,
            notes: notes || undefined,
            clientId: `import_${Date.now()}_${i}`, // Generate unique ID
            dealershipId: args.dealershipId,
          };
          
          console.log(`💾 Creating client:`, clientData);
          
          // Create the client using the existing mutation
          await ctx.runMutation(api.clients.createClient, clientData);
          importedCount++;
          
        } catch (error) {
          console.error(`❌ Error processing row ${i}:`, error);
          errors.push(`Row ${i}: ${error instanceof Error ? error.message : "Failed to import"}`);
        }
      }
      
      console.log(`✅ Import completed: ${importedCount} clients imported, ${errors.length} errors`);
      
      return {
        success: errors.length === 0 || importedCount > 0,
        importedCount,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit errors shown
      };
      
    } catch (error) {
      console.error("❌ Import failed:", error);
      return {
        success: false,
        importedCount: 0,
        errors: [`Import failed: ${error instanceof Error ? error.message : "Unknown error"}`]
      };
    }
  },
});

export const listClients = query({
  args: {
    dealershipId: v.string(),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    source: v.optional(v.string()),
    // Add more filter options as needed
    city: v.optional(v.string()),
    state: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      dealershipId,
      page = 1,
      limit = 25,
      search,
      status,
      source,
      city,
      state,
    } = args;

    // Build the base query
    let query = ctx.db
      .query("clients")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId));

    // Apply filters
    if (status) {
      query = query.filter((q) => q.eq(q.field("status"), status));
    }

    if (source) {
      query = query.filter((q) => q.eq(q.field("source"), source));
    }

    if (city) {
      query = query.filter((q) => q.eq(q.field("city"), city));
    }

    if (state) {
      query = query.filter((q) => q.eq(q.field("state"), state));
    }

    // Get all matching results first
    let results = await query.collect();

    // Apply search filter (case-insensitive, multiple fields)
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      results = results.filter((client) => {
        const searchableFields = [
          client.firstName?.toLowerCase() || '',
          client.lastName?.toLowerCase() || '',
          client.email?.toLowerCase() || '',
          client.phone?.toLowerCase() || '',
          `${client.firstName?.toLowerCase() || ''} ${client.lastName?.toLowerCase() || ''}`.trim(),
        ];
        
        return searchableFields.some(field => 
          field.includes(searchTerm)
        );
      });
    }

    // Calculate pagination
    const totalItems = results.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // Get paginated results
    const paginatedResults = results
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) // Sort by newest first
      .slice(startIndex, endIndex);

    return {
      data: paginatedResults,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  },
});

// Get unique sources for filtering dropdown
export const getUniqueSources = query({
  args: {
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    const sources = new Set<string>();
    
    clients.forEach(client => {
      if (client.source && client.source.trim()) {
        sources.add(client.source.trim());
      }
    });

    return Array.from(sources).sort();
  },
});

// Get unique locations (cities/states) for filtering
export const getUniqueLocations = query({
  args: {
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    const cities = new Set<string>();
    const states = new Set<string>();
    const locations = new Set<string>();
    
    clients.forEach(client => {
      if (client.city && client.city.trim()) {
        cities.add(client.city.trim());
      }
      if (client.state && client.state.trim()) {
        states.add(client.state.trim());
      }
      if (client.city && client.state) {
        locations.add(`${client.city.trim()}, ${client.state.trim()}`);
      }
    });

    return {
      cities: Array.from(cities).sort(),
      states: Array.from(states).sort(),
      locations: Array.from(locations).sort(),
    };
  },
});

// Get client statistics for dashboard
export const getClientStats = query({
  args: {
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const clients = await ctx.db
      .query("clients")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    const total = clients.length;
    const leads = clients.filter(c => c.status === 'LEAD').length;
    const customers = clients.filter(c => c.status === 'CUSTOMER').length;
    const previous = clients.filter(c => c.status === 'PREVIOUS').length;

    // Recent activity (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentClients = clients.filter(c => (c.createdAt || 0) > thirtyDaysAgo).length;

    // Top sources
    const sourceCounts: Record<string, number> = {};
    clients.forEach(client => {
      if (client.source) {
        sourceCounts[client.source] = (sourceCounts[client.source] || 0) + 1;
      }
    });
    
    const topSources = Object.entries(sourceCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    return {
      total,
      leads,
      customers,
      previous,
      recentClients,
      topSources,
    };
  },
});

// Search clients with advanced options
export const searchClients = query({
  args: {
    dealershipId: v.string(),
    query: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { dealershipId, query: searchQuery, limit = 10 } = args;

    if (!searchQuery || searchQuery.trim().length < 2) {
      return [];
    }

    const clients = await ctx.db
      .query("clients")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
      .collect();

    const searchTerm = searchQuery.toLowerCase().trim();
    
    const results = clients
      .filter((client) => {
        const searchableFields = [
          client.firstName?.toLowerCase() || '',
          client.lastName?.toLowerCase() || '',
          client.email?.toLowerCase() || '',
          client.phone?.toLowerCase() || '',
          `${client.firstName?.toLowerCase() || ''} ${client.lastName?.toLowerCase() || ''}`.trim(),
        ];
        
        return searchableFields.some(field => 
          field.includes(searchTerm)
        );
      })
      .sort((a, b) => {
        // Prioritize exact matches
        const aFullName = `${a.firstName} ${a.lastName}`.toLowerCase();
        const bFullName = `${b.firstName} ${b.lastName}`.toLowerCase();
        
        if (aFullName.startsWith(searchTerm) && !bFullName.startsWith(searchTerm)) {
          return -1;
        }
        if (!aFullName.startsWith(searchTerm) && bFullName.startsWith(searchTerm)) {
          return 1;
        }
        
        // Then by creation date
        return (b.createdAt || 0) - (a.createdAt || 0);
      })
      .slice(0, limit);

    return results;
  },
});

// Export clients with filters applied
export const exportClients = query({
  args: {
    dealershipId: v.string(),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    source: v.optional(v.string()),
    selectedIds: v.optional(v.array(v.id("clients"))),
  },
  handler: async (ctx, args) => {
    const { dealershipId, search, status, source, selectedIds } = args;

    let query = ctx.db
      .query("clients")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId));

    let results = await query.collect();

    // If specific IDs are selected, filter to those
    if (selectedIds && selectedIds.length > 0) {
      results = results.filter(client => selectedIds.includes(client._id));
    } else {
      // Apply filters for export
      if (status) {
        results = results.filter(client => client.status === status);
      }

      if (source) {
        results = results.filter(client => client.source === source);
      }

      if (search && search.trim()) {
        const searchTerm = search.toLowerCase().trim();
        results = results.filter((client) => {
          const searchableFields = [
            client.firstName?.toLowerCase() || '',
            client.lastName?.toLowerCase() || '',
            client.email?.toLowerCase() || '',
            client.phone?.toLowerCase() || '',
            `${client.firstName?.toLowerCase() || ''} ${client.lastName?.toLowerCase() || ''}`.trim(),
          ];
          
          return searchableFields.some(field => 
            field.includes(searchTerm)
          );
        });
      }
    }

    // Sort by creation date (newest first)
    results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return results;
  },
});

/**
 * Update client status with validation and tracking
 * Supports both web and desktop app authentication
 */
export const updateClientStatus = mutation({
  args: {
    clientId: v.id("clients"),
    newStatus: v.string(), // Will be validated against enum
    reason: v.optional(v.string()),
    lostReason: v.optional(v.string()), // When marking as LOST
    nextFollowUpAt: v.optional(v.number()), // Schedule next follow-up
    token: v.optional(v.string()), // For desktop app auth
  },
  handler: async (ctx, args) => {
    // Optional: Add auth check similar to deals if needed
    // For now allowing without auth for flexibility

    const client = await ctx.db.get(args.clientId);
    if (!client) {
      throw new Error("Client not found");
    }

    const previousStatus = client.status;
    const newStatus = args.newStatus;

    // Validate status transition
    if (!canTransitionClientStatus(previousStatus, newStatus)) {
      throw new Error(
        `Invalid status transition: Cannot transition client from ${getClientStatusLabel(previousStatus)} to ${getClientStatusLabel(newStatus)}`
      );
    }

    // Type assertion: newStatus is validated and matches schema union type
    // Schema includes: PROSPECT, CONTACTED, QUALIFIED, NEGOTIATING, CUSTOMER, 
    // REPEAT_CUSTOMER, LOST, NOT_INTERESTED, DO_NOT_CONTACT, PREVIOUS, LEAD
    type ClientStatusSchemaType = 
      | ClientStatusType 
      | "LEAD"; // Legacy status from schema
    
    // Update client status with tracking fields
    await ctx.db.patch(args.clientId, {
      status: newStatus as ClientStatusSchemaType,
      statusChangedAt: Date.now(),
      // statusChangedBy: user?._id, // Add when auth is required
      updatedAt: Date.now(),
      // Handle specific status fields
      ...(newStatus === ClientStatus.CONTACTED && {
        lastContactedAt: Date.now(),
      }),
      ...(newStatus === ClientStatus.LOST && args.lostReason && {
        lostReason: args.lostReason,
      }),
      ...(args.nextFollowUpAt && {
        nextFollowUpAt: args.nextFollowUpAt,
      }),
    });

    // Log status change (optional)
    if (client.dealershipId) {
      await ctx.db.insert("security_logs", {
        dealershipId: client.dealershipId as Id<"dealerships">,
        action: "client_status_updated",
        userId: "system", // Update when auth is required
        ipAddress: "server",
        success: true,
        details: `Client ${client.firstName} ${client.lastName} status changed from ${previousStatus} to ${newStatus}${args.reason ? ` (${args.reason})` : ""}`,
        timestamp: Date.now(),
      });
    }

    return {
      success: true,
      previousStatus,
      newStatus,
      clientId: args.clientId,
      timestamp: Date.now(),
    };
  },
});