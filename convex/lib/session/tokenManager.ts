/**
 * Session Token Manager
 * Handles JWT generation, validation, and refresh token rotation
 */

/**
 * Token Types
 */
export type TokenType = "access" | "refresh";

/**
 * Token Payload
 */
export interface TokenPayload {
  userId: string;
  sessionId: string;
  type: TokenType;
  iat: number; // Issued at (timestamp)
  exp: number; // Expires at (timestamp)
}

/**
 * Session Configuration
 */
export const SESSION_CONFIG = {
  access: {
    expiresIn: 15 * 60 * 1000, // 15 minutes
  },
  refresh: {
    expiresIn: 30 * 24 * 60 * 60 * 1000, // 30 days
    rotateOnUse: true, // Rotate refresh token on each use
  },
  // Idle timeout - revoke session after this period of inactivity
  idleTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
  // Absolute timeout - revoke session after this period regardless of activity
  absoluteTimeout: 30 * 24 * 60 * 60 * 1000, // 30 days
} as const;

/**
 * Generate a cryptographically secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Generate session ID
 */
export function generateSessionId(): string {
  return generateSecureToken(32);
}

/**
 * Generate access token (short-lived)
 * Note: In a real implementation, you'd use a proper JWT library
 * For Convex, we'll use simple token storage in the database
 */
export function generateAccessToken(userId: string, sessionId: string): {
  token: string;
  expiresAt: number;
} {
  const token = generateSecureToken(48);
  const expiresAt = Date.now() + SESSION_CONFIG.access.expiresIn;

  return {
    token,
    expiresAt,
  };
}

/**
 * Generate refresh token (long-lived)
 */
export function generateRefreshToken(userId: string, sessionId: string): {
  token: string;
  expiresAt: number;
} {
  const token = generateSecureToken(64);
  const expiresAt = Date.now() + SESSION_CONFIG.refresh.expiresIn;

  return {
    token,
    expiresAt,
  };
}

/**
 * Hash token for secure storage
 * Uses SHA-256 for fast lookups
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify token hash
 */
export async function verifyTokenHash(
  token: string,
  hash: string
): Promise<boolean> {
  const tokenHash = await hashToken(token);
  return tokenHash === hash;
}

/**
 * Check if token is expired
 */
export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

/**
 * Check if session is idle
 */
export function isSessionIdle(lastActivityAt: number): boolean {
  return Date.now() - lastActivityAt >= SESSION_CONFIG.idleTimeout;
}

/**
 * Check if session has exceeded absolute timeout
 */
export function isSessionExpired(createdAt: number): boolean {
  return Date.now() - createdAt >= SESSION_CONFIG.absoluteTimeout;
}

/**
 * Extract device info from user agent
 */
export function parseUserAgent(userAgent: string): {
  browser: string;
  os: string;
  device: string;
} {
  // Simple user agent parsing
  // In production, use a proper user agent parser library

  let browser = "Unknown";
  let os = "Unknown";
  let device = "Desktop";

  // Browser detection
  if (userAgent.includes("Chrome")) browser = "Chrome";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Safari")) browser = "Safari";
  else if (userAgent.includes("Edge")) browser = "Edge";

  // OS detection
  if (userAgent.includes("Windows")) os = "Windows";
  else if (userAgent.includes("Mac")) os = "macOS";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("iOS")) os = "iOS";

  // Device detection
  if (userAgent.includes("Mobile") || userAgent.includes("Android")) {
    device = "Mobile";
  } else if (userAgent.includes("Tablet") || userAgent.includes("iPad")) {
    device = "Tablet";
  }

  return { browser, os, device };
}

/**
 * Get IP address location (simplified)
 * In production, integrate with a geolocation service
 */
export function getLocationFromIP(ipAddress: string): {
  city?: string;
  country?: string;
  approximate: boolean;
} {
  // For localhost/private IPs
  if (
    ipAddress === "127.0.0.1" ||
    ipAddress === "::1" ||
    ipAddress.startsWith("192.168.") ||
    ipAddress.startsWith("10.") ||
    ipAddress.startsWith("172.")
  ) {
    return {
      city: "Local",
      country: "Local",
      approximate: false,
    };
  }

  // In production, call a geolocation API here
  return {
    approximate: true,
  };
}

/**
 * Generate session fingerprint for additional security
 * Combines multiple factors to detect session hijacking
 */
export async function generateSessionFingerprint(data: {
  userId: string;
  userAgent: string;
  ipAddress: string;
}): Promise<string> {
  const fingerprintData = `${data.userId}:${data.userAgent}:${data.ipAddress}`;
  return await hashToken(fingerprintData);
}

/**
 * Verify session fingerprint
 */
export async function verifySessionFingerprint(
  data: {
    userId: string;
    userAgent: string;
    ipAddress: string;
  },
  storedFingerprint: string
): Promise<boolean> {
  const currentFingerprint = await generateSessionFingerprint(data);
  return currentFingerprint === storedFingerprint;
}

/**
 * Session token pair
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
}

/**
 * Generate token pair for a session
 */
export function generateTokenPair(
  userId: string,
  sessionId: string
): TokenPair {
  const access = generateAccessToken(userId, sessionId);
  const refresh = generateRefreshToken(userId, sessionId);

  return {
    accessToken: access.token,
    refreshToken: refresh.token,
    accessTokenExpiresAt: access.expiresAt,
    refreshTokenExpiresAt: refresh.expiresAt,
  };
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  browser: string;
  os: string;
  device: string;
  ipAddress: string;
  location?: {
    city?: string;
    country?: string;
  };
  createdAt: number;
  lastActivityAt: number;
  userAgent: string;
}

/**
 * Create session metadata from request
 */
export function createSessionMetadata(
  userAgent: string,
  ipAddress: string
): Omit<SessionMetadata, "createdAt" | "lastActivityAt"> {
  const deviceInfo = parseUserAgent(userAgent);
  const location = getLocationFromIP(ipAddress);

  return {
    browser: deviceInfo.browser,
    os: deviceInfo.os,
    device: deviceInfo.device,
    ipAddress,
    location: location.approximate
      ? undefined
      : { city: location.city, country: location.country },
    userAgent,
  };
}

/**
 * Detect suspicious session activity
 */
export function detectSuspiciousActivity(
  currentSession: SessionMetadata,
  newRequest: {
    userAgent: string;
    ipAddress: string;
  }
): {
  suspicious: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];
  let suspicious = false;

  // Check if IP address changed dramatically
  if (currentSession.ipAddress !== newRequest.ipAddress) {
    const currentIsPrivate =
      currentSession.ipAddress.startsWith("192.168.") ||
      currentSession.ipAddress.startsWith("10.");
    const newIsPrivate =
      newRequest.ipAddress.startsWith("192.168.") ||
      newRequest.ipAddress.startsWith("10.");

    // Only flag if both aren't private IPs (which can change legitimately)
    if (!currentIsPrivate && !newIsPrivate) {
      reasons.push("IP address changed");
      suspicious = true;
    }
  }

  // Check if user agent changed dramatically
  const currentDevice = parseUserAgent(currentSession.userAgent);
  const newDevice = parseUserAgent(newRequest.userAgent);

  if (currentDevice.os !== newDevice.os) {
    reasons.push("Operating system changed");
    suspicious = true;
  }

  if (
    currentDevice.device !== newDevice.device &&
    !(currentDevice.device === "Desktop" && newDevice.device === "Mobile") &&
    !(currentDevice.device === "Mobile" && newDevice.device === "Desktop")
  ) {
    reasons.push("Device type changed");
    suspicious = true;
  }

  return {
    suspicious,
    reasons,
  };
}

/**
 * Rate limit for session creation
 * Prevents session creation spam
 */
export const SESSION_RATE_LIMIT = {
  maxSessionsPerUser: 10, // Maximum concurrent sessions per user
  maxSessionsPerIP: 5, // Maximum concurrent sessions per IP (helps prevent bot attacks)
  createWindowMs: 60 * 60 * 1000, // 1 hour window
  maxCreatesInWindow: 5, // Maximum session creations in window
} as const;
