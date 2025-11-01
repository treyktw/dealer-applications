// convex/lib/data-transformer.ts
/**
 * Apply transforms to field values before filling PDFs
 * Supports: uppercase, lowercase, titlecase, currency, date
 */

export type Transform =
  | "uppercase"
  | "lowercase"
  | "titlecase"
  | "currency"
  | "date";

/**
 * Apply a transform to a value
 */
export function applyTransform(
  value: string | number | Date | null | undefined,
  transform?: Transform
): string {
  // Handle null/undefined
  if (value === null || value === undefined || value === "") {
    return "";
  }

  // Convert to string first
  const stringValue = String(value);

  if (!transform) {
    return stringValue;
  }

  switch (transform) {
    case "uppercase":
      return stringValue.toUpperCase();

    case "lowercase":
      return stringValue.toLowerCase();

    case "titlecase":
      return toTitleCase(stringValue);

    case "currency":
      return formatCurrency(value);

    case "date":
      return formatDate(value);

    default:
      return stringValue;
  }
}

/**
 * Convert string to Title Case
 * "hello world" -> "Hello World"
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (word.length === 0) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Format number as currency
 * 1234.56 -> "$1,234.56"
 */
function formatCurrency(value: string | number | Date | null | undefined): string {
  const num = typeof value === "number" ? value : parseFloat(String(value));

  if (Number.isNaN(num)) {
    return "$0.00";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format date as MM/DD/YYYY
 * Accepts: Date object, timestamp (number), or ISO string
 */
function formatDate(value: string | number | Date | null | undefined): string {
  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === "number") {
    date = new Date(value);
  } else if (typeof value === "string") {
    date = new Date(value);
  } else {
    return "";
  }

  // Validate date
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${day}/${year}`;
}

/**
 * Validate and transform based on field requirements
 */
export function validateAndTransform(
  value: string | number | Date | null | undefined,
  transform?: Transform,
  required: boolean = false
): { valid: boolean; value: string; error?: string } {
  // Check required
  if (required && (value === null || value === undefined || value === "")) {
    return {
      valid: false,
      value: "",
      error: "Required field is missing",
    };
  }

  // Allow empty for non-required
  if (value === null || value === undefined || value === "") {
    return { valid: true, value: "" };
  }

  // Apply transform
  try {
    const transformedValue = applyTransform(value, transform);
    return { valid: true, value: transformedValue };
  } catch (error) {
    return {
      valid: false,
      value: "",
      error: `Transform failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}