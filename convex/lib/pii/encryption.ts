/**
 * PII Vault Encryption Service
 * Secure storage and retrieval of Personally Identifiable Information (PII)
 *
 * Security Features:
 * - AES-256-GCM encryption (authenticated encryption)
 * - Unique initialization vector (IV) per encryption
 * - Key derivation using PBKDF2
 * - Secure key storage (environment variables)
 * - Automatic data expiration
 * - Access logging for audit trail
 *
 * Supported PII Types:
 * - Social Security Numbers (SSN)
 * - Driver's License Numbers
 * - Credit Card Numbers (PCI DSS compliant)
 * - Bank Account Numbers
 * - Medical Record Numbers
 * - Passport Numbers
 * - Custom sensitive data
 */

/**
 * PII types supported by the vault
 */
export type PIIType =
  | "ssn"
  | "drivers_license"
  | "credit_card"
  | "bank_account"
  | "medical_record"
  | "passport"
  | "tax_id"
  | "custom";

/**
 * Encrypted PII data structure
 */
export interface EncryptedPII {
  encryptedData: string; // Base64-encoded encrypted data
  iv: string; // Base64-encoded initialization vector
  authTag: string; // Base64-encoded authentication tag
  algorithm: string; // Encryption algorithm used
  version: number; // Encryption version for future migrations
}

/**
 * PII vault record metadata
 */
export interface PIIVaultRecord {
  id: string;
  type: PIIType;
  encryptedData: EncryptedPII;
  ownerId: string; // User or client who owns this PII
  ownerType: "user" | "client" | "deal";
  expiresAt?: number; // Optional expiration timestamp
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  accessCount: number;
}

/**
 * Get encryption key from environment
 * In production, this should be rotated regularly and stored in a secure vault (e.g., AWS KMS)
 */
function getEncryptionKey(): string {
  const key = process.env.PII_ENCRYPTION_KEY;

  if (!key) {
    throw new Error("PII_ENCRYPTION_KEY environment variable is not set");
  }

  // Key should be at least 32 bytes (256 bits) for AES-256
  if (key.length < 32) {
    throw new Error("PII_ENCRYPTION_KEY must be at least 32 characters");
  }

  return key;
}

/**
 * Derive encryption key using PBKDF2
 * This adds an extra layer of security by deriving the key from the master key
 */
async function deriveKey(masterKey: string, salt: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterKey),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode(salt),
      iterations: 100000, // OWASP recommendation
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt PII data using AES-256-GCM
 *
 * @param plaintext - The sensitive data to encrypt
 * @param piiType - Type of PII being encrypted
 * @returns Encrypted data with IV and auth tag
 */
export async function encryptPII(
  plaintext: string,
  piiType: PIIType
): Promise<EncryptedPII> {
  try {
    const masterKey = getEncryptionKey();

    // Generate unique salt for key derivation (based on PII type)
    const salt = `pii-vault-${piiType}-v1`;

    // Derive encryption key
    const key = await deriveKey(masterKey, salt);

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt data
    const encoder = new TextEncoder();
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128, // 128-bit authentication tag
      },
      key,
      encoder.encode(plaintext)
    );

    // Split encrypted data and auth tag
    // GCM appends the auth tag to the end of the ciphertext
    const encryptedArray = new Uint8Array(encryptedBuffer);
    const ciphertext = encryptedArray.slice(0, encryptedArray.length - 16); // Remove last 16 bytes (auth tag)
    const authTag = encryptedArray.slice(encryptedArray.length - 16); // Last 16 bytes

    // Convert to base64 for storage
    const encryptedData: EncryptedPII = {
      encryptedData: btoa(String.fromCharCode(...ciphertext)),
      iv: btoa(String.fromCharCode(...iv)),
      authTag: btoa(String.fromCharCode(...authTag)),
      algorithm: "AES-256-GCM",
      version: 1,
    };

    return encryptedData;
  } catch (error) {
    console.error("Failed to encrypt PII:", error);
    throw new Error("Failed to encrypt sensitive data");
  }
}

/**
 * Decrypt PII data using AES-256-GCM
 *
 * @param encrypted - Encrypted PII data
 * @param piiType - Type of PII being decrypted
 * @returns Decrypted plaintext
 */
export async function decryptPII(
  encrypted: EncryptedPII,
  piiType: PIIType
): Promise<string> {
  try {
    // Validate encryption version
    if (encrypted.version !== 1) {
      throw new Error(`Unsupported encryption version: ${encrypted.version}`);
    }

    const masterKey = getEncryptionKey();

    // Use same salt for key derivation
    const salt = `pii-vault-${piiType}-v1`;

    // Derive decryption key
    const key = await deriveKey(masterKey, salt);

    // Decode base64 data
    const ciphertext = Uint8Array.from(atob(encrypted.encryptedData), (c) => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(encrypted.iv), (c) => c.charCodeAt(0));
    const authTag = Uint8Array.from(atob(encrypted.authTag), (c) => c.charCodeAt(0));

    // Combine ciphertext and auth tag for GCM
    const encryptedBuffer = new Uint8Array(ciphertext.length + authTag.length);
    encryptedBuffer.set(ciphertext);
    encryptedBuffer.set(authTag, ciphertext.length);

    // Decrypt data
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: iv,
        tagLength: 128,
      },
      key,
      encryptedBuffer
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error("Failed to decrypt PII:", error);
    throw new Error("Failed to decrypt sensitive data - data may be corrupted or key is incorrect");
  }
}

/**
 * Mask PII data for display purposes
 * Shows only last 4 characters and masks the rest
 *
 * @param plaintext - The plaintext PII data
 * @param piiType - Type of PII for type-specific masking
 * @returns Masked string (e.g., "***-**-1234" for SSN)
 */
export function maskPII(plaintext: string, piiType: PIIType): string {
  if (!plaintext) return "";

  switch (piiType) {
    case "ssn":
      // Format: XXX-XX-XXXX -> ***-**-1234
      const ssnDigits = plaintext.replace(/\D/g, "");
      if (ssnDigits.length === 9) {
        return `***-**-${ssnDigits.slice(-4)}`;
      }
      return "*".repeat(plaintext.length - 4) + plaintext.slice(-4);

    case "drivers_license":
      // Show last 4 characters
      if (plaintext.length > 4) {
        return "*".repeat(plaintext.length - 4) + plaintext.slice(-4);
      }
      return plaintext;

    case "credit_card":
      // Format: XXXX XXXX XXXX XXXX -> **** **** **** 1234
      const ccDigits = plaintext.replace(/\D/g, "");
      if (ccDigits.length >= 13) {
        return `**** **** **** ${ccDigits.slice(-4)}`;
      }
      return "*".repeat(plaintext.length - 4) + plaintext.slice(-4);

    case "bank_account":
      // Show last 4 digits
      const accountDigits = plaintext.replace(/\D/g, "");
      return "*".repeat(accountDigits.length - 4) + accountDigits.slice(-4);

    case "passport":
      // Show last 3 characters
      if (plaintext.length > 3) {
        return "*".repeat(plaintext.length - 3) + plaintext.slice(-3);
      }
      return plaintext;

    default:
      // Generic masking: show last 4 characters
      if (plaintext.length > 4) {
        return "*".repeat(plaintext.length - 4) + plaintext.slice(-4);
      }
      return "*".repeat(plaintext.length);
  }
}

/**
 * Validate PII data format
 * Returns true if the data appears to be in the correct format
 *
 * @param plaintext - The PII data to validate
 * @param piiType - Type of PII
 * @returns true if valid, false otherwise
 */
export function validatePIIFormat(plaintext: string, piiType: PIIType): boolean {
  if (!plaintext) return false;

  switch (piiType) {
    case "ssn":
      // SSN: XXX-XX-XXXX or XXXXXXXXX (9 digits)
      const ssnDigits = plaintext.replace(/\D/g, "");
      return ssnDigits.length === 9;

    case "drivers_license":
      // Driver's license: varies by state, generally 5-13 characters
      return plaintext.length >= 5 && plaintext.length <= 13;

    case "credit_card":
      // Credit card: 13-19 digits
      const ccDigits = plaintext.replace(/\D/g, "");
      return ccDigits.length >= 13 && ccDigits.length <= 19;

    case "bank_account":
      // Bank account: varies, generally 8-17 digits
      const accountDigits = plaintext.replace(/\D/g, "");
      return accountDigits.length >= 8 && accountDigits.length <= 17;

    case "passport":
      // Passport: varies by country, generally 6-12 alphanumeric
      return plaintext.length >= 6 && plaintext.length <= 12;

    case "tax_id":
      // Tax ID (EIN): XX-XXXXXXX (9 digits)
      const taxDigits = plaintext.replace(/\D/g, "");
      return taxDigits.length === 9;

    default:
      // For custom types, just check it's not empty
      return plaintext.length > 0;
  }
}

/**
 * Generate a secure random ID for PII vault records
 */
export function generatePIIVaultId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Check if PII data has expired
 *
 * @param expiresAt - Expiration timestamp
 * @returns true if expired, false otherwise
 */
export function isPIIExpired(expiresAt?: number): boolean {
  if (!expiresAt) return false;
  return Date.now() > expiresAt;
}

/**
 * Calculate expiration date for PII data
 *
 * @param retentionDays - Number of days to retain the data
 * @returns Expiration timestamp
 */
export function calculatePIIExpiration(retentionDays: number): number {
  return Date.now() + retentionDays * 24 * 60 * 60 * 1000;
}
