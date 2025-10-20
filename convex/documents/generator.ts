// convex/documents/generator.ts - PDF Generation & Filling
import { v } from "convex/values";
import { mutation, query, action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { requireAuth, requireDealership, assertDealershipAccess } from "../guards";
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from 'pdf-lib';

// Strong types used across this module
type TemplateFieldType = "text" | "number" | "date" | "checkbox" | "signature";
type TemplateFieldConfig = {
  name: string;
  label?: string;
  required?: boolean;
  type: TemplateFieldType;
  pdfFieldName: string;
  dataPath?: string;
};

type DocumentData = Record<string, unknown>;

/**
 * Create a document instance from a template
 * This creates a DRAFT document ready to be filled and generated
 */
export const createDocumentInstance = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    templateId: v.id("documentTemplates"),
    dealId: v.id("deals"),
    data: v.any(), // Initial form data (schema-flexible)
  },
  handler: async (ctx, args) => {
    const user = await requireDealership(ctx, args.dealershipId);

    // Verify template exists and belongs to dealership
    const template = await ctx.db.get(args.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    if (template.dealershipId !== args.dealershipId) {
      throw new Error("Template does not belong to this dealership");
    }

    if (!template.isActive) {
      throw new Error("Template is not active");
    }

    // Verify deal exists and belongs to dealership
    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }

    if (deal.dealershipId !== args.dealershipId) {
      throw new Error("Deal does not belong to this dealership");
    }

    // Get dealership for orgId
    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership) {
      throw new Error("Dealership not found");
    }

    // Create document instance
    const documentId = await ctx.db.insert("documentInstances", {
      dealershipId: args.dealershipId,
      orgId: dealership.orgId,
      templateId: args.templateId,
      dealId: args.dealId,
      data: args.data as DocumentData,
      status: "DRAFT",
      audit: {
        createdBy: user._id,
        createdAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    // Log creation
    await ctx.db.insert("security_logs", {
      dealershipId: args.dealershipId,
      action: "document_instance_created",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Document created from template ${template.name}`,
      timestamp: Date.now(),
    });

    return {
      documentId,
      status: "DRAFT" as const,
    };
  },
});

/**
 * Update document data (while in DRAFT status)
 */
export const updateDocumentData = mutation({
  args: {
    documentId: v.id("documentInstances"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    // Ensure the request is authenticated
    await requireAuth(ctx);

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    await assertDealershipAccess(ctx, document.dealershipId);

    // Only allow updates in DRAFT status
    if (document.status !== "DRAFT") {
      throw new Error(`Cannot update document in ${document.status} status`);
    }

    // Update data
    await ctx.db.patch(args.documentId, {
      data: args.data as DocumentData,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Generate PDF from document instance
 * This fills the template with data and creates the PDF
 */
export const generateDocument = action({
  args: {
    documentId: v.id("documentInstances"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: true; s3Key: string; status: "READY" }> => {
    // Get document instance
    const document = await ctx.runQuery(api.documents.generator.getDocumentById, {
      documentId: args.documentId,
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Get template
    const template = await ctx.runQuery(api.documents.templates.getTemplateById, {
      templateId: document.templateId,
    });

    if (!template) {
      throw new Error("Template not found");
    }

    // Validate data against template schema
    const validation = await ctx.runMutation(
      api.documents.fields.validateFieldData,
      {
        templateId: document.templateId,
        data: document.data,
      }
    );

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${JSON.stringify(validation.errors)}`);
    }

    // Get template PDF download URL
    const { downloadUrl: templateUrl } = await ctx.runAction(
      internal.secure_s3.generateDownloadUrl,
      {
        s3Key: template.s3Key,
        expiresIn: 300,
      }
    );

    try {
      // Download template PDF
      const response = await fetch(templateUrl);
      if (!response.ok) {
        throw new Error("Failed to download template PDF");
      }

      const templateBuffer = await response.arrayBuffer();

      // Fill PDF with data
      const filledPdfBuffer = await fillPDFTemplate(
        templateBuffer,
        template.fields,
        document.data
      );

      // Generate S3 key for filled document
      const orgId = document.orgId || document.dealershipId;
      const s3Key = `org/${orgId}/docs/instances/${document.dealId}/${document._id}.pdf`;

      // Get upload URL
      const { uploadUrl } = await ctx.runAction(
        internal.secure_s3.generateUploadUrl,
        {
          s3Key,
          contentType: "application/pdf",
          expiresIn: 300,
        }
      );

      // Upload filled PDF to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/pdf",
        },
        body: filledPdfBuffer,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload generated PDF");
      }

      // Update document instance with generated PDF info
      await ctx.runMutation(api.documents.generator.markDocumentGenerated, {
        documentId: args.documentId,
        s3Key,
        fileSize: filledPdfBuffer.byteLength,
      });

      return { success: true, s3Key, status: "READY" };
    } catch (error) {
      // Log generation error
      await ctx.runMutation(api.documents.generator.logGenerationError, {
        documentId: args.documentId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  },
});

/**
 * Helper function to fill PDF template with data
 * Uses pdf-lib library
 */
async function fillPDFTemplate(
  templateBuffer: ArrayBuffer,
  fields: TemplateFieldConfig[],
  data: DocumentData
): Promise<ArrayBuffer> {
  try {
    // Load PDF document
    const pdfDoc = await PDFDocument.load(templateBuffer);
    const form = pdfDoc.getForm();

    console.log(`Filling ${fields.length} fields in PDF`);

    let fieldsFilledCount = 0;
    let fieldsSkippedCount = 0;

    // Fill each field
    for (const field of fields) {
      try {
        const value = data[field.name];

        // Skip if no value provided (unless it's a checkbox)
        if (value === undefined || value === null) {
          if (field.type !== 'checkbox') {
            console.log(`No value for field: ${field.name}, skipping`);
            fieldsSkippedCount++;
            continue;
          }
        }

        // Get the PDF form field
        const pdfField = form.getField(field.pdfFieldName);

        // Fill based on field type (cast to our union type)
        const filled = await fillField(pdfField as PDFField, field, value);
        
        if (filled) {
          fieldsFilledCount++;
          console.log(`Filled field: ${field.name} = ${value}`);
        } else {
          fieldsSkippedCount++;
          console.log(`Could not fill field: ${field.name}`);
        }
      } catch (fieldError) {
        console.error(`Error filling field ${field.name}:`, fieldError);
        fieldsSkippedCount++;
        // Continue with next field
      }
    }

    console.log(`Filled ${fieldsFilledCount} fields, skipped ${fieldsSkippedCount} fields`);

    // Flatten the form (make fields non-editable)
    // This prevents users from editing the filled PDF
    form.flatten();

    // Save the filled PDF
    const pdfBytes = await pdfDoc.save();
    
    return pdfBytes.buffer as ArrayBuffer;
  } catch (error) {
    console.error('Error filling PDF template:', error);
    throw new Error(`Failed to fill PDF template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Fill a single PDF field based on its type
 */
type PDFField = PDFTextField | PDFCheckBox | PDFDropdown | PDFRadioGroup;

async function fillField(pdfField: PDFField, fieldConfig: TemplateFieldConfig, value: unknown): Promise<boolean> {
  const fieldType = pdfField.constructor.name;

  try {
    // Text field
    if (pdfField instanceof PDFTextField) {
      const textField = pdfField as PDFTextField;
      const textValue = formatValueForField(value, fieldConfig.type);
      textField.setText(textValue);
      return true;
    }

    // Checkbox
    if (pdfField instanceof PDFCheckBox) {
      const checkboxField = pdfField as PDFCheckBox;
      const isChecked = coerceToBoolean(value);
      
      if (isChecked) {
        checkboxField.check();
      } else {
        checkboxField.uncheck();
      }
      return true;
    }

    // Dropdown
    if (pdfField instanceof PDFDropdown) {
      const dropdown = pdfField as PDFDropdown;
      const stringValue = String(value);
      
      // Check if value is in options
      const options = dropdown.getOptions();
      if (options.includes(stringValue)) {
        dropdown.select(stringValue);
        return true;
      } else {
        console.warn(`Value "${stringValue}" not in dropdown options for field ${fieldConfig.name}`);
        return false;
      }
    }

    // Radio group
    if (pdfField instanceof PDFRadioGroup) {
      const radioGroup = pdfField as PDFRadioGroup;
      const stringValue = String(value);
      
      // Check if value is in options
      const options = radioGroup.getOptions();
      if (options.includes(stringValue)) {
        radioGroup.select(stringValue);
        return true;
      } else {
        console.warn(`Value "${stringValue}" not in radio options for field ${fieldConfig.name}`);
        return false;
      }
    }

    console.warn(`Unsupported field type: ${fieldType}`);
    return false;
  } catch (error) {
    console.error(`Error filling field type ${fieldType}:`, error);
    return false;
  }
}

/**
 * Format value based on field type
 */
function formatValueForField(value: unknown, fieldType: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  switch (fieldType) {
    case 'date':
      return formatDate(value);

    case 'number':
      return formatNumber(value);

    case 'text':
    case 'signature':
    default:
      return String(value);
  }
}

/**
 * Format date value
 * Accepts: Date object, ISO string, timestamp, or formatted string
 */
function formatDate(value: unknown): string {
  try {
    let date: Date;

    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'number') {
      date = new Date(value);
    } else if (typeof value === 'string') {
      date = new Date(value);
    } else {
      return String(value);
    }

    // Validate date
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    // Format as MM/DD/YYYY (US format)
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(value);
  }
}

/**
 * Format number value
 */
function formatNumber(value: unknown): string {
  try {
    const num = Number(value);
    
    if (Number.isNaN(num)) {
      return String(value);
    }

    // Format with commas for thousands
    return num.toLocaleString('en-US');
  } catch (error) {
    console.error('Error formatting number:', error);
    return String(value);
  }
}

/**
 * Coerce value to boolean
 */
function coerceToBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();
    return lower === 'true' || lower === 'yes' || lower === '1' || lower === 'checked';
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  return Boolean(value);
}

/**
 * Advanced: Fill PDF with nested data
 * Supports dot notation for accessing nested objects
 * Example: "buyer.firstName" accesses data.buyer.firstName
 */
function getNestedValue(obj: DocumentData, path: string): unknown {
  try {
    // Use Record<string, unknown> for nested access
    return path.split('.').reduce(
      (current: Record<string, unknown> | unknown, key) => {
        if (current && typeof current === 'object' && key in current) {
          return (current as Record<string, unknown>)[key];
        }
        return undefined;
      },
      obj
    );
  } catch {
    return undefined;
  }
}

async function fillPDFTemplateAdvanced(
  templateBuffer: ArrayBuffer,
  fields: TemplateFieldConfig[],
  data: DocumentData
): Promise<ArrayBuffer> {
  try {
    const pdfDoc = await PDFDocument.load(templateBuffer);
    const form = pdfDoc.getForm();

    for (const field of fields) {
      try {
        // Support dot notation for nested data
        const value = field.dataPath 
          ? getNestedValue(data, field.dataPath)
          : data[field.name];

        if (value === undefined || value === null) {
          if (field.type !== 'checkbox') {
            continue;
          }
        }

        const pdfField = form.getField(field.pdfFieldName);
        await fillField(pdfField as PDFField, field, value);
      } catch (fieldError) {
        console.error(`Error filling field ${field.name}:`, fieldError);
      }
    }

    form.flatten();
    const pdfBytes = await pdfDoc.save();
    return pdfBytes.buffer as ArrayBuffer;
  } catch (error) {
    console.error('Error filling PDF template:', error);
    throw new Error(`Failed to fill PDF template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate data against field requirements before filling
 */
function validateDataBeforeFilling(fields: TemplateFieldConfig[], data: DocumentData): { 
  isValid: boolean; 
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const field of fields) {
    const value = data[field.name];

    // Check required fields
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push(`Required field "${field.label}" is missing`);
    }

    // Type validation
    if (value !== undefined && value !== null && value !== '') {
      switch (field.type) {
        case 'number':
          if (Number.isNaN(Number(value))) {
            errors.push(`Field "${field.label}" must be a number`);
          }
          break;

        case 'date':
          if (Number.isNaN(Date.parse(String(value)))) {
            errors.push(`Field "${field.label}" must be a valid date`);
          }
          break;

        case 'checkbox':
          if (typeof value !== 'boolean' && !['true', 'false', '1', '0'].includes(String(value).toLowerCase())) {
            warnings.push(`Field "${field.label}" has unexpected value for checkbox`);
          }
          break;
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Mark document as generated (internal)
 */
export const markDocumentGenerated = mutation({
  args: {
    documentId: v.id("documentInstances"),
    s3Key: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    await ctx.db.patch(args.documentId, {
      status: "READY",
      s3Key: args.s3Key,
      fileSize: args.fileSize,
      updatedAt: Date.now(),
    });

    // Log generation success
    await ctx.db.insert("security_logs", {
      dealershipId: document.dealershipId,
      action: "document_generated",
      userId: document.audit.createdBy.toString(),
      ipAddress: "server",
      success: true,
      details: `Document generated: ${args.fileSize} bytes`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Log generation error (internal)
 */
export const logGenerationError = mutation({
  args: {
    documentId: v.id("documentInstances"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      return;
    }

    await ctx.db.insert("security_logs", {
      dealershipId: document.dealershipId,
      action: "document_generation_failed",
      userId: document.audit.createdBy.toString(),
      ipAddress: "server",
      success: false,
      details: `Generation failed: ${args.error}`,
      timestamp: Date.now(),
      severity: "high",
    });
  },
});

/**
 * Sign a document (mark as immutable)
 */
export const signDocument = mutation({
  args: {
    documentId: v.id("documentInstances"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    await assertDealershipAccess(ctx, document.dealershipId);

    // Must be in READY status to sign
    if (document.status !== "READY") {
      throw new Error(`Cannot sign document in ${document.status} status`);
    }

    // Must have generated PDF
    if (!document.s3Key) {
      throw new Error("Document must be generated before signing");
    }

    // Update status to SIGNED (immutable)
    await ctx.db.patch(args.documentId, {
      status: "SIGNED",
      audit: {
        ...document.audit,
        signedBy: user._id,
        signedAt: Date.now(),
      },
      updatedAt: Date.now(),
    });

    // Log signing
    await ctx.db.insert("security_logs", {
      dealershipId: document.dealershipId,
      action: "document_signed",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Document signed`,
      timestamp: Date.now(),
    });

    return {
      success: true,
      status: "SIGNED" as const,
    };
  },
});

/**
 * Void a document with reason
 */
export const voidDocument = mutation({
  args: {
    documentId: v.id("documentInstances"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    await assertDealershipAccess(ctx, document.dealershipId);

    // Cannot void a draft (just delete it)
    if (document.status === "DRAFT") {
      throw new Error("Cannot void a draft document. Delete it instead.");
    }

    // Update status to VOID
    await ctx.db.patch(args.documentId, {
      status: "VOID",
      audit: {
        ...document.audit,
        voidedBy: user._id,
        voidedAt: Date.now(),
        voidReason: args.reason,
      },
      updatedAt: Date.now(),
    });

    // Log voiding
    await ctx.db.insert("security_logs", {
      dealershipId: document.dealershipId,
      action: "document_voided",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Document voided: ${args.reason}`,
      timestamp: Date.now(),
    });

    return {
      success: true,
      status: "VOID" as const,
    };
  },
});

/**
 * Get document instance by ID
 */
export const getDocumentById = query({
  args: {
    documentId: v.id("documentInstances"),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    await assertDealershipAccess(ctx, document.dealershipId);

    return document;
  },
});

/**
 * Get all documents for a deal
 */
export const getDocumentsByDeal = query({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args) => {
    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }

    await assertDealershipAccess(ctx, deal.dealershipId as Id<"dealerships">);

    const documents = await ctx.db
      .query("documentInstances")
      .withIndex("by_deal", (q) => q.eq("dealId", args.dealId))
      .collect();

    // Get template info for each document
    const documentsWithTemplates = await Promise.all(
      documents.map(async (doc) => {
        const template = await ctx.db.get(doc.templateId);
        return {
          ...doc,
          template: template
            ? {
                name: template.name,
                category: template.category,
                version: template.version,
              }
            : null,
        };
      })
    );

    return documentsWithTemplates;
  },
});

/**
 * Get download URL for generated document
 */
export const getDocumentDownloadUrl = action({
  args: {
    documentId: v.id("documentInstances"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ downloadUrl: string; expiresIn: number; status: string }> => {
    const document = await ctx.runQuery(api.documents.generator.getDocumentById, {
      documentId: args.documentId,
    });

    if (!document) {
      throw new Error("Document not found");
    }

    if (!document.s3Key) {
      throw new Error("Document has not been generated yet");
    }

    // Generate presigned URL for download
    const { downloadUrl } = await ctx.runAction(
      internal.secure_s3.generateDownloadUrl,
      {
        s3Key: document.s3Key,
        expiresIn: 300, // 5 minutes
      }
    );

    return { downloadUrl, expiresIn: 300, status: document.status };
  },
});

/**
 * Delete document instance (only DRAFT status)
 */
export const deleteDocumentInstance = mutation({
  args: {
    documentId: v.id("documentInstances"),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);

    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    await assertDealershipAccess(ctx, document.dealershipId);

    // Only allow deletion of DRAFT documents
    if (document.status !== "DRAFT") {
      throw new Error(
        `Cannot delete document in ${document.status} status. Use void instead.`
      );
    }

    // Delete document
    await ctx.db.delete(args.documentId);

    // Log deletion
    await ctx.db.insert("security_logs", {
      dealershipId: document.dealershipId,
      action: "document_deleted",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Draft document deleted`,
      timestamp: Date.now(),
    });

    return { success: true };
  },
});

export {
  fillPDFTemplate,
  fillPDFTemplateAdvanced,
  validateDataBeforeFilling,
  formatDate,
  formatNumber,
  getNestedValue,
};