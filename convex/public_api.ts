// convex/public_api.ts - Public API queries for external dealer websites
import { query, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// Get vehicles by dealership with filtering and pagination
export const getVehiclesByDealership = query({
  args: {
    dealershipId: v.string(),
    page: v.number(),
    limit: v.number(),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    featured: v.optional(v.boolean()),
    sortBy: v.optional(v.string()),
    sortOrder: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Note: This endpoint is protected by API key validation in Next.js
    // No additional auth needed here
    
    const offset = (args.page - 1) * args.limit;
    
    // Base query - only AVAILABLE vehicles
    let vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .filter((q) => q.eq(q.field("status"), "AVAILABLE"))
      .collect();
    
    // Apply filters
    if (args.make) {
      vehicles = vehicles.filter(v => 
        v.make.toLowerCase() === args.make!.toLowerCase()
      );
    }
    
    if (args.model) {
      vehicles = vehicles.filter(v => 
        v.model.toLowerCase() === args.model!.toLowerCase()
      );
    }
    
    if (args.year) {
      vehicles = vehicles.filter(v => v.year === args.year);
    }
    
    if (args.minPrice !== undefined) {
      vehicles = vehicles.filter(v => v.price >= args.minPrice!);
    }
    
    if (args.maxPrice !== undefined) {
      vehicles = vehicles.filter(v => v.price <= args.maxPrice!);
    }
    
    if (args.featured !== undefined) {
      vehicles = vehicles.filter(v => v.featured === args.featured);
    }
    
    // Sort
    vehicles.sort((a, b) => {
      const sortBy = args.sortBy || 'createdAt';
      const order = args.sortOrder === 'asc' ? 1 : -1;
      
      if (sortBy === 'price') return (a.price - b.price) * order;
      if (sortBy === 'year') return (a.year - b.year) * order;
      if (sortBy === 'mileage') return (a.mileage - b.mileage) * order;
      return (a.createdAt - b.createdAt) * order;
    });
    
    const total = vehicles.length;
    const totalPages = Math.ceil(total / args.limit);
    
    // Paginate
    const paginatedVehicles = vehicles.slice(offset, offset + args.limit);
    
    // Transform to public schema (exclude sensitive fields)
    const publicVehicles = paginatedVehicles.map(v => ({
      id: v.id,
      vin: v.vin,
      stock: v.stock,
      make: v.make,
      model: v.model,
      year: v.year,
      trim: v.trim,
      bodyType: v.bodyType,
      condition: v.status === 'AVAILABLE' ? 'used' : 'new', // Adjust based on your logic
      price: v.price,
      featured: v.featured,
      mileage: v.mileage,
      exteriorColor: v.exteriorColor,
      interiorColor: v.interiorColor,
      engine: v.engine,
      transmission: v.transmission,
      drivetrain: v.drivetrain,
      fuelType: v.fuelType,
      features: v.features?.split(',').map(f => f.trim()),
      images: v.images || [],
      seoTitle: v.seoTitle,
      seoDescription: v.seoDescription,
      description: v.description,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      // EXPLICITLY EXCLUDE: costPrice, profit, clientId, dealershipId (internal)
    }));
    
    return {
      vehicles: publicVehicles,
      pagination: {
        page: args.page,
        limit: args.limit,
        total,
        totalPages,
        hasNext: args.page < totalPages,
        hasPrev: args.page > 1,
      }
    };
  },
});

// Get a specific vehicle by ID
export const getVehicleById = query({
  args: {
    vehicleId: v.string(),
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the vehicle
    const vehicle = await ctx.db
      .query("vehicles")
      .withIndex("by_vehicle_id", (q) => q.eq("id", args.vehicleId))
      .first();

    // Check if vehicle exists and belongs to the dealership
    if (!vehicle || vehicle.dealershipId !== args.dealershipId) {
      return null;
    }

    // Only return available vehicles for public API
    if (vehicle.status !== "AVAILABLE") {
      return null;
    }

    // Return public vehicle data (remove sensitive fields)
    return {
      id: vehicle.id,
      stock: vehicle.stock,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      trim: vehicle.trim,
      mileage: vehicle.mileage,
      price: vehicle.price,
      exteriorColor: vehicle.exteriorColor,
      interiorColor: vehicle.interiorColor,
      fuelType: vehicle.fuelType,
      transmission: vehicle.transmission,
      engine: vehicle.engine,
      description: vehicle.description,
      featured: vehicle.featured,
      features: vehicle.features,
      images: vehicle.images || [],
      seoTitle: vehicle.seoTitle,
      seoDescription: vehicle.seoDescription,
      updatedAt: vehicle.updatedAt,
    };
  },
});

// Get dealership public information
export const getDealershipInfo = query({
  args: {
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    // First try to find by the dealership ID string
    const dealership = await ctx.db
      .query("dealerships")
      .filter((q) => q.eq(q.field("_id"), args.dealershipId))
      .first();

    if (!dealership) {
      return null;
    }

    // Return only public dealership information
    return {
      id: dealership._id,
      name: dealership.name,
      description: dealership.description,
      address: dealership.address,
      city: dealership.city,
      state: dealership.state,
      zipCode: dealership.zipCode,
      phone: dealership.phone,
      email: dealership.email,
      website: dealership.website,
      logo: dealership.logo,
      primaryColor: dealership.primaryColor,
      secondaryColor: dealership.secondaryColor,
      businessHours: dealership.businessHours,
      updatedAt: dealership.updatedAt,
      // Remove sensitive fields like billing info, S3 config, etc.
    };
  },
});

// Search vehicles by text
export const searchVehicles = query({
  args: {
    dealershipId: v.string(),
    searchTerm: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 20, 50);
    const searchTerm = args.searchTerm.toLowerCase();

    // Get all available vehicles for the dealership
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .filter((q) => q.eq(q.field("status"), "AVAILABLE"))
      .collect();

    // Filter vehicles that match the search term
    const matchedVehicles = vehicles.filter(vehicle => {
      const searchableText = [
        vehicle.make,
        vehicle.model,
        vehicle.trim,
        vehicle.year.toString(),
        vehicle.exteriorColor,
        vehicle.interiorColor,
        vehicle.fuelType,
        vehicle.transmission,
        vehicle.engine,
        vehicle.description,
        vehicle.features,
      ].filter(Boolean).join(' ').toLowerCase();

      return searchableText.includes(searchTerm);
    });

    // Sort by relevance (featured first, then by how many fields match)
    matchedVehicles.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.createdAt - a.createdAt;
    });

    // Limit results
    const limitedResults = matchedVehicles.slice(0, limit);

    // Format for public consumption
    const publicVehicles = limitedResults.map(vehicle => ({
      id: vehicle.id,
      stock: vehicle.stock,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      trim: vehicle.trim,
      mileage: vehicle.mileage,
      price: vehicle.price,
      exteriorColor: vehicle.exteriorColor,
      interiorColor: vehicle.interiorColor,
      fuelType: vehicle.fuelType,
      transmission: vehicle.transmission,
      engine: vehicle.engine,
      description: vehicle.description,
      featured: vehicle.featured,
      features: vehicle.features,
      images: vehicle.images || [],
      seoTitle: vehicle.seoTitle,
      seoDescription: vehicle.seoDescription,
    }));

    return {
      vehicles: publicVehicles,
      total: matchedVehicles.length,
      searchTerm: args.searchTerm,
    };
  },
});

// Get vehicle makes available for a dealership
export const getAvailableMakes = query({
  args: {
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .filter((q) => q.eq(q.field("status"), "AVAILABLE"))
      .collect();

    // Get unique makes
    const makes = Array.from(new Set(vehicles.map(v => v.make).filter(Boolean)));
    makes.sort();

    return { makes };
  },
});

// Get vehicle models for a specific make
export const getModelsForMake = query({
  args: {
    dealershipId: v.string(),
    make: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "AVAILABLE"),
          q.eq(q.field("make"), args.make)
        )
      )
      .collect();

    // Get unique models for this make
    const models = Array.from(new Set(vehicles.map(v => v.model).filter(Boolean)));
    models.sort();

    return { models };
  },
});

// Get price range for dealership vehicles
export const getPriceRange = query({
  args: {
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .filter((q) => q.eq(q.field("status"), "AVAILABLE"))
      .collect();

    if (vehicles.length === 0) {
      return { minPrice: 0, maxPrice: 0 };
    }

    const prices = vehicles.map(v => v.price).filter(p => p > 0);
    
    return {
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    };
  },
});

// Get featured vehicles for a dealership
export const getFeaturedVehicles = query({
  args: {
    dealershipId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 6, 20);

    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .filter((q) => 
        q.and(
          q.eq(q.field("status"), "AVAILABLE"),
          q.eq(q.field("featured"), true)
        )
      )
      .collect();

    // Sort by newest first
    vehicles.sort((a, b) => b.createdAt - a.createdAt);

    // Limit results
    const featuredVehicles = vehicles.slice(0, limit);

    // Format for public consumption
    const publicVehicles = featuredVehicles.map(vehicle => ({
      id: vehicle.id,
      stock: vehicle.stock,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      trim: vehicle.trim,
      mileage: vehicle.mileage,
      price: vehicle.price,
      exteriorColor: vehicle.exteriorColor,
      interiorColor: vehicle.interiorColor,
      fuelType: vehicle.fuelType,
      transmission: vehicle.transmission,
      engine: vehicle.engine,
      description: vehicle.description,
      featured: vehicle.featured,
      features: vehicle.features,
      images: vehicle.images || [],
      seoTitle: vehicle.seoTitle,
      seoDescription: vehicle.seoDescription,
    }));

    return {
      vehicles: publicVehicles,
      total: vehicles.length,
    };
  },
});

// Get inventory stats for a dealership (public version)
export const getInventoryStats = query({
  args: {
    dealershipId: v.string(),
  },
  handler: async (ctx, args) => {
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_dealership", (q) => q.eq("dealershipId", args.dealershipId))
      .filter((q) => q.eq(q.field("status"), "AVAILABLE"))
      .collect();

    const totalVehicles = vehicles.length;
    const featuredCount = vehicles.filter(v => v.featured).length;

    // Group by make
    const makeStats = vehicles.reduce((acc, vehicle) => {
      const make = vehicle.make;
      if (!acc[make]) {
        acc[make] = { count: 0, models: new Set() };
      }
      acc[make].count++;
      acc[make].models.add(vehicle.model);
      return acc;
    }, {} as Record<string, { count: number; models: Set<string> }>);

    // Convert to array and sort by count
    const makeList = Object.entries(makeStats)
      .map(([make, stats]) => ({
        make,
        count: stats.count,
        modelCount: stats.models.size,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalVehicles,
      featuredCount,
      makeList,
      lastUpdated: Date.now(),
    };
  },
});

// Public wrapper for rate limit checking
export const checkRateLimit = action({
  args: {
    apiKeyId: v.id("api_keys"),
    dealershipId: v.string(),
  },
  handler: async (ctx, args): Promise<{
    limited: boolean;
    remaining: number;
    limit: number;
    resetTime: number;
    retryAfter: number;
    shouldWait: boolean;
    waitMs: number;
  }> => {
    return await ctx.runQuery(internal.internal.checkRateLimit, {
      apiKeyId: args.apiKeyId,
      dealershipId: args.dealershipId,
    });
  },
});