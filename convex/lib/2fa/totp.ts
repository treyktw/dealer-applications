/**
 * TOTP (Time-based One-Time Password) Implementation
 * RFC 6238 compliant for use with authenticator apps
 *
 * Supports:
 * - Google Authenticator
 * - Authy
 * - Microsoft Authenticator
 * - 1Password
 * - Any RFC 6238 compliant authenticator
 */

/**
 * Generate a cryptographically secure random secret for TOTP
 * Returns base32-encoded secret (standard for authenticator apps)
 */
export function generateTOTPSecret(): string {
  // Generate 20 random bytes (160 bits) - standard for TOTP
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);

  // Convert to base32 (RFC 4648)
  return base32Encode(bytes);
}

/**
 * Generate TOTP code from secret
 *
 * @param secret - Base32-encoded secret
 * @param timeStep - Time step in seconds (default: 30)
 * @param digits - Number of digits in code (default: 6)
 * @returns 6-digit TOTP code
 */
export async function generateTOTPCode(
  secret: string,
  timeStep: number = 30,
  digits: number = 6
): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  return await generateHOTP(secret, counter, digits);
}

/**
 * Validate TOTP code against secret
 * Allows for time drift (checks current, previous, and next time window)
 *
 * @param code - User-provided 6-digit code
 * @param secret - Base32-encoded secret
 * @param timeStep - Time step in seconds (default: 30)
 * @param window - Number of time steps to check before/after (default: 1)
 * @returns true if valid, false otherwise
 */
export async function validateTOTPCode(
  code: string,
  secret: string,
  timeStep: number = 30,
  window: number = 1
): Promise<boolean> {
  const currentCounter = Math.floor(Date.now() / 1000 / timeStep);

  // Check current, previous, and next time windows to account for clock drift
  for (let i = -window; i <= window; i++) {
    const counter = currentCounter + i;
    const expectedCode = await generateHOTP(secret, counter, 6);

    if (code === expectedCode) {
      return true;
    }
  }

  return false;
}

/**
 * Generate HOTP (HMAC-based One-Time Password) - used internally by TOTP
 * RFC 4226 compliant
 */
async function generateHOTP(
  secret: string,
  counter: number,
  digits: number = 6
): Promise<string> {
  // Decode base32 secret to bytes
  const secretBytes = base32Decode(secret);

  // Convert counter to 8-byte buffer (big-endian)
  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setBigUint64(0, BigInt(counter), false);

  // Import secret as HMAC key
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  // Generate HMAC-SHA1
  const hmacBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    counterBuffer
  );

  const hmac = new Uint8Array(hmacBuffer);

  // Dynamic truncation (RFC 4226 Section 5.3)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  // Generate code
  const code = binary % Math.pow(10, digits);

  // Pad with leading zeros
  return code.toString().padStart(digits, "0");
}

/**
 * Generate backup codes for account recovery
 * Each code is 8 characters (alphanumeric, excluding ambiguous characters)
 *
 * @param count - Number of backup codes to generate (default: 10)
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  // Character set excluding ambiguous characters (0, O, I, 1, l)
  const charset = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const codeLength = 8;

  for (let i = 0; i < count; i++) {
    let code = "";
    const randomBytes = new Uint8Array(codeLength);
    crypto.getRandomValues(randomBytes);

    for (let j = 0; j < codeLength; j++) {
      code += charset[randomBytes[j] % charset.length];
    }

    // Format as XXXX-XXXX for readability
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }

  return codes;
}

/**
 * Hash backup code for secure storage
 * Uses SHA-256 for fast verification
 */
export async function hashBackupCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code.replace("-", "").toUpperCase());

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);

  // Convert to hex string
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify backup code against hash
 */
export async function verifyBackupCode(
  code: string,
  hash: string
): Promise<boolean> {
  const codeHash = await hashBackupCode(code);
  return codeHash === hash;
}

/**
 * Generate OTPAuth URI for QR code
 * Format: otpauth://totp/LABEL?secret=SECRET&issuer=ISSUER
 *
 * @param secret - Base32-encoded secret
 * @param accountName - User's email or identifier
 * @param issuer - Application name
 * @returns OTPAuth URI
 */
export function generateOTPAuthURI(
  secret: string,
  accountName: string,
  issuer: string = "Dealer Applications"
): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Generate QR code data URL for TOTP setup
 * Uses a simple QR code generation approach
 *
 * @param otpAuthURI - OTPAuth URI
 * @returns Data URL for QR code image
 */
export function generateQRCodeDataURL(otpAuthURI: string): string {
  // For production, you'd use a proper QR code library
  // This is a placeholder that returns a Google Charts API URL
  // In a real implementation, generate QR codes server-side or use a library

  const encodedURI = encodeURIComponent(otpAuthURI);
  return `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodedURI}&choe=UTF-8`;
}

/**
 * Base32 encoding (RFC 4648)
 * Used for TOTP secrets to be compatible with authenticator apps
 */
function base32Encode(buffer: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }

  return output;
}

/**
 * Base32 decoding (RFC 4648)
 */
function base32Decode(base32: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleanBase32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, "");

  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.ceil((cleanBase32.length * 5) / 8));

  for (let i = 0; i < cleanBase32.length; i++) {
    const char = cleanBase32[i];
    const charValue = alphabet.indexOf(char);

    if (charValue === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }

    value = (value << 5) | charValue;
    bits += 5;

    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return output.slice(0, index);
}

/**
 * Validate TOTP secret format
 */
export function isValidTOTPSecret(secret: string): boolean {
  if (!secret || typeof secret !== "string") {
    return false;
  }

  // Base32 alphabet check
  const base32Regex = /^[A-Z2-7]+=*$/;
  return base32Regex.test(secret.toUpperCase());
}

/**
 * Validate TOTP code format
 */
export function isValidTOTPCode(code: string): boolean {
  if (!code || typeof code !== "string") {
    return false;
  }

  // Should be 6 digits
  const codeRegex = /^\d{6}$/;
  return codeRegex.test(code);
}

/**
 * Validate backup code format
 */
export function isValidBackupCode(code: string): boolean {
  if (!code || typeof code !== "string") {
    return false;
  }

  // Should be XXXX-XXXX format with alphanumeric characters
  const backupCodeRegex = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/i;
  return backupCodeRegex.test(code);
}

/**
 * Get remaining time in current TOTP window
 * Useful for showing countdown timer in UI
 *
 * @param timeStep - Time step in seconds (default: 30)
 * @returns Seconds remaining in current window
 */
export function getTOTPRemainingTime(timeStep: number = 30): number {
  const now = Math.floor(Date.now() / 1000);
  return timeStep - (now % timeStep);
}

/**
 * Check if 2FA code has been used recently (prevent replay attacks)
 * This should be called by the Convex function to track used codes
 *
 * @param code - TOTP code
 * @param usedCodes - Map of recently used codes with timestamps
 * @param maxAge - Maximum age in seconds to consider a code as recently used
 * @returns true if code was recently used
 */
export function isCodeRecentlyUsed(
  code: string,
  usedCodes: Map<string, number>,
  maxAge: number = 90
): boolean {
  const now = Date.now();
  const usedAt = usedCodes.get(code);

  if (!usedAt) {
    return false;
  }

  // Check if code was used within the maxAge window
  return (now - usedAt) < (maxAge * 1000);
}
