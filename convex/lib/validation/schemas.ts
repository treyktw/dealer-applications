/**
 * Comprehensive Input Validation Library
 * Zod schemas for validating all user inputs across the application
 * Protects against injection attacks, invalid data, and improves data quality
 */

import { z } from "zod";

// ============================================================================
// EMAIL VALIDATION
// ============================================================================

/**
 * Email validation schema
 * RFC 5322 compliant with additional security checks
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Email must be at least 3 characters")
  .max(254, "Email must not exceed 254 characters") // RFC 5321
  .email("Invalid email format")
  .refine((email) => {
    // Additional validation: no consecutive dots
    return !/\.\./.test(email);
  }, "Email contains invalid consecutive dots")
  .refine((email) => {
    // Additional validation: valid domain
    const domain = email.split("@")[1];
    return domain && domain.includes(".");
  }, "Email must have a valid domain");

/**
 * Optional email (can be null or empty)
 */
export const emailOptionalSchema = z.union([
  emailSchema,
  z.literal(""),
  z.null(),
  z.undefined(),
]);

// ============================================================================
// PHONE NUMBER VALIDATION
// ============================================================================

/**
 * US Phone number validation
 * Supports: (123) 456-7890, 123-456-7890, 1234567890, +1-123-456-7890
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(10, "Phone number must be at least 10 digits")
  .max(20, "Phone number must not exceed 20 characters")
  .regex(
    /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/,
    "Invalid phone number format"
  )
  .transform((phone) => {
    // Normalize phone number (remove non-digits except +)
    const normalized = phone.replace(/[^0-9+]/g, "");
    return normalized;
  });

/**
 * Optional phone number
 */
export const phoneOptionalSchema = z.union([
  phoneSchema,
  z.literal(""),
  z.null(),
  z.undefined(),
]);

// ============================================================================
// VIN (Vehicle Identification Number) VALIDATION
// ============================================================================

/**
 * VIN validation schema
 * - Must be exactly 17 characters
 * - Alphanumeric (excludes I, O, Q to avoid confusion)
 * - Validates check digit (9th position)
 */
export const vinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(17, "VIN must be exactly 17 characters")
  .regex(/^[A-HJ-NPR-Z0-9]{17}$/, "VIN contains invalid characters (I, O, Q not allowed)")
  .refine((vin) => {
    // VIN check digit validation (position 9)
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    const transliteration: Record<string, number> = {
      A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
      J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
      S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
      0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9,
    };

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const char = vin[i];
      const value = transliteration[char];
      if (value === undefined) return false;
      sum += value * weights[i];
    }

    const checkDigit = vin[8];
    const calculatedCheckDigit = sum % 11;
    const expectedCheckDigit = calculatedCheckDigit === 10 ? "X" : calculatedCheckDigit.toString();

    return checkDigit === expectedCheckDigit;
  }, "Invalid VIN check digit");

/**
 * Optional VIN
 */
export const vinOptionalSchema = z.union([
  vinSchema,
  z.literal(""),
  z.null(),
  z.undefined(),
]);

// ============================================================================
// SSN (Social Security Number) VALIDATION
// ============================================================================

/**
 * SSN validation schema
 * - Format: XXX-XX-XXXX or XXXXXXXXX
 * - Validates against known invalid SSNs
 * - IMPORTANT: Always store encrypted, never in plain text
 */
export const ssnSchema = z
  .string()
  .trim()
  .regex(/^(?:\d{3}-\d{2}-\d{4}|\d{9})$/, "SSN must be in format XXX-XX-XXXX or XXXXXXXXX")
  .refine((ssn) => {
    // Remove hyphens for validation
    const cleaned = ssn.replace(/-/g, "");

    // Invalid SSN patterns
    const invalidPatterns = [
      /^0{3}/, // First 3 digits cannot be 000
      /^666/, // First 3 digits cannot be 666
      /^9\d{2}/, // First 3 digits cannot start with 9
      /^\d{3}0{2}/, // Middle 2 digits cannot be 00
      /^\d{5}0{4}/, // Last 4 digits cannot be 0000
    ];

    return !invalidPatterns.some((pattern) => pattern.test(cleaned));
  }, "Invalid SSN format")
  .transform((ssn) => {
    // Normalize to XXX-XX-XXXX format
    const cleaned = ssn.replace(/-/g, "");
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 5)}-${cleaned.slice(5)}`;
  });

/**
 * Optional SSN
 */
export const ssnOptionalSchema = z.union([
  ssnSchema,
  z.literal(""),
  z.null(),
  z.undefined(),
]);

// ============================================================================
// ADDRESS VALIDATION
// ============================================================================

/**
 * US ZIP code validation
 * Supports: 12345 or 12345-6789
 */
export const zipCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{5}(-\d{4})?$/, "ZIP code must be in format 12345 or 12345-6789");

/**
 * Optional ZIP code
 */
export const zipCodeOptionalSchema = z.union([
  zipCodeSchema,
  z.literal(""),
  z.null(),
  z.undefined(),
]);

/**
 * US State code validation (2-letter state abbreviation)
 */
export const stateCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(2, "State code must be 2 characters")
  .regex(/^[A-Z]{2}$/, "State code must be 2 uppercase letters")
  .refine((state) => {
    // Valid US state codes
    const validStates = [
      "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
      "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
      "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
      "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
      "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
      "DC", "PR", "VI", "GU", "AS", "MP",
    ];
    return validStates.includes(state);
  }, "Invalid state code");

/**
 * Optional state code
 */
export const stateCodeOptionalSchema = z.union([
  stateCodeSchema,
  z.literal(""),
  z.null(),
  z.undefined(),
]);

/**
 * Street address validation
 */
export const streetAddressSchema = z
  .string()
  .trim()
  .min(3, "Address must be at least 3 characters")
  .max(200, "Address must not exceed 200 characters")
  .regex(/^[a-zA-Z0-9\s,.'#-]+$/, "Address contains invalid characters");

/**
 * Optional street address
 */
export const streetAddressOptionalSchema = z.union([
  streetAddressSchema,
  z.literal(""),
  z.null(),
  z.undefined(),
]);

/**
 * City validation
 */
export const citySchema = z
  .string()
  .trim()
  .min(2, "City must be at least 2 characters")
  .max(100, "City must not exceed 100 characters")
  .regex(/^[a-zA-Z\s-'.]+$/, "City contains invalid characters");

/**
 * Optional city
 */
export const cityOptionalSchema = z.union([
  citySchema,
  z.literal(""),
  z.null(),
  z.undefined(),
]);

/**
 * Complete address schema
 */
export const addressSchema = z.object({
  street: streetAddressSchema,
  city: citySchema,
  state: stateCodeSchema,
  zipCode: zipCodeSchema,
  country: z.string().default("US"),
});

/**
 * Optional complete address
 */
export const addressOptionalSchema = z.object({
  street: streetAddressOptionalSchema,
  city: cityOptionalSchema,
  state: stateCodeOptionalSchema,
  zipCode: zipCodeOptionalSchema,
  country: z.string().optional(),
});

// ============================================================================
// NAME VALIDATION
// ============================================================================

/**
 * Person name validation (first/last name)
 */
export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name must not exceed 100 characters")
  .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes");

/**
 * Optional name
 */
export const nameOptionalSchema = z.union([
  nameSchema,
  z.literal(""),
  z.null(),
  z.undefined(),
]);

/**
 * Business name validation
 */
export const businessNameSchema = z
  .string()
  .trim()
  .min(1, "Business name is required")
  .max(200, "Business name must not exceed 200 characters")
  .regex(
    /^[a-zA-Z0-9\s&,.'#-]+$/,
    "Business name contains invalid characters"
  );

/**
 * Optional business name
 */
export const businessNameOptionalSchema = z.union([
  businessNameSchema,
  z.literal(""),
  z.null(),
  z.undefined(),
]);

// ============================================================================
// URL VALIDATION
// ============================================================================

/**
 * URL validation
 */
export const urlSchema = z
  .string()
  .trim()
  .url("Invalid URL format")
  .max(2048, "URL must not exceed 2048 characters");

/**
 * Optional URL
 */
export const urlOptionalSchema = z.union([
  urlSchema,
  z.literal(""),
  z.null(),
  z.undefined(),
]);

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

/**
 * Strong password validation
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

/**
 * Basic password validation (for backward compatibility)
 */
export const passwordBasicSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters");

// ============================================================================
// NUMERIC VALIDATION
// ============================================================================

/**
 * Price/Currency validation
 */
export const priceSchema = z
  .number()
  .min(0, "Price cannot be negative")
  .max(10000000, "Price exceeds maximum allowed value")
  .finite("Price must be a finite number");

/**
 * Mileage validation
 */
export const mileageSchema = z
  .number()
  .min(0, "Mileage cannot be negative")
  .max(1000000, "Mileage exceeds maximum allowed value")
  .int("Mileage must be a whole number");

/**
 * Year validation (for vehicles)
 */
export const yearSchema = z
  .number()
  .int("Year must be a whole number")
  .min(1900, "Year must be 1900 or later")
  .max(new Date().getFullYear() + 2, `Year cannot exceed ${new Date().getFullYear() + 2}`);

// ============================================================================
// DATE VALIDATION
// ============================================================================

/**
 * Date string validation (ISO 8601 format)
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, "Invalid date");

/**
 * Timestamp validation (Unix timestamp in milliseconds)
 */
export const timestampSchema = z
  .number()
  .int("Timestamp must be a whole number")
  .min(0, "Timestamp cannot be negative")
  .max(9999999999999, "Timestamp exceeds maximum allowed value");

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validate data against a schema and return typed result
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errors: result.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`),
  };
}

/**
 * Sanitize string input (remove potentially harmful characters)
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, "") // Remove < and > to prevent HTML injection
    .replace(/[{}]/g, "") // Remove { and } to prevent template injection
    .slice(0, 10000); // Limit length to prevent DoS
}

/**
 * Normalize email (lowercase, trim)
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalize phone number (remove non-digits except +)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, "");
}
