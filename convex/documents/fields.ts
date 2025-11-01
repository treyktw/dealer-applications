// convex/documents/fields.ts - Field Extraction & Mapping
import { v } from "convex/values";
import { mutation, internalAction } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { requireAuth, assertDealershipAccess } from "../guards";
import { PDFDocument, PDFButton, PDFCheckBox, PDFDropdown, PDFRadioGroup, PDFTextField } from "pdf-lib";
import type { PDFField } from "pdf-lib";

// Strongly-typed field models used during extraction and normalization
type AllowedFieldType = "text" | "number" | "date" | "checkbox" | "signature";
type ExtractedFieldType = AllowedFieldType | "dropdown" | "radio";

export interface ExtractedField {
  name: string;
  type: ExtractedFieldType;
  label: string;
  required: boolean;
  defaultValue?: string;
  pdfFieldName: string;
  options?: string[]; // for dropdown/radio
}

export interface CategorizedField extends ExtractedField {
  category: string;
}

export interface NormalizedField {
  name: string;
  type: AllowedFieldType;
  label: string;
  required: boolean;
  defaultValue?: string;
  pdfFieldName: string;
}

/**
 * Extract fields from uploaded PDF template
 * This is called automatically after template upload completes
 */
export const extractFieldsFromTemplate = internalAction({
  args: {
    templateId: v.id("documentTemplates"),
  },
  handler: async (ctx, args) => {
    // Get template (using internal version since this is an internal action)
    const template = await ctx.runMutation(
      internal.documents.templates.getTemplateByIdInternal,
      { templateId: args.templateId }
    );

    if (!template) {
      throw new Error("Template not found");
    }

    // Get download URL for the PDF
    const { downloadUrl } = await ctx.runAction(
      internal.secure_s3.generateDownloadUrl,
      {
        s3Key: template.s3Key,
        expiresIn: 300,
      }
    );

    try {
      // Fetch PDF from S3
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Failed to download PDF from S3");
      }

      const pdfBuffer = await response.arrayBuffer();

      // Extract fields using pdf-lib (with categories)
      const fields = await extractPDFFormFieldsWithCategories(pdfBuffer);

      // Validate extracted fields structure
      if (!validateExtractedFields(fields)) {
        throw new Error("Extracted fields failed validation");
      }

      // Normalize to allowed schema (map dropdown/radio -> text and strip extras)
      const normalizedFields = fields.map((f) => ({
        name: f.name,
        type: (f.type === "dropdown" || f.type === "radio") ? "text" : f.type,
        label: f.label,
        required: f.required,
        defaultValue: f.defaultValue,
        pdfFieldName: f.pdfFieldName,
        page: 1, // Default to page 1 for now
      }));

      // Save extracted fields to template
      await ctx.runMutation(api.documents.fields.saveExtractedFields, {
        templateId: args.templateId,
        fields: normalizedFields,
      });

      console.log(
        `Extracted ${fields.length} fields from template ${template.name}`
      );
    } catch (error) {
      console.error("Error extracting PDF fields:", error);

      // Log error
      await ctx.runMutation(api.documents.fields.logFieldExtractionError, {
        templateId: args.templateId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },
});

/**
 * Helper function to extract form fields from PDF buffer
 * Uses pdf-lib library
 */
async function extractPDFFormFields(pdfBuffer: ArrayBuffer): Promise<ExtractedField[]> {
  const fields: ExtractedField[] = [];

  try {
    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    
    // Get all form fields
    const formFields = form.getFields();

    console.log(`Found ${formFields.length} form fields in PDF`);

    for (const field of formFields) {
      try {
        const fieldName = field.getName();
        const fieldInfo = extractFieldInfo(field);

        // Skip fields with invalid names
        if (!fieldName || fieldName.trim() === '') {
          console.warn('Skipping field with empty name');
          continue;
        }

        const extracted: ExtractedField = {
          name: sanitizeFieldName(fieldName),
          type: fieldInfo.type,
          label: generateFieldLabel(fieldName),
          required: false, // PDF forms don't always indicate required fields
          defaultValue: fieldInfo.defaultValue,
          pdfFieldName: fieldName, // Keep original name for filling
          options: fieldInfo.options,
        };
        fields.push(extracted);

        console.log(`Extracted field: ${fieldName} (${fieldInfo.type})`);
      } catch (fieldError) {
        console.error(`Error processing field: ${fieldError}`);
        // Continue with next field
      }
    }

    return fields;
  } catch (error) {
    console.error('Error extracting PDF fields:', error);
    throw new Error(`Failed to extract PDF fields: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract field type and metadata from PDF field
 */
function extractFieldInfo(
  field: PDFField
): {
  type: ExtractedFieldType;
  defaultValue?: string;
  options?: string[];
} {
  const fieldType = (field as PDFField).constructor?.name as string;

  // Text field
  if (field instanceof PDFTextField) {
    const textField = field as PDFTextField;
    const defaultValue = textField.getText() || undefined;
    const fieldName = field.getName().toLowerCase();

    // Try to infer specific text field types based on name
    if (fieldName.includes('date') || fieldName.includes('dob') || fieldName.includes('birth')) {
      return { type: 'date', defaultValue };
    }
    
    if (
      fieldName.includes('price') ||
      fieldName.includes('amount') ||
      fieldName.includes('odometer') ||
      fieldName.includes('mileage') ||
      fieldName.includes('year') ||
      fieldName.includes('zip')
    ) {
      return { type: 'number', defaultValue };
    }

    if (fieldName.includes('signature') || fieldName.includes('sign')) {
      return { type: 'signature', defaultValue };
    }

    return { type: 'text', defaultValue };
  }

  // Checkbox
  if (field instanceof PDFCheckBox) {
    const checkboxField = field as PDFCheckBox;
    const isChecked = checkboxField.isChecked();
    return { 
      type: 'checkbox', 
      defaultValue: isChecked ? 'true' : 'false' 
    };
  }

  // Dropdown
  if (field instanceof PDFDropdown) {
    const dropdown = field as PDFDropdown;
    const options = dropdown.getOptions();
    const selected = dropdown.getSelected();
    
    return { 
      type: 'dropdown',
      defaultValue: selected?.[0],
      options: options || []
    };
  }

  // Radio group
  if (field instanceof PDFRadioGroup) {
    const radioGroup = field as PDFRadioGroup;
    const options = radioGroup.getOptions();
    const selected = radioGroup.getSelected();
    
    return { 
      type: 'radio',
      defaultValue: selected,
      options: options || []
    };
  }

  // Button (usually signature fields or submit buttons)
  if (field instanceof PDFButton) {
    const fieldName = field.getName().toLowerCase();
    if (fieldName.includes('signature') || fieldName.includes('sign')) {
      return { type: 'signature' };
    }
    // Skip other buttons
    return { type: 'text' };
  }

  // Default to text for unknown types
  console.warn(`Unknown field type: ${fieldType}, defaulting to text`);
  return { type: 'text' };
}

/**
 * Sanitize field name for internal use
 * Removes special characters, converts to snake_case
 */
function sanitizeFieldName(fieldName: string): string {
  return fieldName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_') // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Generate human-readable label from field name
 */
function generateFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/[-_]/g, ' ') // Replace hyphens and underscores with spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
    .replace(/\b\w/g, (char) => char.toUpperCase()) // Capitalize first letter of each word
    .trim();
}

/**
 * Advanced field type detection based on name patterns
 * This helps categorize fields for better UX
 */
function detectFieldCategory(fieldName: string): string {
  const name = fieldName.toLowerCase();

  // Vehicle fields
  if (name.match(/vin|vehicle|make|model|year|mileage|odometer|stock/)) {
    return 'vehicle';
  }

  // Buyer fields
  if (name.match(/buyer|purchaser|customer|client|first.*name|last.*name/)) {
    return 'buyer';
  }

  // Seller/Dealer fields
  if (name.match(/seller|dealer|salesperson|sales|manager/)) {
    return 'seller';
  }

  // Financial fields
  if (name.match(/price|amount|payment|down|finance|tax|fee|total/)) {
    return 'financial';
  }

  // Date fields
  if (name.match(/date|dob|birth|expir/)) {
    return 'date';
  }

  // Address fields
  if (name.match(/address|street|city|state|zip|county/)) {
    return 'address';
  }

  // Contact fields
  if (name.match(/phone|email|contact/)) {
    return 'contact';
  }

  // Legal fields
  if (name.match(/signature|sign|notary|witness|acknowledgement/)) {
    return 'legal';
  }

  return 'other';
}

/**
 * Enhanced version with field categorization
 * Use this if you want to group fields in the UI
 */
async function extractPDFFormFieldsWithCategories(pdfBuffer: ArrayBuffer): Promise<CategorizedField[]> {
  const fields = await extractPDFFormFields(pdfBuffer);

  // Add category to each field
  return fields.map<CategorizedField>(field => ({
    ...field,
    category: detectFieldCategory(field.name),
  }));
}

/**
 * Validate extracted fields
 * Ensures field structure is correct before saving
 */
function validateExtractedFields(fields: ExtractedField[]): boolean {
  if (!Array.isArray(fields)) {
    console.error('Fields must be an array');
    return false;
  }

  for (const field of fields) {
    if (!field.name || typeof field.name !== 'string') {
      console.error('Field missing valid name:', field);
      return false;
    }

    if (!field.pdfFieldName || typeof field.pdfFieldName !== 'string') {
      console.error('Field missing valid pdfFieldName:', field);
      return false;
    }

    const validTypes: ExtractedFieldType[] = ['text', 'number', 'date', 'checkbox', 'signature', 'dropdown', 'radio'];
    if (!validTypes.includes(field.type)) {
      console.error('Field has invalid type:', field);
      return false;
    }
  }

  return true;
}

/**
 * Save extracted fields to template (internal)
 */
export const saveExtractedFields = mutation({
  args: {
    templateId: v.id("documentTemplates"),
    fields: v.array(
      v.object({
        name: v.string(),
        type: v.union(
          v.literal("text"),
          v.literal("number"),
          v.literal("date"),
          v.literal("checkbox"),
          v.literal("signature")
        ),
        label: v.string(),
        required: v.boolean(),
        defaultValue: v.optional(v.string()),
        pdfFieldName: v.string(),
        page: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await ctx.db.patch(args.templateId, {
      pdfFields: args.fields,
      updatedAt: Date.now(),
    });

    // Log extraction complete
    await ctx.db.insert("security_logs", {
      dealershipId: template.dealershipId,
      action: "template_fields_extracted",
      userId: "system",
      ipAddress: "server",
      success: true,
      details: `Extracted ${args.fields.length} fields from template`,
      timestamp: Date.now(),
    });

    return { success: true, fieldCount: args.fields.length };
  },
});

/**
 * Log field extraction error (internal)
 */
export const logFieldExtractionError = mutation({
  args: {
    templateId: v.id("documentTemplates"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      return;
    }

    await ctx.db.insert("security_logs", {
      dealershipId: template.dealershipId,
      action: "template_field_extraction_failed",
      userId: "system",
      ipAddress: "server",
      success: false,
      details: `Field extraction failed: ${args.error}`,
      timestamp: Date.now(),
      severity: "high",
    });
  },
});

/**
 * Manually add/update field mapping
 * Used when automatic extraction fails or needs manual adjustment
 */
export const updateFieldMapping = mutation({
  args: {
    templateId: v.id("documentTemplates"),
    fields: v.array(
      v.object({
        pdfFieldName: v.string(),
        dataPath: v.string(),
        transform: v.optional(v.union(
          v.literal("date"),
          v.literal("uppercase"),
          v.literal("lowercase"),
          v.literal("titlecase"),
          v.literal("currency")
        )),
        defaultValue: v.optional(v.string()),
        required: v.boolean(),
        autoMapped: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await assertDealershipAccess(ctx, template.dealershipId);

    // Update field mappings
    await ctx.db.patch(args.templateId, {
      fieldMappings: args.fields,
      updatedAt: Date.now(),
    });

    // Log update
    await ctx.db.insert("security_logs", {
      dealershipId: template.dealershipId,
      action: "template_fields_updated",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Updated field mappings: ${args.fields.length} fields`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get field mapping for a template
 */
export const getFieldMapping = mutation({
  args: {
    templateId: v.id("documentTemplates"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await assertDealershipAccess(ctx, template.dealershipId);

    return {
      fields: template.fieldMappings,
      templateName: template.name,
      category: template.category,
    };
  },
});

/**
 * Validate field data against template schema
 * Used before generating documents
 */
export const validateFieldData = mutation({
  args: {
    templateId: v.id("documentTemplates"),
    data: v.any(), // The data to validate
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await assertDealershipAccess(ctx, template.dealershipId);

    const errors: Array<{ field: string; message: string }> = [];

    // Check all required fields (from fieldMappings)
    for (const field of template.fieldMappings) {
      if (field.required) {
        const value = args.data[field.pdfFieldName];
        
        if (value === undefined || value === null || value === "") {
          errors.push({
            field: field.pdfFieldName,
            message: `${field.pdfFieldName} is required`,
          });
        }
      }
    }

    // Type validation (from fieldMappings)
    for (const field of template.fieldMappings) {
      const value = args.data[field.pdfFieldName];
      
      if (value !== undefined && value !== null && value !== "") {
        // Get the field type from pdfFields
        const pdfField = template.pdfFields.find(f => f.name === field.pdfFieldName);
        if (pdfField) {
          switch (pdfField.type) {
            case "number":
              if (Number.isNaN(Number(value))) {
                errors.push({
                  field: field.pdfFieldName,
                  message: `${field.pdfFieldName} must be a number`,
                });
              }
              break;

            case "date":
              if (Number.isNaN(Date.parse(value))) {
                errors.push({
                  field: field.pdfFieldName,
                  message: `${field.pdfFieldName} must be a valid date`,
                });
              }
              break;

            case "checkbox":
              if (typeof value !== "boolean") {
                errors.push({
                  field: field.pdfFieldName,
                  message: `${field.pdfFieldName} must be true or false`,
                });
              }
              break;
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
});

/**
 * Get suggested field mappings based on common patterns
 * Helps users quickly map common fields
 */
export const getSuggestedMappings = mutation({
  args: {
    templateId: v.id("documentTemplates"),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    await assertDealershipAccess(ctx, template.dealershipId);

    // Common field name patterns and their mappings
    const patterns: Record<string, { label: string; type: string }> = {
      vin: { label: "VIN", type: "text" },
      vehicle_vin: { label: "Vehicle VIN", type: "text" },
      make: { label: "Make", type: "text" },
      model: { label: "Model", type: "text" },
      year: { label: "Year", type: "number" },
      buyer_name: { label: "Buyer Name", type: "text" },
      buyer_first_name: { label: "Buyer First Name", type: "text" },
      buyer_last_name: { label: "Buyer Last Name", type: "text" },
      buyer_address: { label: "Buyer Address", type: "text" },
      buyer_city: { label: "Buyer City", type: "text" },
      buyer_state: { label: "Buyer State", type: "text" },
      buyer_zip: { label: "Buyer ZIP Code", type: "text" },
      sale_price: { label: "Sale Price", type: "number" },
      sale_date: { label: "Sale Date", type: "date" },
      odometer: { label: "Odometer Reading", type: "number" },
      dealer_name: { label: "Dealer Name", type: "text" },
      dealer_address: { label: "Dealer Address", type: "text" },
    };

    const suggestions = template.pdfFields.map((field) => {
      const normalizedName = field.name.toLowerCase().replace(/[-_\s]/g, "_");
      const pattern = patterns[normalizedName];

      return {
        pdfFieldName: field.name,
        suggestedLabel: pattern?.label || field.name,
        suggestedType: pattern?.type || "text",
        confidence: pattern ? "high" : "low",
      };
    });

    return suggestions;
  },
});