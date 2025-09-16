// src/middleware/ip-check.ts
import { NextRequest, NextResponse } from 'next/server';

// In development mode, we might want to allow all IPs or only check certain routes
const ENABLE_IP_CHECK = process.env.ENABLE_IP_CHECK === 'true';

// Define allowed IPs (in a real app, you'd store these in a database or environment variables)
// We'll default to allowing localhost and common development IPs
const allowedIPs = [
  '127.0.0.1',
  '::1',          // IPv6 localhost
  '192.168.1.1',  // Common local IP
];

// Add any extra IPs from env vars
if (process.env.ALLOWED_IPS) {
  const envIPs = process.env.ALLOWED_IPS.split(',').map(ip => ip.trim());
  allowedIPs.push(...envIPs);
}

export function checkIP(req: NextRequest) {
  // Skip IP check if disabled
  if (!ENABLE_IP_CHECK) {
    return true;
  }

  let ip: string | undefined;

  // Get the client's IP address from the request headers
  // In development with localhost, this might be undefined
  if (req.headers.has('x-real-ip')) {
    ip = req.headers.get('x-real-ip') || undefined;
  }

  ip = ip || undefined;

  // If using a proxy like Nginx, the IP might be in the X-Forwarded-For header
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs; the client IP is the first one
    ip = forwardedFor.split(',')[0].trim();
  }

  if (!ip) {
    console.log(`IP Check: IP address not found in request headers.`);
    return false;
  }

  // Check if the IP is in our allowed list
  const isAllowed = allowedIPs.includes(ip);

    // For debugging
  console.log(`IP Check: ${ip} is ${isAllowed ? 'allowed' : 'denied'}`);

  return isAllowed;
}

// Function to handle unauthorized access
export function handleUnauthorized() {
  // Return a 403 Forbidden response
  return new NextResponse('Access Denied: Your IP is not authorized to access the admin area.', {
    status: 403,
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}