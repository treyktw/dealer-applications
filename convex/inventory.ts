import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import {
  canTransitionVehicleStatus,
  VehicleStatus,
  getVehicleStatusLabel,
  type VehicleStatusType,
} from "./lib/statuses";

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    const vehicles = await ctx.db.query("vehicles").collect();
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const totalVehicles = vehicles.length;
    const totalValue = vehicles.reduce((sum, v) => sum + (v.price || 0), 0);
    const avgPrice = totalVehicles > 0 ? Math.round(totalValue / totalVehicles) : 0;
    const availableVehicles = vehicles.filter(v => v.status === "AVAILABLE").length;
    const pendingVehicles = vehicles.filter(v => v.status === "PENDING").length;
    const soldVehicles = vehicles.filter(v => v.status === "SOLD").length;
    const reservedVehicles = vehicles.filter(v => v.status === "RESERVED").length;
    const newInventoryThisMonth = vehicles.filter(v => {
      const d = new Date(v.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    const lastMonthInventory = vehicles.filter(v => {
      const d = new Date(v.createdAt);
      return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
    }).length;
    const inventoryChange = lastMonthInventory === 0 ? 0 : Math.round(((newInventoryThisMonth - lastMonthInventory) / lastMonthInventory) * 100);
    const makeCounts: Record<string, number> = {};
    for (const v of vehicles) {
      if (v.make) makeCounts[v.make] = (makeCounts[v.make] || 0) + 1;
    }
    const topMake = Object.entries(makeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    const topMakeCount = makeCounts[topMake] || 0;
    const recentSales = vehicles.filter(v => {
      if (v.status !== "SOLD") return false;
      const d = new Date(v.updatedAt || v.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    return {
      totalVehicles,
      totalValue,
      avgPrice,
      availableVehicles,
      pendingVehicles,
      soldVehicles,
      reservedVehicles,
      newInventoryThisMonth,
      inventoryChange,
      topMake,
      topMakeCount,
      recentSales,
    };
  },
});

export const getVehicles = query({
  args: {
    dealershipId: v.string(),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    make: v.optional(v.string()),
    year: v.optional(v.number()),
    priceMin: v.optional(v.number()),
    priceMax: v.optional(v.number()),
    mileageMax: v.optional(v.number()),
    featured: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const {
      dealershipId,
      page = 1,
      limit = 25,
      search,
      status,
      make,
      year,
      priceMin,
      priceMax,
      mileageMax,
      featured,
    } = args;

    // Build the base query
    let query = ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId));

    // Apply filters
    if (status) {
      query = query.filter((q) => q.eq(q.field("status"), status));
    }

    if (make) {
      query = query.filter((q) => q.eq(q.field("make"), make));
    }

    if (year) {
      query = query.filter((q) => q.eq(q.field("year"), year));
    }

    if (featured !== undefined) {
      query = query.filter((q) => q.eq(q.field("featured"), featured));
    }

    if (priceMin !== undefined) {
      query = query.filter((q) => q.gte(q.field("price"), priceMin));
    }

    if (priceMax !== undefined) {
      query = query.filter((q) => q.lte(q.field("price"), priceMax));
    }

    if (mileageMax !== undefined) {
      query = query.filter((q) => q.lte(q.field("mileage"), mileageMax));
    }

    // Get all matching results first
    let results = await query.collect();

    // Apply search filter (case-insensitive, multiple fields)
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      results = results.filter((vehicle) => {
        const searchableFields = [
          vehicle.make?.toLowerCase() || '',
          vehicle.model?.toLowerCase() || '',
          vehicle.vin?.toLowerCase() || '',
          vehicle.stock?.toLowerCase() || '',
          vehicle.trim?.toLowerCase() || '',
          `${vehicle.year} ${vehicle.make} ${vehicle.model}`.toLowerCase(),
          `${vehicle.make} ${vehicle.model}`.toLowerCase(),
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

    // Get paginated results with sorting
    const paginatedResults = results
      .sort((a, b) => {
        // Featured vehicles first
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        
        // Then by creation date (newest first)
        return (b.createdAt || 0) - (a.createdAt || 0);
      })
      .slice(startIndex, endIndex);

    return {
      vehicles: paginatedResults,
      total: totalItems,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  },
});

export const deleteVehicle = mutation({
  args: { id: v.id("vehicles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user's dealership ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user has access to the vehicle
    const vehicle = await ctx.db.get(args.id);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    if (user.dealershipId !== vehicle.dealershipId) {
      throw new Error("Not authorized to delete this vehicle");
    }

    // Delete the vehicle
    await ctx.db.delete(args.id);
    return { id: args.id };
  },
});

export const deleteManyVehicles = mutation({
  args: { vehicleIds: v.array(v.id("vehicles")) },
  handler: async (ctx, args) => {
    let count = 0;
    for (const id of args.vehicleIds) {
      await ctx.db.delete(id);
      count++;
    }
    return { deleted: count };
  },
});

export const getVehicle = query({
  args: { id: v.id("vehicles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const vehicle = await ctx.db.get(args.id);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    // Get user's dealership ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user has access to the vehicle
    if (user.dealershipId !== vehicle.dealershipId) {
      throw new Error("Not authorized to view this vehicle");
    }

    return vehicle;
  },
});

export const createVehicle = mutation({
  args: {
    stock: v.string(),
    vin: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    trim: v.optional(v.string()),
    mileage: v.number(),
    price: v.number(),
    exteriorColor: v.optional(v.string()),
    interiorColor: v.optional(v.string()),
    fuelType: v.optional(v.string()),
    transmission: v.optional(v.string()),
    engine: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.union(v.literal("available"), v.literal("sold"), v.literal("pending"), v.literal("reserved")),
    featured: v.boolean(),
    features: v.optional(v.string()),
    images: v.optional(v.array(v.object({
      url: v.string(),
      isPrimary: v.optional(v.boolean()),
    }))),
    dealershipId: v.id("dealerships"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user's dealership ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user has access to the dealership
    if (user.dealershipId !== args.dealershipId) {
      throw new Error("Not authorized to add vehicles to this dealership");
    }

    // Generate a unique ID for the vehicle
    const id = `${args.dealershipId}_${args.vin}`;

    // Create the vehicle
    const vehicleId = await ctx.db.insert("vehicles", {
      ...args,
      id,
      status: args.status.toUpperCase() as "AVAILABLE" | "SOLD" | "PENDING" | "RESERVED",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { id: vehicleId };
  },
});

export const updateVehicle = mutation({
  args: {
    id: v.id("vehicles"),
    stock: v.string(),
    vin: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    trim: v.optional(v.string()),
    mileage: v.number(),
    price: v.number(),
    exteriorColor: v.optional(v.string()),
    interiorColor: v.optional(v.string()),
    fuelType: v.optional(v.string()),
    transmission: v.optional(v.string()),
    engine: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.union(v.literal("available"), v.literal("sold"), v.literal("pending"), v.literal("reserved")),
    featured: v.boolean(),
    features: v.optional(v.string()),
    images: v.optional(v.array(v.object({
      url: v.string(),
      isPrimary: v.optional(v.boolean()),
    }))),
    // Remove dealershipId from args since we'll get it from the existing vehicle
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user's dealership ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Verify user has access to the vehicle
    const vehicle = await ctx.db.get(args.id);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    if (user.dealershipId !== vehicle.dealershipId) {
      throw new Error("Not authorized to update this vehicle");
    }

    // Update the vehicle (keep the existing dealershipId)
    await ctx.db.patch(args.id, {
      ...args,
      status: args.status.toUpperCase() as "AVAILABLE" | "SOLD" | "PENDING" | "RESERVED",
      updatedAt: Date.now(),
      // Don't include dealershipId in the patch since it shouldn't change
    });

    await ctx.scheduler.runAfter(0, internal.internal.purgeCacheForVehicle, {
      dealershipId: vehicle.dealershipId,
      vehicleId: args.id,
    });

    return { id: args.id, success: true };
  },
});

export const upsertVehicle = mutation({
  args: {
    id: v.string(),         // Unique vehicle ID from your SQL DB
    dealershipId: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    vin: v.string(),
    stock: v.string(),
    price: v.number(),
    status: v.string(),
    mileage: v.number(),
    trim: v.optional(v.string()),
    exteriorColor: v.optional(v.string()),
    interiorColor: v.optional(v.string()),
    transmission: v.optional(v.string()),
    fuelType: v.optional(v.string()),
    engine: v.optional(v.string()),
    description: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    features: v.optional(v.string()), // newline-separated string
    images: v.optional(v.array(v.object({
      url: v.string(),
      isPrimary: v.optional(v.boolean())
    }))),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("vehicles")
      .withIndex("by_vehicle_id", q => q.eq("id", args.id))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        status: args.status.toUpperCase() as "AVAILABLE" | "SOLD" | "PENDING" | "RESERVED",
      });
    } else {
      await ctx.db.insert("vehicles", {
        ...args,
        id: args.id,
        status: args.status.toUpperCase() as "AVAILABLE" | "SOLD" | "PENDING" | "RESERVED",
        featured: args.featured ?? false,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const getVehiclesForAssignment = query({
  args: {
    dealershipId: v.string(),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("vehicles")
      .filter((q) => q.eq(q.field("dealershipId"), args.dealershipId));

    // Apply status filter
    if (args.status && args.status !== "all") {
      query = query.filter((q) => q.eq(q.field("status"), args.status?.toUpperCase()));
    }

    // Apply search filter if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      query = query.filter((q) =>
        q.or(
          q.eq(q.field("make"), searchLower),
          q.eq(q.field("model"), searchLower),
          q.eq(q.field("vin"), searchLower),
          q.eq(q.field("stock"), searchLower)
        )
      );
    }

    // Get all results first
    const results = await query.collect();

    // Apply limit if provided
    if (args.limit) {
      return results.slice(0, args.limit);
    }

    return results;
  },
});

export const importVehicles = action({
  args: {
    fileContent: v.string(),
    fileName: v.string(),
    dealershipId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; importedCount: number; errors?: string[] }> => {
    console.log("🚗 Starting vehicle import");
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
      
      // Map headers to expected field names (case insensitive)
      const headerMap: Record<string, string> = {};
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().replace(/\s+/g, "");
        
        // Map various header formats to our field names
        if (normalizedHeader.includes("stock") || normalizedHeader.includes("stocknumber")) {
          headerMap["stock"] = String(index);
        } else if (normalizedHeader.includes("vin")) {
          headerMap["vin"] = String(index);
        } else if (normalizedHeader.includes("make")) {
          headerMap["make"] = String(index);
        } else if (normalizedHeader.includes("model")) {
          headerMap["model"] = String(index);
        } else if (normalizedHeader.includes("year")) {
          headerMap["year"] = String(index);
        } else if (normalizedHeader.includes("trim")) {
          headerMap["trim"] = String(index);
        } else if (normalizedHeader.includes("mileage") || normalizedHeader.includes("miles")) {
          headerMap["mileage"] = String(index);
        } else if (normalizedHeader.includes("price")) {
          headerMap["price"] = String(index);
        } else if (normalizedHeader.includes("exteriorcolor") || normalizedHeader.includes("exterior")) {
          headerMap["exteriorColor"] = String(index);
        } else if (normalizedHeader.includes("interiorcolor") || normalizedHeader.includes("interior")) {
          headerMap["interiorColor"] = String(index);
        } else if (normalizedHeader.includes("fueltype") || normalizedHeader.includes("fuel")) {
          headerMap["fuelType"] = String(index);
        } else if (normalizedHeader.includes("transmission")) {
          headerMap["transmission"] = String(index);
        } else if (normalizedHeader.includes("engine")) {
          headerMap["engine"] = String(index);
        } else if (normalizedHeader.includes("description")) {
          headerMap["description"] = String(index);
        } else if (normalizedHeader.includes("status")) {
          headerMap["status"] = String(index);
        } else if (normalizedHeader.includes("featured")) {
          headerMap["featured"] = String(index);
        } else if (normalizedHeader.includes("features")) {
          headerMap["features"] = String(index);
        }
      });
      
      console.log("🗺️ Header mapping:", headerMap);
      
      // Check required fields
      const requiredFields = ["stock", "vin", "make", "model", "year", "price"];
      const missingFields = requiredFields.filter(field => !headerMap[field]);
      
      if (missingFields.length > 0) {
        return {
          success: false,
          importedCount: 0,
          errors: [`Missing required columns: ${missingFields.join(", ")}`]
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
          
          console.log(`🚗 Row ${i} values:`, values);
          
          if (values.length !== headers.length) {
            errors.push(`Row ${i}: Expected ${headers.length} columns, got ${values.length}`);
            continue;
          }
          
          // Extract required fields
          const stock = values[parseInt(headerMap["stock"])]?.replace(/"/g, "").trim();
          const vin = values[parseInt(headerMap["vin"])]?.replace(/"/g, "").trim();
          const make = values[parseInt(headerMap["make"])]?.replace(/"/g, "").trim();
          const model = values[parseInt(headerMap["model"])]?.replace(/"/g, "").trim();
          const yearStr = values[parseInt(headerMap["year"])]?.replace(/"/g, "").trim();
          const priceStr = values[parseInt(headerMap["price"])]?.replace(/"/g, "").trim();
          
          // Validate required fields
          if (!stock || !vin || !make || !model || !yearStr || !priceStr) {
            errors.push(`Row ${i}: Missing required fields (Stock, VIN, Make, Model, Year, Price)`);
            continue;
          }
          
          // Parse numbers
          const year = parseInt(yearStr);
          const price = parseFloat(priceStr.replace(/[$,]/g, ""));
          
          if (Number.isNaN(year) || year < 1900 || year > new Date().getFullYear() + 2) {
            errors.push(`Row ${i}: Invalid year: ${yearStr}`);
            continue;
          }
          
          if (Number.isNaN(price) || price <= 0) {
            errors.push(`Row ${i}: Invalid price: ${priceStr}`);
            continue;
          }
          
          // Extract optional fields
          const trim = headerMap["trim"] ? values[parseInt(headerMap["trim"])]?.replace(/"/g, "").trim() : "";
          const mileageStr = headerMap["mileage"] ? values[parseInt(headerMap["mileage"])]?.replace(/"/g, "").trim() : "0";
          const exteriorColor = headerMap["exteriorColor"] ? values[parseInt(headerMap["exteriorColor"])]?.replace(/"/g, "").trim() : "";
          const interiorColor = headerMap["interiorColor"] ? values[parseInt(headerMap["interiorColor"])]?.replace(/"/g, "").trim() : "";
          const fuelType = headerMap["fuelType"] ? values[parseInt(headerMap["fuelType"])]?.replace(/"/g, "").trim() : "";
          const transmission = headerMap["transmission"] ? values[parseInt(headerMap["transmission"])]?.replace(/"/g, "").trim() : "";
          const engine = headerMap["engine"] ? values[parseInt(headerMap["engine"])]?.replace(/"/g, "").trim() : "";
          const description = headerMap["description"] ? values[parseInt(headerMap["description"])]?.replace(/"/g, "").trim() : "";
          const features = headerMap["features"] ? values[parseInt(headerMap["features"])]?.replace(/"/g, "").trim() : "";
          
          // Parse mileage
          const mileage = parseInt(mileageStr.replace(/[,]/g, "")) || 0;
          
          // Validate and normalize status
          let status: "AVAILABLE" | "SOLD" | "PENDING" | "RESERVED" = "AVAILABLE";
          if (headerMap["status"]) {
            const statusValue = values[parseInt(headerMap["status"])]?.replace(/"/g, "").trim().toUpperCase();
            if (["AVAILABLE", "SOLD", "PENDING", "RESERVED"].includes(statusValue)) {
              status = statusValue as "AVAILABLE" | "SOLD" | "PENDING" | "RESERVED";
            }
          }
          
          // Parse featured
          let featured = false;
          if (headerMap["featured"]) {
            const featuredValue = values[parseInt(headerMap["featured"])]?.replace(/"/g, "").trim().toLowerCase();
            featured = featuredValue === "true" || featuredValue === "1" || featuredValue === "yes";
          }
          
          // Create vehicle data
          const vehicleData = {
            stock,
            vin,
            make,
            model,
            year,
            trim: trim || undefined,
            mileage,
            price,
            exteriorColor: exteriorColor || undefined,
            interiorColor: interiorColor || undefined,
            fuelType: fuelType || undefined,
            transmission: transmission || undefined,
            engine: engine || undefined,
            description: description || undefined,
            status: status.toLowerCase() as "available" | "sold" | "pending" | "reserved",
            featured,
            features: features || undefined,
            dealershipId: args.dealershipId as Id<"dealerships">, // Type assertion for Convex ID
          };
          
          console.log(`💾 Creating vehicle:`, vehicleData);
          
          // Create the vehicle using the existing mutation
          await ctx.runMutation(api.inventory.createVehicle, vehicleData);
          importedCount++;
          
        } catch (error) {
          console.error(`❌ Error processing row ${i}:`, error);
          errors.push(`Row ${i}: ${error instanceof Error ? error.message : "Failed to import"}`);
        }
      }
      
      console.log(`✅ Import completed: ${importedCount} vehicles imported, ${errors.length} errors`);
      
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

export const getUniqueMakes = query({
  args: {
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    const makes = new Set<string>();
    
    vehicles.forEach(vehicle => {
      if (vehicle.make && vehicle.make.trim()) {
        makes.add(vehicle.make.trim());
      }
    });

    return Array.from(makes).sort();
  },
});

// Get unique years for filtering dropdown
export const getUniqueYears = query({
  args: {
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    const years = new Set<number>();
    
    vehicles.forEach(vehicle => {
      if (vehicle.year && vehicle.year > 1900) {
        years.add(vehicle.year);
      }
    });

    return Array.from(years).sort((a, b) => b - a); // Newest first
  },
});

// New api's 
export const getVehicleStats = query({
  args: {
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .collect();

    const total = vehicles.length;
    const available = vehicles.filter(v => v.status === 'AVAILABLE').length;
    const sold = vehicles.filter(v => v.status === 'SOLD').length;
    const pending = vehicles.filter(v => v.status === 'PENDING').length;
    const reserved = vehicles.filter(v => v.status === 'RESERVED').length;
    const featured = vehicles.filter(v => v.featured).length;

    // Calculate total inventory value
    const totalValue = vehicles
      .filter(v => v.status === 'AVAILABLE')
      .reduce((sum, v) => sum + (v.price || 0), 0);

    // Average price
    const avgPrice = available > 0 ? totalValue / available : 0;

    // Recent activity (last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentVehicles = vehicles.filter(v => (v.createdAt || 0) > thirtyDaysAgo).length;

    // Top makes by count
    const makeCounts: Record<string, number> = {};
    vehicles.forEach(vehicle => {
      if (vehicle.make) {
        makeCounts[vehicle.make] = (makeCounts[vehicle.make] || 0) + 1;
      }
    });
    
    const topMakes = Object.entries(makeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([make, count]) => ({ make, count }));

    // Year distribution
    const yearCounts: Record<number, number> = {};
    vehicles.forEach(vehicle => {
      if (vehicle.year) {
        yearCounts[vehicle.year] = (yearCounts[vehicle.year] || 0) + 1;
      }
    });

    return {
      total,
      available,
      sold,
      pending,
      reserved,
      featured,
      totalValue,
      avgPrice,
      recentVehicles,
      topMakes,
      yearDistribution: yearCounts,
    };
  },
});

// Search vehicles with advanced options
export const searchVehicles = query({
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

    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
      .collect();

    const searchTerm = searchQuery.toLowerCase().trim();
    
    const results = vehicles
      .filter((vehicle) => {
        const searchableFields = [
          vehicle.make?.toLowerCase() || '',
          vehicle.model?.toLowerCase() || '',
          vehicle.vin?.toLowerCase() || '',
          vehicle.stock?.toLowerCase() || '',
          vehicle.trim?.toLowerCase() || '',
          `${vehicle.year} ${vehicle.make} ${vehicle.model}`.toLowerCase(),
          `${vehicle.make} ${vehicle.model}`.toLowerCase(),
        ];
        
        return searchableFields.some(field => 
          field.includes(searchTerm)
        );
      })
      .sort((a, b) => {
        // Prioritize exact matches in make/model
        const aMakeModel = `${a.make} ${a.model}`.toLowerCase();
        const bMakeModel = `${b.make} ${b.model}`.toLowerCase();
        
        if (aMakeModel.startsWith(searchTerm) && !bMakeModel.startsWith(searchTerm)) {
          return -1;
        }
        if (!aMakeModel.startsWith(searchTerm) && bMakeModel.startsWith(searchTerm)) {
          return 1;
        }
        
        // Then prioritize by year (newer first)
        if (a.year !== b.year) {
          return (b.year || 0) - (a.year || 0);
        }
        
        // Finally by creation date
        return (b.createdAt || 0) - (a.createdAt || 0);
      })
      .slice(0, limit);

    return results;
  },
});

// Get price ranges for filtering
export const getPriceRanges = query({
  args: {
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .filter(q => q.eq(q.field("status"), "available"))
      .collect();

    if (vehicles.length === 0) {
      return { min: 0, max: 0, ranges: [] };
    }

    const prices = vehicles.map(v => v.price || 0).filter(p => p > 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    // Create price ranges
    const ranges = [
      { label: "Under $10,000", min: 0, max: 10000 },
      { label: "$10,000 - $20,000", min: 10000, max: 20000 },
      { label: "$20,000 - $30,000", min: 20000, max: 30000 },
      { label: "$30,000 - $50,000", min: 30000, max: 50000 },
      { label: "$50,000 - $75,000", min: 50000, max: 75000 },
      { label: "Over $75,000", min: 75000, max: Infinity },
    ];

    return {
      min: minPrice,
      max: maxPrice,
      ranges,
    };
  },
});

// Export vehicles with filters applied
export const exportVehicles = query({
  args: {
    dealershipId: v.string(),
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    make: v.optional(v.string()),
    year: v.optional(v.number()),
    selectedIds: v.optional(v.array(v.id("vehicles"))),
  },
  handler: async (ctx, args) => {
    const { dealershipId, search, status, make, year, selectedIds } = args;

    let query = ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId));

    let results = await query.collect();

    // If specific IDs are selected, filter to those
    if (selectedIds && selectedIds.length > 0) {
      results = results.filter(vehicle => selectedIds.includes(vehicle._id));
    } else {
      // Apply filters for export
      if (status) {
        results = results.filter(vehicle => vehicle.status === status);
      }

      if (make) {
        results = results.filter(vehicle => vehicle.make === make);
      }

      if (year) {
        results = results.filter(vehicle => vehicle.year === year);
      }

      if (search && search.trim()) {
        const searchTerm = search.toLowerCase().trim();
        results = results.filter((vehicle) => {
          const searchableFields = [
            vehicle.make?.toLowerCase() || '',
            vehicle.model?.toLowerCase() || '',
            vehicle.vin?.toLowerCase() || '',
            vehicle.stock?.toLowerCase() || '',
            vehicle.trim?.toLowerCase() || '',
            `${vehicle.year} ${vehicle.make} ${vehicle.model}`.toLowerCase(),
          ];
          
          return searchableFields.some(field => 
            field.includes(searchTerm)
          );
        });
      }
    }

    // Sort by year (newest first), then by creation date
    results.sort((a, b) => {
      if (a.year !== b.year) {
        return (b.year || 0) - (a.year || 0);
      }
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    return results;
  },
});

// Get similar vehicles (for recommendations)
export const getSimilarVehicles = query({
  args: {
    dealershipId: v.string(),
    vehicleId: v.id("vehicles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { dealershipId, vehicleId, limit = 6 } = args;

    // Get the reference vehicle
    const refVehicle = await ctx.db.get(vehicleId);
    if (!refVehicle) return [];

    // Get all vehicles from same dealership
    const allVehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", dealershipId))
      .filter(q => q.neq(q.field("_id"), vehicleId))
      .filter(q => q.eq(q.field("status"), "available"))
      .collect();

    // Score vehicles by similarity
    const scoredVehicles = allVehicles.map(vehicle => {
      let score = 0;

      // Same make (high weight)
      if (vehicle.make === refVehicle.make) score += 50;

      // Same model (very high weight)
      if (vehicle.model === refVehicle.model) score += 100;

      // Similar year (within 3 years)
      const yearDiff = Math.abs((vehicle.year || 0) - (refVehicle.year || 0));
      if (yearDiff <= 3) score += 30 - (yearDiff * 10);

      // Similar price (within 25%)
      const priceRef = refVehicle.price || 0;
      const priceVehicle = vehicle.price || 0;
      if (priceRef > 0 && priceVehicle > 0) {
        const priceDiff = Math.abs(priceVehicle - priceRef) / priceRef;
        if (priceDiff <= 0.25) score += 20 - (priceDiff * 80);
      }

      // Same fuel type
      if (vehicle.fuelType === refVehicle.fuelType) score += 10;

      // Same transmission
      if (vehicle.transmission === refVehicle.transmission) score += 10;

      return { vehicle, score };
    });

    // Sort by score and return top results
    return scoredVehicles
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.vehicle);
  },
});

/**
 * Update vehicle status with validation and tracking
 * Supports both web and desktop app authentication
 */
export const updateVehicleStatus = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    newStatus: v.string(), // Will be validated against enum
    reason: v.optional(v.string()),
    reservedBy: v.optional(v.string()), // client ID when reserving
    reservedUntil: v.optional(v.number()), // expiration timestamp for reservations
    token: v.optional(v.string()), // For desktop app auth
  },
  handler: async (ctx, args) => {
    // Optional: Add auth check similar to deals if needed
    // For now allowing without auth for flexibility

    const vehicle = await ctx.db.get(args.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found");
    }

    const previousStatus = vehicle.status;
    const newStatus = args.newStatus;

    // Validate status transition
    if (!canTransitionVehicleStatus(previousStatus, newStatus)) {
      throw new Error(
        `Invalid status transition: Cannot transition vehicle from ${getVehicleStatusLabel(previousStatus)} to ${getVehicleStatusLabel(newStatus)}`
      );
    }

    // Type assertion: newStatus is validated and matches schema union type
    // Update vehicle status with tracking fields
    await ctx.db.patch(args.vehicleId, {
      status: newStatus as VehicleStatusType,
      statusChangedAt: Date.now(),
      // statusChangedBy: user?._id, // Add when auth is required
      updatedAt: Date.now(),
      // Handle reservation fields
      ...(newStatus === VehicleStatus.RESERVED && {
        reservedBy: args.reservedBy,
        reservedAt: Date.now(),
        reservedUntil: args.reservedUntil,
      }),
      // Clear reservation fields when no longer reserved
      ...(previousStatus === VehicleStatus.RESERVED &&
        newStatus !== VehicleStatus.RESERVED && {
          reservedBy: undefined,
          reservedAt: undefined,
          reservedUntil: undefined,
        }),
    });

    // Log status change (optional)
    if (vehicle.dealershipId) {
      await ctx.db.insert("security_logs", {
        dealershipId: vehicle.dealershipId as Id<"dealerships">,
        action: "vehicle_status_updated",
        userId: "system", // Update when auth is required
        ipAddress: "server",
        success: true,
        details: `Vehicle ${vehicle.make} ${vehicle.model} (${vehicle.stock}) status changed from ${previousStatus} to ${newStatus}${args.reason ? ` (${args.reason})` : ""}`,
        timestamp: Date.now(),
      });
    }

    return {
      success: true,
      previousStatus,
      newStatus,
      vehicleId: args.vehicleId,
      timestamp: Date.now(),
    };
  },
});