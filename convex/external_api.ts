// convex/external_api.ts - Secure REST API for dealer websites
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { internal } from "./_generated/api";
// import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

// Helper to convert string to Convex ID
function toDealershipId(id: string): Id<"dealerships"> {
  return id as unknown as Id<"dealerships">;
}

// Helper to validate dealership ID format
function validateDealershipId(dealershipId: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(dealershipId) && dealershipId.length > 0 && dealershipId.length < 100;
}

// Helper to sanitize string input
function sanitizeString(input: string): string {
  return input.replace(/[<>\"'&]/g, '').trim();
}

// Helper to get client IP
function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for') || 
         request.headers.get('x-real-ip') || 
         request.headers.get('cf-connecting-ip') || 
         'unknown';
}

// Helper for CORS headers
function getCorsHeaders(origin: string | null): Record<string, string> {

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };

  // Check if origin is allowed (simplified for demo - enhance for production)
  if (origin && (origin.includes('localhost') || origin.includes('vercel.app') || origin.includes('netlify.app'))) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, x-api-key';
    headers['Access-Control-Max-Age'] = '86400';
  }

  return headers;
}

// GET /api/vehicles/{dealershipId}
export const getVehicles = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const dealershipId = pathParts[pathParts.length - 1];
  const clientIP = getClientIP(request);
  const origin = request.headers.get('origin');

  try {
    // 1. Input validation
    if (!dealershipId || !validateDealershipId(dealershipId)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid dealership ID format',
        code: 'INVALID_DEALERSHIP_ID' 
      }), {
        status: 400,
        headers: getCorsHeaders(origin),
      });
    }

    // 2. Rate limiting
    const rateLimitResult = await ctx.runMutation(internal.security.checkRateLimit, {
      identifier: clientIP,
      action: 'public_api_vehicles',
      limit: 60, // 60 requests per hour per IP
      windowMs: 3600000,
      ipAddress: clientIP,
    });

    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
        code: 'RATE_LIMITED'
      }), {
        status: 429,
        headers: {
          ...getCorsHeaders(origin),
          'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
        },
      });
    }

    // 3. Parse query parameters
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const make = url.searchParams.get('make');
    const model = url.searchParams.get('model');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const year = url.searchParams.get('year');

    // 4. Fetch vehicles data
    const vehicles = await ctx.runQuery(api.public_api.getVehiclesByDealership, {
      dealershipId: toDealershipId(dealershipId),
      page,
      limit,
      filters: {
        make: make ? sanitizeString(make) : undefined,
        model: model ? sanitizeString(model) : undefined,
        minPrice: minPrice ? parseInt(minPrice) : undefined,
        maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
        year: year ? parseInt(year) : undefined,
      }
    });

    // 5. Log API usage
    await ctx.runMutation(internal.security.logSecurityEvent, {
      action: 'public_api_access',
      dealershipId: toDealershipId(dealershipId),
      success: true,
      details: `Vehicles API accessed: ${vehicles.vehicles.length} results`,
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // 6. Return sanitized response
    return new Response(JSON.stringify({
      vehicles: vehicles.vehicles,
      pagination: vehicles.pagination,
      timestamp: Date.now(),
    }), {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        'Cache-Control': 'public, max-age=300, s-maxage=600', // 5 min browser, 10 min CDN
        'ETag': `"${Date.now()}"`,
      },
    });

  } catch (error) {
    console.error('External API error (vehicles):', error);
    
    // Log error
    await ctx.runMutation(internal.security.logSecurityEvent, {
      action: 'public_api_error',
      dealershipId: toDealershipId(dealershipId),
      success: false,
      details: `API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: clientIP,
    });

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: getCorsHeaders(origin),
    });
  }
});

// GET /api/vehicle/{dealershipId}/{vehicleId}
export const getVehicle = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const vehicleId = pathParts[pathParts.length - 1];
  const dealershipId = pathParts[pathParts.length - 2];
  const clientIP = getClientIP(request);
  const origin = request.headers.get('origin');

  try {
    // 1. Input validation
    if (!dealershipId || !validateDealershipId(dealershipId)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid dealership ID',
        code: 'INVALID_DEALERSHIP_ID'
      }), {
        status: 400,
        headers: getCorsHeaders(origin),
      });
    }

    if (!vehicleId || vehicleId.length < 1 || vehicleId.length > 100) {
      return new Response(JSON.stringify({ 
        error: 'Invalid vehicle ID',
        code: 'INVALID_VEHICLE_ID'
      }), {
        status: 400,
        headers: getCorsHeaders(origin),
      });
    }

    // 2. Rate limiting
    const rateLimitResult = await ctx.runMutation(internal.security.checkRateLimit, {
      identifier: clientIP,
      action: 'public_api_vehicle',
      limit: 100, // 100 requests per hour per IP
      windowMs: 3600000,
      ipAddress: clientIP,
    });

    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
        code: 'RATE_LIMITED'
      }), {
        status: 429,
        headers: {
          ...getCorsHeaders(origin),
          'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
        },
      });
    }

    // 3. Fetch vehicle data
    const vehicle = await ctx.runQuery(api.public_api.getVehicleById, {
      vehicleId,
      dealershipId: toDealershipId(dealershipId)
    });

    if (!vehicle) {
      return new Response(JSON.stringify({ 
        error: 'Vehicle not found',
        code: 'VEHICLE_NOT_FOUND'
      }), {
        status: 404,
        headers: getCorsHeaders(origin),
      });
    }

    // 4. Log API usage
    await ctx.runMutation(internal.security.logSecurityEvent, {
      action: 'public_api_vehicle_view',
      dealershipId: toDealershipId(dealershipId),
      success: true,
      details: `Vehicle ${vehicleId} viewed`,
      ipAddress: clientIP,
    });

    return new Response(JSON.stringify({
      vehicle,
      timestamp: Date.now(),
    }), {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        'Cache-Control': 'public, max-age=600, s-maxage=1200', // 10 min browser, 20 min CDN
        'ETag': `"${vehicle.id}-${vehicle.updatedAt}"`,
      },
    });

  } catch (error) {
    console.error('External API error (vehicle):', error);
    
    await ctx.runMutation(internal.security.logSecurityEvent, {
      action: 'public_api_error',
      dealershipId: toDealershipId(dealershipId),
      success: false,
      details: `Vehicle API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: clientIP,
    });

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: getCorsHeaders(origin),
    });
  }
});

// GET /api/dealership/{dealershipId}
export const getDealership = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const dealershipId = pathParts[pathParts.length - 1];
  const clientIP = getClientIP(request);
  const origin = request.headers.get('origin');

  try {
    // 1. Input validation
    if (!dealershipId || !validateDealershipId(dealershipId)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid dealership ID',
        code: 'INVALID_DEALERSHIP_ID'
      }), {
        status: 400,
        headers: getCorsHeaders(origin),
      });
    }

    // 2. Rate limiting (more lenient for dealership info)
    const rateLimitResult = await ctx.runMutation(internal.security.checkRateLimit, {
      identifier: clientIP,
      action: 'public_api_dealership',
      limit: 20, // 20 requests per hour per IP
      windowMs: 3600000,
      ipAddress: clientIP,
    });

    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
        code: 'RATE_LIMITED'
      }), {
        status: 429,
        headers: {
          ...getCorsHeaders(origin),
          'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
        },
      });
    }

    // 3. Fetch dealership data
    const dealership = await ctx.runQuery(api.public_api.getDealershipInfo, {
      dealershipId: toDealershipId(dealershipId)
    });

    if (!dealership) {
      return new Response(JSON.stringify({ 
        error: 'Dealership not found',
        code: 'DEALERSHIP_NOT_FOUND'
      }), {
        status: 404,
        headers: getCorsHeaders(origin),
      });
    }

    // 4. Log API usage
    await ctx.runMutation(internal.security.logSecurityEvent, {
      action: 'public_api_dealership_view',
      dealershipId: toDealershipId(dealershipId),
      success: true,
      details: 'Dealership info accessed',
      ipAddress: clientIP,
    });

    return new Response(JSON.stringify({
      dealership,
      timestamp: Date.now(),
    }), {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        'Cache-Control': 'public, max-age=3600, s-maxage=7200', // 1 hour browser, 2 hours CDN
        'ETag': `"${dealership.id}-${dealership.updatedAt}"`,
      },
    });

  } catch (error) {
    console.error('External API error (dealership):', error);
    
    await ctx.runMutation(internal.security.logSecurityEvent, {
      action: 'public_api_error',
      dealershipId: toDealershipId(dealershipId),
      success: false,
      details: `Dealership API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: clientIP,
    });

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: getCorsHeaders(origin),
    });
  }
});

// GET /api/search/{dealershipId}
export const searchVehicles = httpAction(async (ctx, request) => {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/');
  const dealershipId = pathParts[pathParts.length - 1];
  const clientIP = getClientIP(request);
  const origin = request.headers.get('origin');

  try {
    // 1. Input validation
    if (!dealershipId || !validateDealershipId(dealershipId)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid dealership ID',
        code: 'INVALID_DEALERSHIP_ID'
      }), {
        status: 400,
        headers: getCorsHeaders(origin),
      });
    }

    const searchTerm = url.searchParams.get('q');
    if (!searchTerm || searchTerm.length < 2 || searchTerm.length > 100) {
      return new Response(JSON.stringify({ 
        error: 'Search term must be between 2 and 100 characters',
        code: 'INVALID_SEARCH_TERM'
      }), {
        status: 400,
        headers: getCorsHeaders(origin),
      });
    }

    // 2. Rate limiting (stricter for search)
    const rateLimitResult = await ctx.runMutation(internal.security.checkRateLimit, {
      identifier: clientIP,
      action: 'public_api_search',
      limit: 30, // 30 searches per hour per IP
      windowMs: 3600000,
      ipAddress: clientIP,
    });

    if (!rateLimitResult.allowed) {
      return new Response(JSON.stringify({ 
        error: 'Rate limit exceeded',
        retryAfter: rateLimitResult.retryAfter,
        code: 'RATE_LIMITED'
      }), {
        status: 429,
        headers: {
          ...getCorsHeaders(origin),
          'Retry-After': rateLimitResult.retryAfter?.toString() || '3600',
        },
      });
    }

    // 3. Perform search
    const limit = Math.min(20, Math.max(1, parseInt(url.searchParams.get('limit') || '10')));
    
    const results = await ctx.runQuery(api.public_api.searchVehicles, {
      dealershipId: toDealershipId(dealershipId),
      searchTerm: sanitizeString(searchTerm),
      limit,
    });

    // 4. Log search
    await ctx.runMutation(internal.security.logSecurityEvent, {
      action: 'public_api_search',
      dealershipId: toDealershipId(dealershipId),
      success: true,
      details: `Search: "${searchTerm}" - ${results.vehicles.length} results`,
      ipAddress: clientIP,
    });

    return new Response(JSON.stringify({
      vehicles: results.vehicles,
      total: results.total,
      searchTerm: sanitizeString(searchTerm),
      timestamp: Date.now(),
    }), {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        'Cache-Control': 'public, max-age=180, s-maxage=300', // 3 min browser, 5 min CDN
      },
    });

  } catch (error) {
    console.error('External API error (search):', error);
    
    await ctx.runMutation(internal.security.logSecurityEvent, {
      action: 'public_api_error',
      dealershipId: toDealershipId(dealershipId),
      success: false,
      details: `Search API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ipAddress: clientIP,
    });

    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }), {
      status: 500,
      headers: getCorsHeaders(origin),
    });
  }
});

// OPTIONS handler for CORS preflight
export const handleOptions = httpAction(async (_ctx, request) => {
  const origin = request.headers.get('origin');
  
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(origin),
  });
});