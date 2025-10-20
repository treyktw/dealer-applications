// middleware.ts - Updated for Subscription First Flow + Public API CORS
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in", 
  "/sign-in/(.*)",
  "/sign-up", 
  "/sign-up/(.*)",
  "/employee-signup",
  "/employee-signup/(.*)",
  "/verify-email",
  "/verify-email/(.*)",
  "/invitation/(.*)",
  "/api/(.*)", // Allow API routes to be public for external access
  "/desktop-sso",
  "/desktop-sso/(.*)",
  '/desktop-sso(.*)',
  '/desktop-callback(.*)',
  '/desktop-callback/(.*)',
]);

// Routes that are part of the setup flow (don't redirect these)
const setupRoutes = [
  "/subscription",
  "/onboarding", 
];

// Public API routes that need CORS handling
const isPublicApiRoute = (pathname: string) => {
  return pathname.startsWith('/api/public/v1/');
};

/**
 * Handle CORS for public API routes
 * This allows dealer websites to fetch inventory data from their domains
 */
function handlePublicApiCors(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  // Handle OPTIONS preflight requests globally for public API
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, X-API-Key, Authorization',
        'Access-Control-Max-Age': '86400', // 24 hours
        'Access-Control-Allow-Credentials': 'false',
      },
    });
  }
  
  // For non-OPTIONS requests, let the route handler validate the domain
  // and add appropriate CORS headers based on verification status
  return NextResponse.next();
}

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const url = new URL(req.url);

  // Handle public API CORS before any other logic
  if (isPublicApiRoute(url.pathname)) {
    return handlePublicApiCors(req);
  }

  // Allow public routes
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }
  
  // Handle invitation flow - redirect to employee sign-up with token
  if (url.pathname.startsWith('/invitation/')) {
    const token = url.pathname.split('/').pop();
    if (token) {
      const employeeSignUpUrl = new URL('/employee-signup', req.url);
      employeeSignUpUrl.searchParams.set('token', token);
      return NextResponse.redirect(employeeSignUpUrl);
    }
  }
  
  // Check if user is authenticated for protected routes
  if (!userId) {
    const signInUrl = new URL('/sign-up', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  // Allow setup routes to handle their own flow logic
  if (setupRoutes.some(route => url.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // For all other protected routes, let the dashboard layout handle the flow
  // The dashboard layout will check:
  // 1. If no subscription -> redirect to /subscription
  // 2. If subscription but no dealership -> redirect to /onboarding  
  // 3. If both -> allow access
  
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all routes except static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Explicitly include public API routes
    '/api/public/v1/:path*',
  ],
};