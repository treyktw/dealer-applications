// convex/lib/expression-evaluator.ts
/**
 * Safe expression evaluator for field mappings
 * Supports simple concatenation and property access
 * Example: "client.firstName + ' ' + client.lastName"
 */

interface EvaluationContext {
  client?: Record<string, string | number | Date | null | undefined>;
  cobuyer?: Record<string, string | number | Date | null | undefined>;
  vehicle?: Record<string, string | number | Date | null | undefined>;
  deal?: Record<string, string | number | Date | null | undefined>;
  dealership?: Record<string, string | number | Date | null | undefined>;
  insurance?: Record<string, string | number | Date | null | undefined>;
  lienHolder?: Record<string, string | number | Date | null | undefined>;
  [key: string]: string | number | Date | null | undefined | Record<string, string | number | Date | null | undefined>;
}

/**
 * Get nested property value using dot notation
 * Example: "client.firstName" -> context.client.firstName
 */
function getNestedValue(
  obj: EvaluationContext | Record<string, string | number | Date | null | undefined>,
  path: string
): string | number | Date | null | undefined {
  const parts = path.split(".");
  let current: EvaluationContext | Record<string, string | number | Date | null | undefined> | string | number | Date | null | undefined = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return null;
    }
    
    if (typeof current === 'object' && current !== null && !(current instanceof Date)) {
      current = (current as Record<string, string | number | Date | null | undefined>)[part];
    } else {
      return null;
    }
  }

  return current as string | number | Date | null | undefined;
}

/**
 * Safely evaluate a data path expression
 * Supports:
 * - Simple paths: "client.firstName"
 * - Concatenation: "client.firstName + ' ' + client.lastName"
 * - String literals in single or double quotes
 */
export function evaluateDataPath(
  expression: string,
  context: EvaluationContext
): string | number | null {
  if (!expression) {
    return null;
  }

  // Check if expression contains concatenation operator
  if (expression.includes("+")) {
    return evaluateConcatenation(expression, context);
  }

  // Simple property access
  const result = getNestedValue(context, expression.trim());
  if (result === undefined) {
    return null;
  }
  
  // Convert Date objects to strings
  if (result instanceof Date) {
    return result.toISOString();
  }
  
  return result;
}

/**
 * Evaluate concatenation expressions
 * Example: "client.firstName + ' ' + client.lastName"
 */
function evaluateConcatenation(
  expression: string,
  context: EvaluationContext
): string {
  // Split by + operator but preserve quoted strings
  const parts = splitExpression(expression);

  const values = parts.map((part) => {
    const trimmed = part.trim();

    // Check if it's a string literal (quoted)
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      // Remove quotes
      return trimmed.slice(1, -1);
    }

    // Otherwise, treat as property path
    const value = getNestedValue(context, trimmed);
    if (value === null || value === undefined) {
      return "";
    }
    
    // Convert Date objects to strings
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    return String(value);
  });

  return values.join("");
}

/**
 * Split expression by + operator while preserving quoted strings
 */
function splitExpression(expression: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";

  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];

    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      current += char;
    } else if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = "";
      current += char;
    } else if (char === "+" && !inQuotes) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

/**
 * Check if an expression is a special placeholder
 * These should be skipped during initial generation
 */
export function isSpecialPlaceholder(dataPath: string): boolean {
  const specialPrefixes = ["SIGNATURE_", "INITIALS_", "DATE_SIGNED_"];
  return specialPrefixes.some((prefix) =>
    dataPath.toUpperCase().startsWith(prefix)
  );
}

/**
 * Get signature field type from placeholder
 * SIGNATURE_BUYER -> "buyer"
 * SIGNATURE_SELLER -> "seller"
 */
export function getSignatureRole(dataPath: string): string | null {
  if (!dataPath.toUpperCase().startsWith("SIGNATURE_")) {
    return null;
  }

  const role = dataPath.replace(/^SIGNATURE_/i, "").toLowerCase();
  return role;
}