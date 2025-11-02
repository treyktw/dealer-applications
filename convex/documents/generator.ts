// convex/documents/generator.ts - PDF Generation & Filling
import { v } from "convex/values";
import { mutation, query, action, type QueryCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { requireDealership, assertDealershipAccess } from "../guards";
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from 'pdf-lib';

/**
 * Authentication helper that works for both desktop and web apps
 * 
 * @param ctx - Query context
 * @param token - Optional session token (for desktop app)
 * @returns User document from database
 * @throws Error if not authenticated
 */
async function requireAuth(ctx: QueryCtx, token?: string): Promise<Doc<"users">> {
  // Path 1: Desktop app authentication (with token)
  if (token) {
    // console.log("🔐 Authenticating via desktop token");
    
    type SessionUser = { id?: string; email?: string; dealershipId?: string };
    
    // Validate session token
    const sessionData = await ctx.runQuery(api.desktopAuth.validateSession, { token });
    if (!sessionData?.user) {
      throw new Error("Invalid or expired session");
    }
    
    const { id, email } = sessionData.user as SessionUser;
    
    // Try to find user by Clerk ID
    let userDoc = id
      ? await ctx.db.query("users").withIndex("by_clerk_id", (q) => q.eq("clerkId", id)).first()
      : null;
    
    // Fallback to email if Clerk ID not found
    if (!userDoc && email) {
      userDoc = await ctx.db.query("users").withIndex("by_email", (q) => q.eq("email", email)).first();
    }
    
    if (!userDoc) {
      throw new Error("User not found in database");
    }
    
    // console.log("✅ Desktop authentication successful");
    return userDoc;
  }
  
  // Path 2: Web app authentication (with Clerk identity)
  // console.log("🔐 Authenticating via Clerk identity");
  
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
    .first();
    
  if (!user) {
    throw new Error("User not found in database");
  }
  
  // console.log("✅ Web authentication successful");
  return user;
}


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
      name: template.name,
      documentType: template.category,
      requiredSignatures: template.pdfFields.filter((field) => field.type === "signature").map((field) => field.name),
      signaturesCollected: [],
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
        template.pdfFields,
        document.data
      );

      // Generate S3 key for filled document
      const orgId = document.orgId || document.dealershipId;
      const s3Key = `org/${orgId}/docs/instances/${document.dealId}/${document._id}.pdf`;
      // Log S3 key generation
      // console.log("Generated S3 key:", s3Key);
      // console.log("S3 key length:", s3Key.length);
      // console.log("S3 key ends with .pdf:", s3Key.endsWith('.pdf'));

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
  fields: Array<{ 
    name: string; 
    type: string; 
    page: number; 
    rect?: number[];
    pdfFieldName?: string;  // ← This should already be in the type
  }>,
  data: DocumentData
): Promise<ArrayBuffer> {
  try {
    // Load PDF document
    const pdfDoc = await PDFDocument.load(templateBuffer);
    const form = pdfDoc.getForm();

    console.log(`Filling ${fields.length} fields in PDF`);

    // ⚠️ ADD THIS: Get all available PDF field names for debugging
    const pdfFields = form.getFields();
    const availableFieldNames = pdfFields.map(f => f.getName());
    // console.log('Available PDF fields:', availableFieldNames.join(', '));

    let fieldsFilledCount = 0;
    let fieldsSkippedCount = 0;

    // Fill each field
    for (const field of fields) {
      try {
        const value = data[field.name];

        // Skip if no value provided (unless it's a checkbox)
        if (value === undefined || value === null) {
          if (field.type !== 'checkbox') {
            fieldsSkippedCount++;
            continue;
          }
        }

        // ⚠️ CRITICAL FIX: Use pdfFieldName (exact case) instead of field.name (lowercase)
        const pdfFieldName = field.pdfFieldName || field.name;
        
        // Try to get the PDF form field
        let pdfField: PDFTextField | PDFCheckBox | PDFDropdown | PDFRadioGroup | undefined;
        try {
          pdfField = form.getField(pdfFieldName) as PDFTextField | PDFCheckBox | PDFDropdown | PDFRadioGroup;
        } catch {
          // If not found, try case-insensitive search as fallback
          const matchingField = availableFieldNames.find(
            name => name.toLowerCase() === pdfFieldName.toLowerCase()
          );
          
          if (matchingField) {
            console.log(`Case mismatch found: ${pdfFieldName} -> ${matchingField}`);
            pdfField = form.getField(matchingField) as PDFTextField | PDFCheckBox | PDFDropdown | PDFRadioGroup;
          } else {
            console.error(`Field not found: ${pdfFieldName}`);
            console.log('Available fields:', availableFieldNames.slice(0, 10).join(', '), '...');
            fieldsSkippedCount++;
            continue;
          }
        }

        // Fill based on field type (cast to our union type)
        const filled = await fillField(
          pdfField as PDFField, 
          { 
            name: field.name, 
            type: field.type as TemplateFieldType, 
            pdfFieldName: pdfFieldName 
          }, 
          value
        );
        
        if (filled) {
          fieldsFilledCount++;
          console.log(`✓ ${pdfFieldName} = ${value}`);
        } else {
          fieldsSkippedCount++;
        }
      } catch (fieldError) {
        console.error(`Error filling field ${field.name}:`, fieldError);
        fieldsSkippedCount++;
        // Continue with next field
      }
    }

    console.log(`PDF filled: ${fieldsFilledCount} fields filled, ${fieldsSkippedCount} skipped`);

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

    // DON'T flatten form - keep fields editable for later editing
    // form.flatten(); // Commented out to preserve form fields
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

    // Log S3 key before storing
    console.log("Storing S3 key:", args.s3Key);
    console.log("S3 key length:", args.s3Key.length);
    console.log("S3 key ends with .pdf:", args.s3Key.endsWith('.pdf'));

    await ctx.db.patch(args.documentId, {
      status: "READY",
      s3Key: args.s3Key.trim(), // Add trim() to remove any whitespace
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
    token: v.optional(v.string()),
    skipAuth: v.optional(v.boolean()), // Allow skipping auth for internal calls
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // ✅ Authenticate (works for both desktop and web) unless skipAuth is true
    if (!args.skipAuth) {
      const user = await requireAuth(ctx, args.token);

      // Verify user has access to this document's dealership
      if (document.dealershipId !== user.dealershipId) {
        throw new Error("Access denied: Document belongs to different dealership");
      }
    }

    return document;
  },
});

/**
 * Get all documents for a deal
 */
export const getDocumentsByDeal = query({
  args: {
    dealId: v.id("deals"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // ✅ Authenticate (works for both desktop and web)
    const user = await requireAuth(ctx, args.token);
    
    // Verify user has dealership
    if (!user.dealershipId) {
      throw new Error("User not associated with a dealership");
    }
    
    // Get deal and verify it exists
    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }
    
    // Verify user has access to this deal
    if (deal.dealershipId !== user.dealershipId) {
      throw new Error("Access denied: Deal belongs to different dealership");
    }
    
    // Fetch documents from documentInstances table
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
                _id: template._id,
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

/**
 * Extract current field values from a generated PDF document
 * Used for editing/reviewing generated documents
 */
export const extractFieldValuesFromDocument = action({
  args: {
    documentId: v.id("documentInstances"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{
    fields: Array<{
      name: string;
      type: string;
      label: string;
      value: string | boolean;
      pdfFieldName: string;
    }>;
    documentName: string;
    templateName: string;
  }> => {
    // Get document with authentication
    const document = await ctx.runQuery(api.documents.generator.getDocumentById, {
      documentId: args.documentId,
      token: args.token,
    });

    if (!document) {
      throw new Error("Document not found");
    }

    if (!document.s3Key) {
      throw new Error("Document has not been generated yet");
    }

    // Get template to know the field structure
    const template = await ctx.runQuery(api.documents.templates.getTemplateById, {
      templateId: document.templateId,
      token: args.token,
    });

    if (!template) {
      throw new Error("Template not found");
    }

    // Get download URL for the generated PDF
    const { downloadUrl } = await ctx.runAction(
      internal.secure_s3.generateDownloadUrl,
      {
        s3Key: document.s3Key,
        expiresIn: 300,
      }
    );

    try {
      // Download the generated PDF
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Failed to download generated PDF");
      }

      const pdfBuffer = await response.arrayBuffer();

      // Extract current field values from the PDF
      const fieldValues = await extractCurrentPDFFieldValues(pdfBuffer);
      
      // console.log("Extracted field values from PDF:", fieldValues);

      // Use the actual fields from the PDF instead of template fields
      const fieldsWithMetadata = fieldValues.map((fieldValue) => {
        return {
          name: fieldValue.name,
          type: fieldValue.type,
          label: generateFieldLabel(fieldValue.name),
          value: fieldValue.value,
          pdfFieldName: fieldValue.name, // Use the actual PDF field name
        };
      });

      return {
        fields: fieldsWithMetadata,
        documentName: document.name,
        templateName: template.name,
      };
    } catch (error) {
      console.error("Error extracting field values:", error);
      throw new Error(
        `Failed to extract field values: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

/**
 * Helper function to extract current values from a PDF
 */
async function extractCurrentPDFFieldValues(
  pdfBuffer: ArrayBuffer
): Promise<Array<{ name: string; value: string | boolean; type: string }>> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const form = pdfDoc.getForm();
  const formFields = form.getFields();

  console.log(`Found ${formFields.length} form fields in PDF`);
  
  // Debug: Check if PDF has any form at all
  if (formFields.length === 0) {
    console.log("No form fields found in PDF. This could mean:");
    console.log("1. The PDF was flattened during generation");
    console.log("2. The PDF template doesn't have form fields");
    console.log("3. The PDF is corrupted or not loading properly");
    
    // Try to get form info
    try {
      const formInfo = form.constructor.name;
      console.log(`Form object type: ${formInfo}`);
    } catch (e) {
      console.log("Could not get form info:", e);
    }
  }

  const fieldValues: Array<{ name: string; value: string | boolean; type: string }> = [];

  for (const field of formFields) {
    try {
      const fieldName = field.getName();
      let value: string | boolean = "";
      let type = "text";

      if (field instanceof PDFTextField) {
        value = (field as PDFTextField).getText() || "";
        type = "text";
      } else if (field instanceof PDFCheckBox) {
        value = (field as PDFCheckBox).isChecked();
        type = "checkbox";
      } else if (field instanceof PDFDropdown) {
        const selected = (field as PDFDropdown).getSelected();
        value = selected?.[0] || "";
        type = "dropdown";
      } else if (field instanceof PDFRadioGroup) {
        value = (field as PDFRadioGroup).getSelected() || "";
        type = "radio";
      }

      // console.log(`PDF Field: ${fieldName} = ${value} (type: ${type})`);
      fieldValues.push({ name: fieldName, value, type });
    } catch (error) {
      console.error(`Error reading field:`, error);
    }
  }

  console.log(`Successfully extracted ${fieldValues.length} field values`);
  return fieldValues;
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
 * Update a generated document with new field values
 * Creates a new version of the PDF with updated values
 */
export const updateDocumentFieldValues = action({
  args: {
    documentId: v.id("documentInstances"),
    fieldValues: v.array(
      v.object({
        pdfFieldName: v.string(),
        value: v.union(v.string(), v.boolean()),
      })
    ),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; s3Key: string }> => {
    // Get document with authentication
    const document = await ctx.runQuery(api.documents.generator.getDocumentById, {
      documentId: args.documentId,
      token: args.token,
    });

    if (!document) {
      throw new Error("Document not found");
    }

    if (!document.s3Key) {
      throw new Error("Document has not been generated yet");
    }

    // Get download URL for the current PDF
    const { downloadUrl } = await ctx.runAction(
      internal.secure_s3.generateDownloadUrl,
      {
        s3Key: document.s3Key,
        expiresIn: 300,
      }
    );

    try {
      // Download the current PDF
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Failed to download current PDF");
      }

      const pdfBuffer = await response.arrayBuffer();

      // Update the PDF with new field values
      const updatedPdfBuffer = await updatePDFFieldValues(pdfBuffer, args.fieldValues);

      // Generate new S3 key (versioned)
      const timestamp = Date.now();
      const orgId = document.orgId || document.dealershipId;
      const s3Key = `org/${orgId}/docs/instances/${document.dealId}/${document._id}-v${timestamp}.pdf`;

      // Get upload URL
      const { uploadUrl } = await ctx.runAction(
        internal.secure_s3.generateUploadUrl,
        {
          s3Key,
          contentType: "application/pdf",
          expiresIn: 300,
        }
      );

      // Upload updated PDF to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/pdf",
        },
        body: updatedPdfBuffer,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload updated PDF");
      }

      // Update document instance with new S3 key
      await ctx.runMutation(api.documents.generator.markDocumentGenerated, {
        documentId: args.documentId,
        s3Key,
        fileSize: updatedPdfBuffer.byteLength,
      });

      return { success: true, s3Key };
    } catch (error) {
      console.error("Error updating document:", error);
      throw new Error(
        `Failed to update document: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  },
});

/**
 * Debug function to check S3 key storage and retrieval
 */
export const debugDocumentS3Key = query({
  args: { documentId: v.id("documentInstances") },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) return null;
    
    return {
      documentId: document._id,
      s3Key: document.s3Key,
      s3KeyLength: document.s3Key?.length,
      s3KeyEndsWithPdf: document.s3Key?.endsWith('.pdf'),
      s3KeyBytes: document.s3Key ? new TextEncoder().encode(document.s3Key) : null,
      status: document.status,
      name: document.name,
    };
  },
});

/**
 * Helper function to update field values in a PDF
 */
async function updatePDFFieldValues(
  pdfBuffer: ArrayBuffer,
  fieldValues: Array<{ pdfFieldName: string; value: string | boolean }>
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const form = pdfDoc.getForm();
  
  // Get all available field names for debugging
  const availableFields = form.getFields().map(field => field.getName());
  console.log("Available PDF fields:", availableFields);

  for (const { pdfFieldName, value } of fieldValues) {
    try {
      const field = form.getField(pdfFieldName);

      if (field instanceof PDFTextField) {
        (field as PDFTextField).setText(String(value));
        console.log(`Updated text field ${pdfFieldName} = ${value}`);
      } else if (field instanceof PDFCheckBox) {
        const checked = typeof value === "boolean" ? value : String(value) === "true";
        if (checked) {
          (field as PDFCheckBox).check();
        } else {
          (field as PDFCheckBox).uncheck();
        }
        console.log(`Updated checkbox field ${pdfFieldName} = ${checked}`);
      } else if (field instanceof PDFDropdown) {
        (field as PDFDropdown).select(String(value));
        console.log(`Updated dropdown field ${pdfFieldName} = ${value}`);
      } else if (field instanceof PDFRadioGroup) {
        (field as PDFRadioGroup).select(String(value));
        console.log(`Updated radio field ${pdfFieldName} = ${value}`);
      }
    } catch (error) {
      console.error(`Error updating field ${pdfFieldName}:`, error);
      // Continue with other fields instead of failing completely
    }
  }

  // Save the updated PDF
  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer as ArrayBuffer;
}

export const finalizeDocument = mutation({
  args: {
    documentId: v.id("documentInstances"),
    s3Key: v.string(),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await requireAuth(ctx, args.token);
    
    // Get document
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Verify access
    if (document.dealershipId !== user.dealershipId) {
      throw new Error("Access denied");
    }

    // Update document status
    await ctx.db.patch(args.documentId, {
      status: "FINALIZED",
      s3Key: args.s3Key,
      finalizedAt: Date.now(),
      finalizedBy: user._id,
      updatedAt: Date.now(),
    });

    // Log security event
    await ctx.db.insert("security_logs", {
      dealershipId: document.dealershipId,
      action: "document_finalized",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Document finalized: ${document.name} (S3: ${args.s3Key})`,
      timestamp: Date.now(),
      severity: "medium",
    });

    console.log(`✅ Document finalized: ${args.documentId}`);

    return {
      success: true,
      documentId: args.documentId,
      s3Key: args.s3Key,
      finalizedAt: Date.now(),
    };
  },
});

/**
 * Mark document as notarized
 */
export const markDocumentNotarized = mutation({
  args: {
    documentId: v.id("documentInstances"),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await requireAuth(ctx, args.token);
    
    // Get document
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Verify access
    if (document.dealershipId !== user.dealershipId) {
      throw new Error("Access denied");
    }

    // Update document as notarized
    await ctx.db.patch(args.documentId, {
      notarized: true,
      notarizedAt: Date.now(),
      notarizedBy: user._id,
      updatedAt: Date.now(),
    });

    // Log security event
    await ctx.db.insert("security_logs", {
      dealershipId: document.dealershipId,
      action: "document_notarized",
      userId: user._id.toString(),
      ipAddress: "server",
      success: true,
      details: `Document notarized: ${document.name}`,
      timestamp: Date.now(),
      severity: "medium",
    });

    return {
      success: true,
      documentId: args.documentId,
      notarizedAt: Date.now(),
    };
  },
});

/**
 * Get presigned download URL for document
 * Used to initially load document from S3
 */
export const getDocumentDownloadUrl = action({
  args: {
    documentId: v.id("documentInstances"),
    token: v.optional(v.string()),
    expiresIn: v.optional(v.number()), // Seconds, default 300 (5 min)
  },
  handler: async (
    ctx,
    args
  ): Promise<{ downloadUrl: string; s3Key: string; expiresIn: number }> => {
    // Get document with access checks via existing query to avoid duplicating logic
    const document = await ctx.runQuery(api.documents.generator.getDocumentById, {
      documentId: args.documentId,
      token: args.token,
    });

    if (!document.s3Key) {
      throw new Error("Document not yet uploaded to S3");
    }

    // Generate presigned download URL
    const { downloadUrl } = await ctx.runAction(
      internal.secure_s3.generateDownloadUrl,
      {
        s3Key: document.s3Key,
        expiresIn: args.expiresIn || 300, // Default 5 minutes
      }
    );

    return {
      downloadUrl,
      s3Key: document.s3Key,
      expiresIn: args.expiresIn || 300,
    };
  },
});

/**
 * Get presigned upload URL for finalizing document
 * Returns URL where client can PUT the final PDF
 */
export const getDocumentUploadUrl = action({
  args: {
    documentId: v.id("documentInstances"),
    fileSize: v.number(),
    token: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ uploadUrl: string; s3Key: string; expiresIn: number; maxFileSize: number }> => {
    // Get document (auth + access checks inside)
    const document = await ctx.runQuery(api.documents.generator.getDocumentById, {
      documentId: args.documentId,
      token: args.token,
    });

    // Verify file size (max 25MB for documents)
    const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
    if (args.fileSize > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Generate S3 key
    const s3Key = generateDocumentS3Key(
      document.dealershipId,
      document.dealId,
      args.documentId
    );

    // Generate presigned upload URL
    const { uploadUrl } = await ctx.runAction(
      internal.secure_s3.generateUploadUrl,
      {
        s3Key,
        contentType: "application/pdf",
        expiresIn: 900,
      }
    );

    return {
      uploadUrl,
      s3Key,
      expiresIn: 900, // 15 minutes
      maxFileSize: MAX_FILE_SIZE,
    };
  },
});

/**
 * Update document field values
 * Used for tracking field changes in Convex (optional)
 */
export const updateDocumentFields = mutation({
  args: {
    documentId: v.id("documentInstances"),
    fieldValues: v.array(
      v.object({
        pdfFieldName: v.string(),
        value: v.union(v.string(), v.boolean()),
      })
    ),
    token: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Authenticate user
    const user = await requireAuth(ctx, args.token);
    
    // Get document
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Verify access
    if (document.dealershipId !== user.dealershipId) {
      throw new Error("Access denied");
    }

    // Update field values in metadata (optional tracking)
    const fieldValuesMap = Object.fromEntries(
      args.fieldValues.map(f => [f.pdfFieldName, f.value])
    );

    await ctx.db.patch(args.documentId, {
      metadata: {
        ...document.metadata,
        lastFieldValues: fieldValuesMap,
        lastFieldUpdate: Date.now(),
      },
      updatedAt: Date.now(),
    });

    console.log(`📝 Updated ${args.fieldValues.length} fields for ${args.documentId}`);

    return { success: true, fieldCount: args.fieldValues.length };
  },
});

// ==================== HELPER FUNCTIONS ====================

/**
 * Generate S3 key for document
 */
function generateDocumentS3Key(
  dealershipId: Id<"dealerships">,
  dealId: Id<"deals">,
  documentId: Id<"documentInstances">
): string {
  return `org/${dealershipId}/docs/instances/${dealId}/${documentId}.pdf`;
}

/**
 * Embed signatures into PDF document
 * This function loads the unsigned PDF, finds signature fields, and embeds signature images
 */
export const embedSignaturesIntoPDF = action({
  args: {
    documentId: v.id("documentInstances"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; signedS3Key?: string; signaturesEmbedded?: number; message?: string }> => {
    // Get document (skip auth since this is an internal system action)
    const document: Doc<"documentInstances"> | null = await ctx.runQuery(api.documents.generator.getDocumentById, {
      documentId: args.documentId,
      skipAuth: true,
    });

    if (!document) {
      throw new Error("Document not found");
    }

    if (!document.s3Key) {
      throw new Error("Document PDF not generated yet");
    }

    // Get all signatures for this document
    const signatures: Array<{
      id: Id<"signatures">;
      signerRole: string;
      signerName: string;
      signedAt: number;
      s3Key: string;
      imagePreview?: string;
    }> = await ctx.runQuery(api.signatures.getSignaturesForDeal, {
      dealId: document.dealId,
    });

    // Filter to only signatures for this document
    const documentSignatures: typeof signatures = signatures.filter((_sig: typeof signatures[number]) => {
      // Check if signature belongs to this document
      // Note: We need to check signature's documentId, but getSignaturesForDeal doesn't return it
      // For now, we'll embed all signatures from the deal (they should all be for relevant documents)
      return true; // Will be refined when signature query includes documentId
    });

    if (documentSignatures.length === 0) {
      console.log("No signatures to embed for document", args.documentId);
      return { success: true, message: "No signatures to embed" };
    }

    // Get template to find signature field positions
    const template = await ctx.runQuery(api.documents.templates.getTemplateById, {
      templateId: document.templateId,
    });

    if (!template) {
      throw new Error("Template not found");
    }

    // Get unsigned PDF from S3
    const { downloadUrl: pdfUrl } = await ctx.runAction(
      internal.secure_s3.generateDownloadUrl,
      {
        s3Key: document.s3Key,
        expiresIn: 300,
      }
    );

    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error("Failed to download PDF");
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages();

    // Helper to find signature field by role
    const findSignatureField = (role: string): { fieldName: string; pageIndex: number; rect?: { x: number; y: number; width: number; height: number } } | null => {
      // Search through PDF fields to find signature field matching the role
      const fields = form.getFields();
      
      for (const field of fields) {
        const fieldName = field.getName().toLowerCase();
        const roleLower = role.toLowerCase();
        
        // Match field name patterns like "signature_buyer", "buyer_signature", "SIGNATURE_BUYER", etc.
        if (
          fieldName.includes("signature") &&
          (fieldName.includes(roleLower) || 
           fieldName.includes(roleLower.replace("_", "")) ||
           (roleLower === "seller" && (fieldName.includes("dealer") || fieldName.includes("seller"))) ||
           (roleLower === "buyer" && !fieldName.includes("seller") && !fieldName.includes("dealer")))
        ) {
          // Get field position
          const widgets = (field as any).acroField.getWidgets();
          if (widgets.length > 0) {
            const widget = widgets[0];
            const rect = widget.Rect();
            const pageRef = widget.P();
            
            let pageIndex = 0;
            if (pageRef) {
              pageIndex = pages.findIndex((p) => (p as any).ref === pageRef);
            }

            return {
              fieldName: field.getName(),
              pageIndex: pageIndex >= 0 ? pageIndex : 0,
              rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : undefined,
            };
          }
        }
      }
      return null;
    };

    // Embed each signature
    for (const signature of documentSignatures) {
      try {
        // Find the signature field for this role
        const fieldInfo = findSignatureField(signature.signerRole);
        
        if (!fieldInfo) {
          console.warn(`No signature field found for role: ${signature.signerRole}`);
          continue;
        }

        // Get signature image (from imagePreview if available, or fetch from S3)
        let signatureImage: Uint8Array | null = null;
        let isSvgImage = false;

        if (signature.imagePreview) {
          // Use preview image (available for 24hrs)
          const isSvgPreview = signature.imagePreview.startsWith("data:image/svg+xml;base64,");
          isSvgImage = isSvgPreview;
          const base64Data = signature.imagePreview.replace(/^data:image\/(png|svg\+xml);base64,/, "");
          signatureImage = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        } else if (signature.s3Key) {
          // Fetch from S3 using signature.s3Key
          try {
            const { downloadUrl } = await ctx.runAction(
              internal.secure_s3.generateDownloadUrl,
              {
                s3Key: signature.s3Key,
                expiresIn: 300,
              }
            );

            const imageResponse = await fetch(downloadUrl);
            if (!imageResponse.ok) {
              console.warn(`Failed to fetch signature from S3: ${signature.s3Key}`);
              continue;
            }

            const imageArrayBuffer = await imageResponse.arrayBuffer();
            signatureImage = new Uint8Array(imageArrayBuffer);
            isSvgImage = signature.s3Key.endsWith('.svg');
          } catch (fetchError) {
            console.error(`Error fetching signature ${signature.id} from S3:`, fetchError);
            continue;
          }
        } else {
          // No preview and no S3 key - skip this signature
          console.warn(`No preview or S3 key available for signature ${signature.id}, skipping`);
          continue;
        }

        if (!signatureImage) {
          console.warn(`Could not load signature image for ${signature.id}`);
          continue;
        }

        // For PDF embedding, we need PNG format
        // If it's SVG, we'll try to embed it as-is (pdf-lib may support it)
        // Otherwise use the image directly
        const imageToEmbed: Uint8Array = signatureImage;

        // Embed the signature image
        const page = pages[fieldInfo.pageIndex];
        if (!page) {
          console.warn(`Page ${fieldInfo.pageIndex} not found`);
          continue;
        }

        // Embed image at field position
        // If rect is available, use it; otherwise use a default size
        const width = fieldInfo.rect?.width || 150;
        const height = fieldInfo.rect?.height || 50;
        const x = fieldInfo.rect?.x || 100;
        const y = page.getHeight() - (fieldInfo.rect?.y || 100) - height; // PDF y is bottom-up

        try {
          // pdf-lib embedPng returns PDFImage, but we can't import the type directly
          // Use Awaited to get the resolved type
          let embeddedImage: Awaited<ReturnType<typeof pdfDoc.embedPng>>;
          if (isSvgImage) {
            // For SVG, we need to convert to PNG or embed differently
            // pdf-lib doesn't natively support SVG, so we'll need to handle it
            // For now, try to decode SVG and create a PNG representation
            // This is a limitation - in production, you'd want to use sharp or similar
            console.warn(`SVG signature detected for ${signature.signerRole}, attempting PNG conversion`);
            
            // Try to embed as image - pdf-lib will attempt to decode
            // Note: This may fail if SVG is complex. In production, convert SVG to PNG first.
            try {
              // Attempt to embed as PNG (will fail if truly SVG)
              embeddedImage = await pdfDoc.embedPng(imageToEmbed);
            } catch {
              // If that fails, skip SVG signatures that can't be embedded
              console.warn(`Cannot embed SVG signature directly, skipping ${signature.signerRole}`);
              continue;
            }
          } else {
            // PNG image - embed directly
            embeddedImage = await pdfDoc.embedPng(imageToEmbed);
          }
          
          page.drawImage(embeddedImage, {
            x,
            y,
            width,
            height,
          });
        } catch (embedError) {
          console.error(`Failed to embed signature for role ${signature.signerRole}:`, embedError);
          // Continue with other signatures
          continue;
        }

        // Also set the field value if it's a text field
        try {
          const pdfField = form.getField(fieldInfo.fieldName);
          if (pdfField instanceof PDFTextField) {
            pdfField.setText(signature.signerName);
          }
        } catch {
          // Field might not be a text field, that's ok
        }
      } catch (error) {
        console.error(`Error embedding signature for role ${signature.signerRole}:`, error);
        // Continue with other signatures
      }
    }

    // Generate signed PDF
    const signedPdfBytes = await pdfDoc.save();
    const signedPdfBuffer = signedPdfBytes.buffer.slice(
      signedPdfBytes.byteOffset,
      signedPdfBytes.byteOffset + signedPdfBytes.byteLength
    ) as ArrayBuffer;

    // Upload signed PDF to S3
    const orgId: Id<"orgs"> | Id<"dealerships"> = (document.orgId ?? document.dealershipId);
    const signedS3Key: string = `org/${orgId}/docs/instances/${document.dealId}/${document._id}_signed.pdf`;

    const { uploadUrl } = await ctx.runAction(
      internal.secure_s3.generateUploadUrl,
      {
        s3Key: signedS3Key,
        contentType: "application/pdf",
        expiresIn: 300,
      }
    );

    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/pdf",
      },
      body: signedPdfBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload signed PDF");
    }

    // Update document with signed PDF info
    await ctx.runMutation(api.documents.generator.updateDocumentSignedPdf, {
      documentId: args.documentId,
      signedS3Key,
      fileSize: signedPdfBuffer.byteLength,
    });

    return {
      success: true,
      signedS3Key,
      signaturesEmbedded: documentSignatures.length,
    };
  },
});

/**
 * Update document with signed PDF info
 */
export const updateDocumentSignedPdf = mutation({
  args: {
    documentId: v.id("documentInstances"),
    signedS3Key: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.documentId, {
      signedS3Key: args.signedS3Key,
      fileSize: args.fileSize,
      updatedAt: Date.now(),
    });
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