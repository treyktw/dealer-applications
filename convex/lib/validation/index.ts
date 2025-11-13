/**
 * Validation Library Entry Point
 * Export all validation schemas and utilities
 */

// Export all schemas
export {
  // Email
  emailSchema,
  emailOptionalSchema,

  // Phone
  phoneSchema,
  phoneOptionalSchema,

  // VIN
  vinSchema,
  vinOptionalSchema,

  // SSN
  ssnSchema,
  ssnOptionalSchema,

  // Address
  zipCodeSchema,
  zipCodeOptionalSchema,
  stateCodeSchema,
  stateCodeOptionalSchema,
  streetAddressSchema,
  streetAddressOptionalSchema,
  citySchema,
  cityOptionalSchema,
  addressSchema,
  addressOptionalSchema,

  // Names
  nameSchema,
  nameOptionalSchema,
  businessNameSchema,
  businessNameOptionalSchema,

  // URL
  urlSchema,
  urlOptionalSchema,

  // Password
  passwordSchema,
  passwordBasicSchema,

  // Numeric
  priceSchema,
  mileageSchema,
  yearSchema,

  // Date/Time
  dateStringSchema,
  timestampSchema,

  // Helper functions
  validateInput,
  sanitizeString,
  normalizeEmail,
  normalizePhone,
} from "./schemas";
