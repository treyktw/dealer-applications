/**
 * Authentication Rate Limiting
 * Protects authentication endpoints from brute force attacks
 *
 * Rate Limits:
 * - Login attempts: 5 per 15 minutes per email
 * - Registration: 3 per hour per IP
 * - Password reset: 3 per hour per email
 * - Email verification: 5 per hour per email
 */

/**
 * Rate limit configuration
 */
export const AUTH_RATE_LIMITS = {
  // Login attempts
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes after max attempts
  },

  // Registration
  register: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour after max attempts
  },

  // Password reset requests
  passwordReset: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour after max attempts
  },

  // Email verification requests
  emailVerification: {
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 30 * 60 * 1000, // 30 minutes after max attempts
  },
} as const;

/**
 * Rate limit result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  blockedUntil?: number;
  retryAfter?: number;
}

/**
 * Rate limit attempt record
 */
export interface RateLimitAttempt {
  identifier: string; // email or IP
  endpoint: string; // "login", "register", "passwordReset", "emailVerification"
  attemptCount: number;
  windowStartedAt: number;
  blockedUntil?: number;
  lastAttemptAt: number;
}

/**
 * Check if a rate limit has been exceeded
 *
 * @param attempts - Current attempt record
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(
  attempts: RateLimitAttempt | null,
  config: { maxAttempts: number; windowMs: number; blockDurationMs: number }
): RateLimitResult {
  const now = Date.now();

  // No attempts yet - allow
  if (!attempts) {
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: now + config.windowMs,
    };
  }

  // Check if currently blocked
  if (attempts.blockedUntil && attempts.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: attempts.blockedUntil,
      blockedUntil: attempts.blockedUntil,
      retryAfter: Math.ceil((attempts.blockedUntil - now) / 1000), // seconds
    };
  }

  // Check if window has expired - reset counter
  if (now - attempts.windowStartedAt > config.windowMs) {
    return {
      allowed: true,
      remaining: config.maxAttempts,
      resetAt: now + config.windowMs,
    };
  }

  // Within window - check if limit exceeded
  if (attempts.attemptCount >= config.maxAttempts) {
    const blockedUntil = now + config.blockDurationMs;
    return {
      allowed: false,
      remaining: 0,
      resetAt: blockedUntil,
      blockedUntil,
      retryAfter: Math.ceil(config.blockDurationMs / 1000), // seconds
    };
  }

  // Within limits
  return {
    allowed: true,
    remaining: config.maxAttempts - attempts.attemptCount,
    resetAt: attempts.windowStartedAt + config.windowMs,
  };
}

/**
 * Record a rate limit attempt
 *
 * @param existing - Existing attempt record (or null)
 * @param config - Rate limit configuration
 * @returns Updated attempt record
 */
export function recordAttempt(
  existing: RateLimitAttempt | null,
  identifier: string,
  endpoint: string,
  config: { maxAttempts: number; windowMs: number; blockDurationMs: number }
): RateLimitAttempt {
  const now = Date.now();

  // No existing record - create new
  if (!existing) {
    return {
      identifier,
      endpoint,
      attemptCount: 1,
      windowStartedAt: now,
      lastAttemptAt: now,
    };
  }

  // Check if blocked - don't increment counter
  if (existing.blockedUntil && existing.blockedUntil > now) {
    return {
      ...existing,
      lastAttemptAt: now,
    };
  }

  // Check if window expired - reset counter
  if (now - existing.windowStartedAt > config.windowMs) {
    return {
      identifier,
      endpoint,
      attemptCount: 1,
      windowStartedAt: now,
      lastAttemptAt: now,
    };
  }

  // Increment counter within window
  const newAttemptCount = existing.attemptCount + 1;

  // Check if limit exceeded - set block
  const blockedUntil =
    newAttemptCount >= config.maxAttempts ? now + config.blockDurationMs : undefined;

  return {
    ...existing,
    attemptCount: newAttemptCount,
    lastAttemptAt: now,
    blockedUntil,
  };
}

/**
 * Get rate limit identifier from request
 * Uses email for login/password reset, IP for registration
 *
 * @param endpoint - Rate limit endpoint type
 * @param email - User email (if applicable)
 * @param ipAddress - Request IP address (if applicable)
 * @returns Identifier string
 */
export function getRateLimitIdentifier(
  endpoint: keyof typeof AUTH_RATE_LIMITS,
  email?: string,
  ipAddress?: string
): string {
  switch (endpoint) {
    case "login":
    case "passwordReset":
    case "emailVerification":
      // Use email for user-specific endpoints
      return `${endpoint}:${email?.toLowerCase() || "unknown"}`;

    case "register":
      // Use IP for registration to prevent mass signup
      return `${endpoint}:${ipAddress || "unknown"}`;

    default:
      return `${endpoint}:unknown`;
  }
}

/**
 * Format rate limit error message
 *
 * @param result - Rate limit result
 * @param endpoint - Rate limit endpoint
 * @returns User-friendly error message
 */
export function getRateLimitErrorMessage(
  result: RateLimitResult,
  endpoint: keyof typeof AUTH_RATE_LIMITS
): string {
  if (!result.allowed && result.retryAfter) {
    const minutes = Math.ceil(result.retryAfter / 60);

    switch (endpoint) {
      case "login":
        return `Too many login attempts. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`;

      case "register":
        return `Too many registration attempts. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`;

      case "passwordReset":
        return `Too many password reset requests. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`;

      case "emailVerification":
        return `Too many verification requests. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`;

      default:
        return `Too many requests. Please try again later.`;
    }
  }

  return "Rate limit exceeded. Please try again later.";
}

/**
 * Clean up expired rate limit records
 * Should be called periodically (e.g., daily cron job)
 *
 * @param records - All rate limit records
 * @param maxAgeMs - Maximum age to keep records (default: 24 hours)
 * @returns Array of record IDs to delete
 */
export function getExpiredRateLimitRecords(
  records: Array<RateLimitAttempt & { _id: string; createdAt: number }>,
  maxAgeMs: number = 24 * 60 * 60 * 1000 // 24 hours
): string[] {
  const now = Date.now();
  const expiredIds: string[] = [];

  for (const record of records) {
    // Delete if:
    // 1. Record is older than maxAge
    // 2. Block has expired and window has passed
    const isOld = now - record.createdAt > maxAgeMs;
    const isUnblocked =
      (!record.blockedUntil || record.blockedUntil < now) &&
      now - record.windowStartedAt > AUTH_RATE_LIMITS[record.endpoint as keyof typeof AUTH_RATE_LIMITS].windowMs;

    if (isOld || isUnblocked) {
      expiredIds.push(record._id);
    }
  }

  return expiredIds;
}
