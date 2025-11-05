import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { getRateLimitStatus } from '@/lib/rate-limit';
import { validateApiKey } from '@/lib/api-auth';
import { isVerifiedOrigin, applyCorsHeaders } from '@/lib/cors';

// Route segment config for Next.js 15
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Handle OPTIONS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
      'Access-Control-Max-Age': '86400',
      'Access-Control-Allow-Credentials': 'false',
    },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealershipId: string }> }
) {
  let dealershipId: string | undefined;
  let origin: string | null = null;
  
  try {
    // Await params first
    const resolvedParams = await params;
    dealershipId = resolvedParams.dealershipId;
    
    // Get origin for CORS
    origin = request.headers.get('origin');
    
    // Log request for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Inventory API] GET request for dealership: ${dealershipId}`);
    }
    
    // 1. Validate API Key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      const response = NextResponse.json(
        { error: 'Missing API key', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
      // Add CORS headers even for errors
      if (dealershipId) {
        return applyCorsHeaders(response, origin, await isVerifiedOrigin(origin, dealershipId));
      }
      return response;
    }
    
    // Validates and tracks usage automatically
    const keyValidation = await validateApiKey(apiKey, dealershipId);
    if (!keyValidation.valid) {
      const response = NextResponse.json(
        { error: keyValidation.error, code: 'INVALID_API_KEY' },
        { status: 410 }
      );
      return applyCorsHeaders(response, origin, await isVerifiedOrigin(origin, dealershipId));
    }

    if (!keyValidation.apiKeyDoc) {
      const response = NextResponse.json(
        { error: 'Invalid API key', code: 'INVALID_API_KEY' },
        { status: 411 }
      );
      return applyCorsHeaders(response, origin, await isVerifiedOrigin(origin, dealershipId));
    }
    
    // 2. Check Rate Limit
    const rateLimitStatus = await getRateLimitStatus(
      keyValidation.apiKeyDoc._id,
      dealershipId
    );
    
    if (rateLimitStatus.limited) {
      const response = NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          code: 'RATE_LIMITED',
          retryAfter: rateLimitStatus.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitStatus.retryAfter.toString(),
            'X-RateLimit-Limit': rateLimitStatus.limit.toString(),
            'X-RateLimit-Remaining': rateLimitStatus.remaining.toString(),
            'X-RateLimit-Reset': rateLimitStatus.resetTime.toString(),
          }
        }
      );
      return applyCorsHeaders(response, origin, await isVerifiedOrigin(origin, dealershipId));
    }
    
    // 3. Parse Query Params
    const searchParams = request.nextUrl.searchParams;
    const yearParam = searchParams.get('year');
    const minPriceParam = searchParams.get('minPrice');
    const maxPriceParam = searchParams.get('maxPrice');
    
    const filters = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 50),
      make: searchParams.get('make') || undefined,
      model: searchParams.get('model') || undefined,
      year: yearParam ? parseInt(yearParam) : undefined,
      minPrice: minPriceParam ? parseFloat(minPriceParam) : undefined,
      maxPrice: maxPriceParam ? parseFloat(maxPriceParam) : undefined,
      featured: searchParams.get('featured') === 'true' ? true : undefined,
      sortBy: searchParams.get('sortBy') as 'price' | 'year' | 'mileage' | 'createdAt' || 'createdAt',
      sortOrder: searchParams.get('sortOrder') as 'asc' | 'desc' || 'desc',
    };
    
    // 4. Fetch from Convex
    const result = await fetchQuery(api.public_api.getVehiclesByDealership, {
      dealershipId,
      ...filters
    });
    
    // Check if domain is verified for CORS
    const verified = await isVerifiedOrigin(origin, dealershipId);
    
    // 5. Return with cache headers and CORS
    const response = NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
        'X-RateLimit-Limit': rateLimitStatus.limit.toString(),
        'X-RateLimit-Remaining': (rateLimitStatus.remaining - 1).toString(),
      }
    });
    
    return applyCorsHeaders(response, origin, verified);
    
  } catch (error) {
    console.error('[Inventory API] Error:', error);
    console.error('[Inventory API] Error details:', {
      dealershipId,
      url: request.url,
      method: request.method,
      error: error instanceof Error ? error.message : String(error),
    });
    
    const response = NextResponse.json(
      { 
        error: 'Internal server error', 
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      },
      { status: 500 }
    );
    
    // Add CORS headers if we have dealershipId
    if (dealershipId && origin) {
      try {
        return applyCorsHeaders(response, origin, await isVerifiedOrigin(origin, dealershipId));
      } catch (corsError) {
        console.error('[Inventory API] CORS error:', corsError);
      }
    }
    
    return response;
  }
}