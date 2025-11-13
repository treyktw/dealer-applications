# Input Validation Library

Comprehensive Zod-based validation schemas for all user inputs across the Dealer Applications platform.

## Purpose

This validation library provides:
- **Security**: Protects against injection attacks, malformed data, and invalid inputs
- **Data Quality**: Ensures data consistency across the application
- **Type Safety**: Full TypeScript support with inferred types
- **Standardization**: Single source of truth for validation rules

## Installation

The validation library is already installed as part of the Convex package.

```typescript
import { emailSchema, vinSchema, phoneSchema } from "./lib/validation";
```

## Quick Start

```typescript
import { validateInput, emailSchema, phoneSchema } from "./lib/validation";

// Validate email
const emailResult = validateInput(emailSchema, "user@example.com");
if (emailResult.success) {
  console.log("Valid email:", emailResult.data);
} else {
  console.error("Validation errors:", emailResult.errors);
}

// Validate phone
const phoneResult = validateInput(phoneSchema, "(555) 123-4567");
if (phoneResult.success) {
  console.log("Normalized phone:", phoneResult.data); // "5551234567"
}
```

## Available Schemas

### Email Validation

```typescript
import { emailSchema, emailOptionalSchema } from "./lib/validation";

// Required email
const email = emailSchema.parse("user@example.com");
// Returns: "user@example.com" (trimmed, lowercase)

// Optional email (can be null, undefined, or empty string)
const optionalEmail = emailOptionalSchema.parse(null); // ✅ Valid
```

**Features:**
- RFC 5322 compliant
- Converts to lowercase
- Trims whitespace
- Validates domain structure
- Prevents consecutive dots
- Max length: 254 characters (RFC 5321)

### Phone Number Validation

```typescript
import { phoneSchema, phoneOptionalSchema } from "./lib/validation";

// Accepts multiple formats
phoneSchema.parse("(123) 456-7890"); // ✅ Valid
phoneSchema.parse("123-456-7890");   // ✅ Valid
phoneSchema.parse("1234567890");     // ✅ Valid
phoneSchema.parse("+1-123-456-7890"); // ✅ Valid

// Returns normalized format (digits only)
const normalized = phoneSchema.parse("(555) 123-4567");
// Returns: "5551234567"
```

### VIN (Vehicle Identification Number) Validation

```typescript
import { vinSchema, vinOptionalSchema } from "./lib/validation";

// Validates 17-character VIN with check digit verification
const vin = vinSchema.parse("1HGBH41JXMN109186");
// Returns: "1HGBH41JXMN109186" (uppercase)

// Features:
// - Exactly 17 characters
// - Alphanumeric (excludes I, O, Q)
// - Validates check digit (9th position)
// - Converts to uppercase
```

### SSN (Social Security Number) Validation

```typescript
import { ssnSchema, ssnOptionalSchema } from "./lib/validation";

// ⚠️ SECURITY WARNING: Always store SSNs encrypted!
const ssn = ssnSchema.parse("123-45-6789");
// Returns: "123-45-6789" (normalized format)

// Also accepts without dashes
const ssn2 = ssnSchema.parse("123456789");
// Returns: "123-45-6789" (auto-formatted)

// Validates against invalid SSN patterns:
// - First 3 digits cannot be 000 or 666
// - First 3 digits cannot start with 9
// - Middle 2 digits cannot be 00
// - Last 4 digits cannot be 0000
```

### Address Validation

```typescript
import {
  zipCodeSchema,
  stateCodeSchema,
  streetAddressSchema,
  citySchema,
  addressSchema,
} from "./lib/validation";

// Individual components
const zip = zipCodeSchema.parse("12345"); // ✅ Valid
const zipPlus4 = zipCodeSchema.parse("12345-6789"); // ✅ Valid
const state = stateCodeSchema.parse("CA"); // ✅ Valid (converts to uppercase)
const street = streetAddressSchema.parse("123 Main St, Apt 4");
const city = citySchema.parse("Los Angeles");

// Complete address
const address = addressSchema.parse({
  street: "123 Main St",
  city: "Los Angeles",
  state: "CA",
  zipCode: "90001",
  country: "US", // Optional, defaults to "US"
});
```

**State Codes:**
- Validates against all 50 US states + DC, PR, VI, GU, AS, MP
- Converts to uppercase automatically
- Must be exactly 2 characters

### Name Validation

```typescript
import {
  nameSchema,
  businessNameSchema,
  nameOptionalSchema,
} from "./lib/validation";

// Person name (first/last name)
const firstName = nameSchema.parse("John");
const lastName = nameSchema.parse("O'Brien"); // ✅ Supports apostrophes
const hyphenated = nameSchema.parse("Mary-Jane"); // ✅ Supports hyphens

// Business name (more permissive)
const businessName = businessNameSchema.parse("Joe's Auto & Truck Sales #1");
// Allows: letters, numbers, spaces, &, comma, period, apostrophe, #, hyphen
```

### URL Validation

```typescript
import { urlSchema, urlOptionalSchema } from "./lib/validation";

const website = urlSchema.parse("https://example.com");
const ftp = urlSchema.parse("ftp://files.example.com"); // ✅ Valid
// Max length: 2048 characters
```

### Password Validation

```typescript
import { passwordSchema, passwordBasicSchema } from "./lib/validation";

// Strong password (recommended)
const strongPassword = passwordSchema.parse("MyP@ssw0rd123");
// Requires:
// - Minimum 8 characters
// - At least 1 uppercase letter
// - At least 1 lowercase letter
// - At least 1 number
// - At least 1 special character

// Basic password (backward compatibility)
const basicPassword = passwordBasicSchema.parse("simplepass");
// Only requires minimum 8 characters
```

### Numeric Validation

```typescript
import { priceSchema, mileageSchema, yearSchema } from "./lib/validation";

// Price (currency)
const price = priceSchema.parse(25999.99);
// Range: 0 to 10,000,000
// Must be finite (no Infinity or NaN)

// Mileage
const mileage = mileageSchema.parse(45000);
// Range: 0 to 1,000,000
// Must be integer

// Year (for vehicles)
const year = yearSchema.parse(2024);
// Range: 1900 to current year + 2
// Must be integer
```

### Date/Time Validation

```typescript
import { dateStringSchema, timestampSchema } from "./lib/validation";

// Date string (ISO 8601 format)
const date = dateStringSchema.parse("2024-01-15");
// Format: YYYY-MM-DD

// Unix timestamp (milliseconds)
const timestamp = timestampSchema.parse(Date.now());
// Range: 0 to 9,999,999,999,999
```

## Helper Functions

### validateInput()

Validates data and returns a typed result with error messages.

```typescript
import { validateInput, emailSchema } from "./lib/validation";

const result = validateInput(emailSchema, "invalid-email");

if (result.success) {
  // TypeScript knows result.data is a string
  console.log("Valid:", result.data);
} else {
  // result.errors is an array of error messages
  console.error("Errors:", result.errors);
  // [".: Invalid email format"]
}
```

### sanitizeString()

Removes potentially harmful characters from strings.

```typescript
import { sanitizeString } from "./lib/validation";

const userInput = "<script>alert('xss')</script>";
const safe = sanitizeString(userInput);
// Returns: "scriptalert('xss')/script"
// Removes: < > { }
// Limits length to 10,000 characters
```

### normalizeEmail()

Normalizes email addresses (lowercase, trim).

```typescript
import { normalizeEmail } from "./lib/validation";

const email = normalizeEmail("  USER@EXAMPLE.COM  ");
// Returns: "user@example.com"
```

### normalizePhone()

Normalizes phone numbers (digits only, keeps +).

```typescript
import { normalizePhone } from "./lib/validation";

const phone = normalizePhone("(555) 123-4567");
// Returns: "5551234567"

const international = normalizePhone("+1 (555) 123-4567");
// Returns: "+15551234567"
```

## Usage in Convex Functions

### Mutation Example

```typescript
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { validateInput, emailSchema, phoneSchema } from "./lib/validation";

export const createClient = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate email
    const emailResult = validateInput(emailSchema, args.email);
    if (!emailResult.success) {
      throw new Error(`Invalid email: ${emailResult.errors.join(", ")}`);
    }

    // Validate phone (if provided)
    if (args.phone) {
      const phoneResult = validateInput(phoneSchema, args.phone);
      if (!phoneResult.success) {
        throw new Error(`Invalid phone: ${phoneResult.errors.join(", ")}`);
      }
    }

    // Insert with validated data
    await ctx.db.insert("clients", {
      firstName: args.firstName,
      lastName: args.lastName,
      email: emailResult.data, // Normalized email
      phone: args.phone ? validateInput(phoneSchema, args.phone).data : undefined,
      createdAt: Date.now(),
    });
  },
});
```

### Query Example

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import { emailSchema } from "./lib/validation";

export const getClientByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate and normalize email before querying
    const validatedEmail = emailSchema.parse(args.email);

    return await ctx.db
      .query("clients")
      .withIndex("by_email", (q) => q.eq("email", validatedEmail))
      .first();
  },
});
```

## Best Practices

### 1. Always Validate User Input

```typescript
// ❌ BAD: Direct insertion without validation
await ctx.db.insert("clients", {
  email: args.email, // Could be invalid!
});

// ✅ GOOD: Validate first
const validatedEmail = emailSchema.parse(args.email);
await ctx.db.insert("clients", {
  email: validatedEmail,
});
```

### 2. Use Appropriate Optional Schemas

```typescript
// ❌ BAD: Required schema for optional field
const phoneResult = phoneSchema.safeParse(undefined); // Fails!

// ✅ GOOD: Optional schema for optional field
const phoneResult = phoneOptionalSchema.safeParse(undefined); // Success!
```

### 3. Handle Validation Errors Gracefully

```typescript
// ❌ BAD: Let Zod throw raw errors
const email = emailSchema.parse(userInput); // Throws ZodError

// ✅ GOOD: Use safeParse or validateInput
const result = validateInput(emailSchema, userInput);
if (!result.success) {
  throw new Error(`Validation failed: ${result.errors.join(", ")}`);
}
```

### 4. Sanitize Free-Text Fields

```typescript
import { sanitizeString } from "./lib/validation";

// ✅ GOOD: Sanitize user notes/descriptions
await ctx.db.insert("clients", {
  firstName: nameSchema.parse(args.firstName),
  notes: sanitizeString(args.notes || ""),
});
```

## Security Considerations

### SSN Storage

**CRITICAL**: Never store SSNs in plain text!

```typescript
// ❌ EXTREMELY BAD: Plain text SSN
await ctx.db.insert("clients", {
  ssn: ssnSchema.parse(args.ssn), // NEVER DO THIS!
});

// ✅ GOOD: Encrypt before storage
import { encryptPII } from "./lib/encryption";

const validatedSSN = ssnSchema.parse(args.ssn);
const encryptedSSN = await encryptPII(validatedSSN);
await ctx.db.insert("clients", {
  ssnEncrypted: encryptedSSN,
});
```

### SQL Injection Prevention

Convex is NoSQL and parameterized by default, but still validate inputs:

```typescript
// ✅ GOOD: Validated inputs prevent injection attempts
const email = emailSchema.parse(args.email); // Validates format
```

### XSS Prevention

```typescript
import { sanitizeString } from "./lib/validation";

// ✅ GOOD: Sanitize before storing user-generated content
const sanitized = sanitizeString(args.description);
```

## Error Messages

All schemas include helpful error messages:

```typescript
emailSchema.parse("invalid"); // "Invalid email format"
phoneSchema.parse("123"); // "Phone number must be at least 10 digits"
vinSchema.parse("ABC123"); // "VIN must be exactly 17 characters"
passwordSchema.parse("weak"); // "Password must be at least 8 characters"
```

## TypeScript Support

All schemas have full TypeScript support with type inference:

```typescript
import { z } from "zod";
import { emailSchema, addressSchema } from "./lib/validation";

// Type inference
type Email = z.infer<typeof emailSchema>; // string
type Address = z.infer<typeof addressSchema>;
// {
//   street: string;
//   city: string;
//   state: string;
//   zipCode: string;
//   country: string;
// }
```

## Contributing

When adding new validation schemas:

1. Add schema to `schemas.ts`
2. Export from `index.ts`
3. Document usage in this README
4. Include error messages
5. Add TypeScript types
6. Write tests

## Related Documentation

- [Zod Documentation](https://zod.dev)
- [Convex Documentation](https://docs.convex.dev)
- [Security Best Practices](../../docs/SECURITY.md)
