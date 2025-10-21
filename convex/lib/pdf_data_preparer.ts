// convex/lib/pdf-data-preparer.ts
/**
 * Prepare data for PDF filling by applying field mappings and transforms
 */

import { evaluateDataPath, isSpecialPlaceholder } from "./expression_evaluator";
import { applyTransform, type Transform } from "./data_transformer";

export interface FieldMapping {
  pdfFieldName: string;
  dataPath: string;
  transform?: Transform;
  defaultValue?: string;
  required: boolean;
  autoMapped: boolean;
}

export interface DealData {
  client: Record<string, string | number | Date | null | undefined>;
  cobuyer?: Record<string, string | number | Date | null | undefined>;
  vehicle: Record<string, string | number | Date | null | undefined>;
  deal: Record<string, string | number | Date | null | undefined>;
  dealership: Record<string, string | number | Date | null | undefined>;
  insurance?: Record<string, string | number | Date | null | undefined>;
  lienHolder?: Record<string, string | number | Date | null | undefined>;
}

export interface PreparedFieldData {
  pdfFieldName: string;
  value: string;
  originalValue: string | number | Date | null | undefined;
  transform?: Transform;
  skipped: boolean;
  skipReason?: string;
}

export interface ValidationError {
  pdfFieldName: string;
  dataPath: string;
  error: string;
}

export interface PreparedPdfData {
  fields: PreparedFieldData[];
  validationErrors: ValidationError[];
  missingRequiredFields: string[];
  signatureFields: string[]; // Fields to fill during signature embedding
}

/**
 * Prepare PDF data from deal data and field mappings
 */
export function preparePdfData(
  fieldMappings: FieldMapping[],
  dealData: DealData
): PreparedPdfData {
  const fields: PreparedFieldData[] = [];
  const validationErrors: ValidationError[] = [];
  const missingRequiredFields: string[] = [];
  const signatureFields: string[] = [];

  // Create evaluation context
  const context = {
    client: dealData.client || {},
    cobuyer: dealData.cobuyer || undefined,
    vehicle: dealData.vehicle || {},
    deal: dealData.deal || {},
    dealership: dealData.dealership || {},
    insurance: dealData.insurance || undefined,
    lienHolder: dealData.lienHolder || undefined,
  };

  for (const mapping of fieldMappings) {
    try {
      // Skip special placeholders (signatures, initials)
      if (isSpecialPlaceholder(mapping.dataPath)) {
        signatureFields.push(mapping.pdfFieldName);
        fields.push({
          pdfFieldName: mapping.pdfFieldName,
          value: "",
          originalValue: null,
          skipped: true,
          skipReason: "Signature/Initial field - will be filled during signing",
        });
        continue;
      }

      // Evaluate the data path expression
      const rawValue = evaluateDataPath(mapping.dataPath, context);

      // Check if required field is missing
      // Special handling for co-buyer fields: if no cobuyer data exists, treat as optional
      const isCobuyerField = mapping.dataPath.includes("cobuyer.") || mapping.pdfFieldName.includes("2");
      const hasCobuyerData = dealData.cobuyer && Object.keys(dealData.cobuyer).length > 0;
      
      if (mapping.required && (rawValue === null || rawValue === undefined || rawValue === "")) {
        // If it's a co-buyer field and no co-buyer data exists, treat as optional
        if (isCobuyerField && !hasCobuyerData) {
          console.log(`Co-buyer field ${mapping.pdfFieldName} marked as optional (no co-buyer data)`);
          // Use default value if available, otherwise empty string
          const finalValue = mapping.defaultValue || "";
          const transformedValue = applyTransform(finalValue, mapping.transform);
          
          fields.push({
            pdfFieldName: mapping.pdfFieldName,
            value: transformedValue,
            originalValue: finalValue,
            transform: mapping.transform,
            skipped: false,
          });
          continue;
        }
        
        missingRequiredFields.push(mapping.pdfFieldName);
        validationErrors.push({
          pdfFieldName: mapping.pdfFieldName,
          dataPath: mapping.dataPath,
          error: `Required field is missing: ${mapping.dataPath}`,
        });

        // Use default value if available
        if (mapping.defaultValue) {
          const transformedDefault = applyTransform(
            mapping.defaultValue,
            mapping.transform
          );
          fields.push({
            pdfFieldName: mapping.pdfFieldName,
            value: transformedDefault,
            originalValue: mapping.defaultValue,
            transform: mapping.transform,
            skipped: false,
          });
        } else {
          fields.push({
            pdfFieldName: mapping.pdfFieldName,
            value: "",
            originalValue: null,
            skipped: true,
            skipReason: "Required field missing and no default value",
          });
        }
        continue;
      }

      // Handle optional missing fields
      if (rawValue === null || rawValue === undefined || rawValue === "") {
        // Use default value if available
        const finalValue = mapping.defaultValue || "";
        const transformedValue = applyTransform(finalValue, mapping.transform);

        fields.push({
          pdfFieldName: mapping.pdfFieldName,
          value: transformedValue,
          originalValue: finalValue,
          transform: mapping.transform,
          skipped: false,
        });
        continue;
      }

      // Apply transform
      const transformedValue = applyTransform(rawValue, mapping.transform);

      fields.push({
        pdfFieldName: mapping.pdfFieldName,
        value: transformedValue,
        originalValue: rawValue,
        transform: mapping.transform,
        skipped: false,
      });
    } catch (error) {
      // Log error and skip field
      validationErrors.push({
        pdfFieldName: mapping.pdfFieldName,
        dataPath: mapping.dataPath,
        error: `Failed to process field: ${error}`,
      });

      fields.push({
        pdfFieldName: mapping.pdfFieldName,
        value: mapping.defaultValue || "",
        originalValue: null,
        skipped: true,
        skipReason: `Processing error: ${error}`,
      });
    }
  }

  return {
    fields,
    validationErrors,
    missingRequiredFields,
    signatureFields,
  };
}

/**
 * Get required signatures from field mappings
 * Analyzes SIGNATURE_* placeholders to determine who needs to sign
 */
export function getRequiredSignatures(fieldMappings: FieldMapping[]): string[] {
  const signatures = new Set<string>();

  for (const mapping of fieldMappings) {
    const upperDataPath = mapping.dataPath.toUpperCase();

    if (upperDataPath.startsWith("SIGNATURE_")) {
      const role = upperDataPath.replace("SIGNATURE_", "").toLowerCase();
      signatures.add(role);
    }
  }

  return Array.from(signatures);
}

/**
 * Validate that all required data is available before generation
 */
export function validateDealData(
  dealData: DealData,
  fieldMappings: FieldMapping[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check client data
  if (!dealData.client) {
    errors.push("Client data is required");
  }

  // Check vehicle data
  if (!dealData.vehicle) {
    errors.push("Vehicle data is required");
  }

  // Check deal data
  if (!dealData.deal) {
    errors.push("Deal data is required");
  }

  // Check dealership data
  if (!dealData.dealership) {
    errors.push("Dealership data is required");
  }

  // Prepare data to check for missing required fields
  const prepared = preparePdfData(fieldMappings, dealData);

  if (prepared.missingRequiredFields.length > 0) {
    errors.push(
      `Missing required fields: ${prepared.missingRequiredFields.join(", ")}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}