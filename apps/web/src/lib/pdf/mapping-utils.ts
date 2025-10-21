import type { PDFField } from "./pdf-extractor";

export interface FieldMapping {
  pdfFieldName: string;
  dataPath: string;
  transform?: "uppercase" | "lowercase" | "titlecase" | "currency" | "date";
  defaultValue?: string;
  required: boolean;
  autoMapped: boolean;
}

/**
 * Auto-generate field mappings based on PDF field names
 */
export function generateFieldMappings(
  pdfFields: PDFField[]
): FieldMapping[] {
  const mappings: FieldMapping[] = [];

  for (const field of pdfFields) {
    const mapping = autoMapField(field.name, field.type);
    if (mapping) {
      mappings.push({
        ...mapping,
        pdfFieldName: field.name,
        required: field.required || false,
        autoMapped: true,
      });
    }
  }

  return mappings;
}

/**
 * Smart field name matching
 */
function autoMapField(
  fieldName: string,
  fieldType: string
): Omit<FieldMapping, "pdfFieldName" | "required" | "autoMapped"> | null {
  const lower = fieldName.toLowerCase();

  // Buyer/Client fields
  if (lower.includes("buyer") || lower.includes("purchaser")) {
    if (lower.includes("name") && !lower.includes("co")) {
      return {
        dataPath: "client.firstName + ' ' + client.lastName",
        transform: "uppercase",
      };
    }
    if (lower.includes("first") && lower.includes("name")) {
      return { dataPath: "client.firstName", transform: "uppercase" };
    }
    if (lower.includes("last") && lower.includes("name")) {
      return { dataPath: "client.lastName", transform: "uppercase" };
    }
    if (lower.includes("address") && !lower.includes("city")) {
      return { dataPath: "client.address", transform: "uppercase" };
    }
    if (lower.includes("city")) {
      return { dataPath: "client.city", transform: "uppercase" };
    }
    if (lower.includes("state")) {
      return { dataPath: "client.state", transform: "uppercase" };
    }
    if (lower.includes("zip")) {
      return { dataPath: "client.zipCode" };
    }
    if (lower.includes("phone")) {
      return { dataPath: "client.phone" };
    }
    if (lower.includes("email")) {
      return { dataPath: "client.email", transform: "lowercase" };
    }
  }

  // Vehicle fields
  if (lower.includes("vehicle") || lower.includes("car") || lower.includes("auto")) {
    if (lower.includes("vin")) {
      return { dataPath: "vehicle.vin", transform: "uppercase" };
    }
    if (lower.includes("year")) {
      return { dataPath: "vehicle.year" };
    }
    if (lower.includes("make")) {
      return { dataPath: "vehicle.make", transform: "uppercase" };
    }
    if (lower.includes("model")) {
      return { dataPath: "vehicle.model", transform: "uppercase" };
    }
    if (lower.includes("color") && lower.includes("exterior")) {
      return { dataPath: "vehicle.exteriorColor", transform: "titlecase" };
    }
    if (lower.includes("color") && lower.includes("interior")) {
      return { dataPath: "vehicle.interiorColor", transform: "titlecase" };
    }
    if (lower.includes("mileage") || lower.includes("odometer")) {
      return { dataPath: "vehicle.mileage" };
    }
    if (lower.includes("stock")) {
      return { dataPath: "vehicle.stock", transform: "uppercase" };
    }
  }

  // VIN (standalone)
  if (lower === "vin" || lower.includes("vin_")) {
    return { dataPath: "vehicle.vin", transform: "uppercase" };
  }

  // Price/Financial fields
  if (lower.includes("price") || lower.includes("amount")) {
    if (lower.includes("sale") || lower.includes("purchase")) {
      return { dataPath: "deal.totalAmount", transform: "currency" };
    }
    if (lower.includes("trade")) {
      return { dataPath: "deal.tradeInValue", transform: "currency" };
    }
    if (lower.includes("down")) {
      return { dataPath: "deal.downPayment", transform: "currency" };
    }
  }

  // Date fields
  if (lower.includes("date")) {
    if (lower.includes("sale") || lower.includes("purchase")) {
      return { dataPath: "deal.saleDate", transform: "date" };
    }
    if (lower.includes("today") || lower === "date") {
      return { dataPath: "deal.createdAt", transform: "date" };
    }
  }

  // Dealer/Dealership fields
  if (lower.includes("dealer") || lower.includes("seller")) {
    if (lower.includes("name")) {
      return { dataPath: "dealership.name", transform: "uppercase" };
    }
    if (lower.includes("address")) {
      return { dataPath: "dealership.address", transform: "uppercase" };
    }
    if (lower.includes("phone")) {
      return { dataPath: "dealership.phone" };
    }
    if (lower.includes("license") || lower.includes("dealer_id")) {
      return { dataPath: "dealership.dealerLicense" };
    }
  }

  // Signature fields - leave blank for manual signing
  if (fieldType === "signature" || lower.includes("signature")) {
    return {
      dataPath: "SIGNATURE_PLACEHOLDER",
      defaultValue: "[Will be signed electronically]",
    };
  }

  return null;
}

/**
 * Get confidence score for a mapping
 */
export function getMappingConfidence(fieldName: string, dataPath: string): number {
  const lower = fieldName.toLowerCase();
  const pathLower = dataPath.toLowerCase();

  // Exact match
  if (lower === pathLower) return 1.0;

  // High confidence
  if (lower.includes("vin") && pathLower.includes("vin")) return 0.95;
  if (lower.includes("buyer") && pathLower.includes("client")) return 0.9;

  // Medium confidence
  if (lower.includes("name") && pathLower.includes("name")) return 0.7;
  if (lower.includes("date") && pathLower.includes("date")) return 0.7;

  // Low confidence
  return 0.5;
}