import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { fetchQuery } from 'convex/nextjs';
import { api } from '@/convex/_generated/api';
import { getRateLimitStatus } from '@/lib/rate-limit';
import { validateApiKey } from '@/lib/api-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dealershipId: string }> }
) {
  try {
    const { dealershipId } = await params;
    
    // 1. Validate API Key
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }
    
    // Validates and tracks usage automatically
    const keyValidation = await validateApiKey(apiKey, dealershipId);
    if (!keyValidation.valid) {
      return NextResponse.json(
        { error: keyValidation.error, code: 'INVALID_API_KEY' },
        { status: 410 }
      );
    }

    if (!keyValidation.apiKeyDoc) {
      return NextResponse.json(
        { error: 'Invalid API key', code: 'INVALID_API_KEY' },
        { status: 411 }
      );
    }
    
    // 2. Check Rate Limit
    const rateLimitStatus = await getRateLimitStatus(
      keyValidation.apiKeyDoc._id,
      dealershipId
    );
    
    if (rateLimitStatus.limited) {
      return NextResponse.json(
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
    
    // 5. Return with cache headers
    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
        'X-RateLimit-Limit': rateLimitStatus.limit.toString(),
        'X-RateLimit-Remaining': (rateLimitStatus.remaining - 1).toString(),
      }
    });
    
  } catch (error) {
    console.error('Public API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}