// lib/cors.ts - CORS helper for public API routes

import type { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

/**
 * Get CORS headers for a verified domain
 * 
 * @param origin - The Origin header from the request
 * @param verified - Whether the domain is verified for this dealership
 * @returns CORS headers object
 */
export function getCorsHeaders(origin: string | null, verified: boolean): Record<string, string> {
  // If no origin or not verified, return empty headers (will block CORS)
  if (!verified || !origin) {
    return {};
  }
  
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
    'Access-Control-Allow-Credentials': 'false',
    'Vary': 'Origin', // Important for CDN caching with multiple origins
  };
}

/**
 * Check if origin is from a verified domain for the dealership
 * This will be called by API route handlers
 * 
 * @param origin - Request origin
 * @param dealershipId - Dealership ID from the API request
 * @returns Promise<boolean> - Whether the domain is verified
 */
export async function isVerifiedOrigin(origin: string | null, dealershipId: string): Promise<boolean> {
  if (!origin) return false;
  
  // Extract domain from origin (e.g., https://dealer.com -> dealer.com)
  let domain: string;
  try {
    const url = new URL(origin);
    domain = url.hostname;
  } catch {
    return false;
  }
  
  // For local development, allow localhost
  if (process.env.NODE_ENV === 'development' && domain.includes('localhost')) {
    return true;
  }
  
  // Query Convex to check if domain is verified for this dealership
  try {
    const result = await fetchQuery(api.domain_verification.isDomainVerified, {
      domain,
      dealershipId,
    });
    
    return result.verified;
  } catch (error) {
    console.error('Error checking domain verification:', error);
    return false;
  }
}

/**
 * Apply CORS headers to a NextResponse
 * 
 * @param response - NextResponse object
 * @param origin - Request origin
 * @param verified - Whether domain is verified
 * @returns NextResponse with CORS headers
 */
export function applyCorsHeaders(
  response: NextResponse, 
  origin: string | null, 
  verified: boolean
): NextResponse {
  const corsHeaders = getCorsHeaders(origin, verified);
  
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}