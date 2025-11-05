// convex/documents/deal-generator.ts - Generate all documents for a deal
import { v } from "convex/values";
import { mutation, action, query } from "../_generated/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
// import { requireAuth, assertDealershipAccess } from "../guards";
import { PDFDocument, type PDFTextField, type PDFCheckBox } from "pdf-lib";
import {
  preparePdfData,
  getRequiredSignatures,
  validateDealData,
  type DealData,
} from "../lib/pdf_data_preparer";
import { generateDownloadUrl, generateUploadUrl } from "../lib/s3";
import { DealStatus } from "../lib/statuses";

/**
 * Generate all documents for a deal
 * This is the main entry point for document generation from the web app
 */
export const generateDealDocuments = action({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    
    if (!user) {
      throw new Error("Authentication required");
    }

    if (!user.dealershipId) {
      throw new Error("User not associated with a dealership");
    }

    // Get deal
    const deal = await ctx.runQuery(api.deals.getDeal, {
      dealId: args.dealId,
    });

    if (!deal) {
      throw new Error("Deal not found");
    }

    // Verify user has access to this dealership
    if (user.dealershipId !== deal.dealershipId) {
      throw new Error("User does not have access to this deal");
    }

    // Update deal status to DOCS_GENERATING
    await ctx.runMutation(api.deals.updateDealStatus, {
      dealId: args.dealId,
      newStatus: DealStatus.DOCS_GENERATING,
    });

    try {
      // Get active templates for this dealership
      const templates = await ctx.runQuery(api.documents.templates.getActiveTemplates, {
        dealershipId: user.dealershipId,
      });

      if (!templates || templates.length === 0) {
        throw new Error(
          "No active templates found for this dealership. Please upload and activate templates first."
        );
      }

      // Gather all deal data
      const dealData = await ctx.runQuery(api.documents.deal_generator.getDealDataForGeneration, {
        dealId: args.dealId,
      });

      // Generate documents for each template
      const generatedDocuments: Array<{
        documentId: Id<"documentInstances">;
        templateName: string;
        status: string;
      }> = [];

      for (const template of templates) {
        try {
          console.log(`Generating document from template: ${template.name}`);

          // Validate deal data against template field mappings
          const validation = validateDealData(
            dealData,
            template.fieldMappings || []
          );

          if (!validation.valid) {
            console.error(
              `Validation failed for template ${template.name}:`,
              validation.errors
            );
            // Log error but continue with other templates
            await ctx.runMutation(api.documents.deal_generator.logTemplateError, {
              dealId: args.dealId,
              templateId: template._id,
              error: `Validation failed: ${validation.errors.join(", ")}`,
            });
            continue;
          }

          // Generate document instance for this template
          const result = await ctx.runAction(api.documents.deal_generator.generateSingleDocument, {
            dealId: args.dealId,
            templateId: template._id,
            dealData,
            userId: user._id,
          });

          generatedDocuments.push({
            documentId: result.documentId as Id<"documentInstances">,
            templateName: template.name,
            status: "ready",
          });
        } catch (templateError) {
          console.error(
            `Error generating document from template ${template.name}:`,
            templateError
          );

          // Log error but continue
          await ctx.runMutation(api.documents.deal_generator.logTemplateError, {
            dealId: args.dealId,
            templateId: template._id,
            error:
              templateError instanceof Error
                ? templateError.message
                : String(templateError),
          });
        }
      }

      if (generatedDocuments.length === 0) {
        throw new Error(
          "Failed to generate any documents. Please check your templates and deal data."
        );
      }

      // Update deal status
      await ctx.runMutation(api.deals.updateDealStatus, {
        dealId: args.dealId,
        newStatus: DealStatus.DOCS_READY,
      });

      return {
        success: true,
        documentsGenerated: generatedDocuments.length,
        documents: generatedDocuments,
      };
    } catch (error) {
      // Update deal status to draft on error
      await ctx.runMutation(api.deals.updateDealStatus, {
        dealId: args.dealId,
        newStatus: DealStatus.DRAFT,
      });

      throw error;
    }
  },
});

/**
 * Get all data needed for document generation
 * INTERNAL - called by generateDealDocuments
 */
export const getDealDataForGeneration = query({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args): Promise<DealData> => {
    // Get deal
    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }

    // Get client
    const client = await ctx.db.get(deal.clientId);
    if (!client) {
      throw new Error("Client not found for deal");
    }

    // Get vehicle
    const vehicle = await ctx.db.get(deal.vehicleId);
    if (!vehicle) {
      throw new Error("Vehicle not found for deal");
    }

    // Get dealership
    const dealership = await ctx.db.get(deal.dealershipId as Id<"dealerships">);
    if (!dealership) {
      throw new Error("Dealership not found");
    }

    // Prepare deal data
    const dealData: DealData = {
      client: {
        firstName: client.firstName,
        lastName: client.lastName,
        middleName: (client as { middleName?: string }).middleName || undefined,
        email: client.email,
        phone: client.phone,
        address: client.address,
        addressLine2: (client as { addressLine2?: string }).addressLine2 || undefined,
        city: client.city,
        state: client.state,
        zipCode: client.zipCode,
        county: (client as { county?: string }).county || undefined,
        driversLicense: client.driversLicense,
        ssn: client.ssn,
        creditScore: client.creditScore,
      },
      cobuyer: (client as { cobuyer?: Record<string, string | number | Date | null | undefined> }).cobuyer || undefined,
      vehicle: {
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        trim: vehicle.trim,
        body: vehicle.bodyType,
        mileage: vehicle.mileage,
        price: vehicle.price,
        stock: vehicle.stock,
        exteriorColor: vehicle.exteriorColor,
        interiorColor: vehicle.interiorColor,
        transmission: vehicle.transmission,
        engine: vehicle.engine,
        fuelType: vehicle.fuelType,
        doors: (vehicle as { doors?: number }).doors || undefined,
        titleNumber: (vehicle as { titleNumber?: string }).titleNumber || undefined,
      },
      deal: {
        saleDate: deal.saleDate,
        saleAmount: deal.saleAmount,
        salesTax: deal.salesTax,
        docFee: deal.docFee,
        tradeInValue: deal.tradeInValue,
        downPayment: deal.downPayment,
        financedAmount: deal.financedAmount,
        totalAmount: deal.totalAmount,
        type: deal.type,
        // Additional deal data from dealData field
        ...((deal as { dealData?: Record<string, string | number | Date | null | undefined> }).dealData || {}),
      },
      dealership: {
        name: dealership.name,
        address: dealership.address,
        city: dealership.city,
        state: dealership.state,
        zipCode: dealership.zipCode,
        phone: dealership.phone,
        email: dealership.email,
        representative: (dealership as { representative?: string }).representative || undefined,
        representativeTitle: (dealership as { representativeTitle?: string }).representativeTitle || undefined,
        dealerLicense: (dealership as { dealerLicense?: string }).dealerLicense || undefined,
        taxId: dealership.taxId,
      },
      insurance: (client as { insurance?: Record<string, string | number | Date | null | undefined> }).insurance || undefined,
      lienHolder: (client as { lienHolder?: Record<string, string | number | Date | null | undefined> }).lienHolder || undefined,
    };

    return dealData;
  },
});

/**
 * Generate a single document from a template
 * INTERNAL - called by generateDealDocuments
 */
export const generateSingleDocument = action({
  args: {
    dealId: v.id("deals"),
    templateId: v.id("documentTemplates"),
    dealData: v.object({
      client: v.any(),
      cobuyer: v.optional(v.any()),
      vehicle: v.any(),
      deal: v.any(),
      dealership: v.any(),
      insurance: v.optional(v.any()),
      lienHolder: v.optional(v.any()),
    }),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; documentId?: string; error?: string }> => {
    // Get template
    const template = await ctx.runQuery(api.documents.templates.getTemplateById, {
      templateId: args.templateId,
    });

    if (!template) {
      throw new Error("Template not found");
    }

    // Get deal
    const deal = await ctx.runQuery(api.deals.getDeal, {
      dealId: args.dealId,
    });

    if (!deal) {
      throw new Error("Deal not found");
    }

    // Prepare PDF data using field mappings
    const preparedData = preparePdfData(
      template.fieldMappings || [],
      args.dealData as DealData
    );

    // Check for validation errors
    if (preparedData.validationErrors.length > 0) {
      console.warn(
        `Validation warnings for template ${template.name}:`,
        preparedData.validationErrors
      );
    }

    // Create document instance
    const documentId: { documentId: string } = await ctx.runMutation(
      api.documents.generator.createDocumentInstance,
      {
        dealershipId: deal.dealershipId as Id<"dealerships">,
        templateId: args.templateId,
        dealId: args.dealId,
        data: args.dealData,
      }
    );

    // Get template PDF download URL
    const templateUrl = await generateDownloadUrl(template.s3Key, 300);

    // Download template PDF
    const response = await fetch(templateUrl);
    if (!response.ok) {
      throw new Error("Failed to download template PDF");
    }

    const templateBuffer = await response.arrayBuffer();

    // Fill PDF with prepared data
    const filledPdfBuffer = await fillPdfWithMappedData(
      templateBuffer,
      preparedData.fields
    );

    // Generate S3 key for filled document
    const orgId = (deal as { orgId?: Id<"orgs"> }).orgId || (deal.dealershipId as unknown as Id<"dealerships">);
    const s3Key = `org/${orgId}/deals/${args.dealId}/documents/${documentId.documentId}.pdf`;

    // Log S3 key generation
    console.log("Generated S3 key (deal_generator):", s3Key);
    console.log("S3 key length:", s3Key.length);
    console.log("S3 key ends with .pdf:", s3Key.endsWith('.pdf'));

    // Get upload URL
    const uploadUrl = await generateUploadUrl(
      s3Key,
      "application/pdf",
      300
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

    // Get required signatures from field mappings
    const requiredSignatures = getRequiredSignatures(template.fieldMappings || []);

    // Update document instance with generated PDF info
    await ctx.runMutation(api.documents.deal_generator.updateDocumentWithGeneration, {
      documentId: documentId.documentId as Id<"documentInstances">,
      s3Key,
      fileSize: filledPdfBuffer.byteLength,
      documentType: template.category,
      name: `${template.name} - Client`,
      requiredSignatures,
    });

    return {
      success: true,
      documentId: documentId.documentId,
    };
  },
});

/**
 * Fill PDF using mapped field data
 */
async function fillPdfWithMappedData(
  templateBuffer: ArrayBuffer,
  fields: Array<{ pdfFieldName: string; value: string; skipped: boolean }>
): Promise<ArrayBuffer> {
  // Load PDF document
  const pdfDoc = await PDFDocument.load(templateBuffer);
  const form = pdfDoc.getForm();

  let filledCount = 0;
  let skippedCount = 0;

  // Fill each field
  for (const field of fields) {
    if (field.skipped) {
      skippedCount++;
      continue;
    }

    try {
      // Get the PDF form field
      const pdfField = form.getField(field.pdfFieldName);

      // Get field type
      const fieldType = pdfField.constructor.name;

      // Fill based on type
      if (fieldType === "PDFTextField") {
        (pdfField as PDFTextField).setText(field.value);
        filledCount++;
      } else if (fieldType === "PDFCheckBox") {
        const checked = field.value === "true" || field.value === "yes" || field.value === "1";
        if (checked) {
          (pdfField as PDFCheckBox).check();
        } else {
          (pdfField as PDFCheckBox).uncheck();
        }
        filledCount++;
      }
      // Add other field types as needed
    } catch (fieldError) {
      console.error(`Error filling field ${field.pdfFieldName}:`, fieldError);
      skippedCount++;
    }
  }

  console.log(`PDF filled: ${filledCount} fields filled, ${skippedCount} skipped`);

  // DON'T flatten form - keep fields editable for later editing
  // form.flatten(); // Commented out to preserve form fields

  // Save and return
  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
}

/**
 * Update document instance after generation
 * INTERNAL
 */
export const updateDocumentWithGeneration = mutation({
  args: {
    documentId: v.id("documentInstances"),
    s3Key: v.string(),
    fileSize: v.number(),
    documentType: v.string(),
    name: v.string(),
    requiredSignatures: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Log S3 key before storing
    console.log("Storing S3 key (deal_generator):", args.s3Key);
    console.log("S3 key length:", args.s3Key.length);
    console.log("S3 key ends with .pdf:", args.s3Key.endsWith('.pdf'));

    await ctx.db.patch(args.documentId, {
      status: "READY",
      s3Key: args.s3Key.trim(), // Add trim() to remove any whitespace
      fileSize: args.fileSize,
      documentType: args.documentType,
      name: args.name,
      updatedAt: Date.now(),
    });

    // Log success
    await ctx.db.insert("security_logs", {
      dealershipId: document.dealershipId,
      action: "document_generated",
      userId: document.audit.createdBy.toString(),
      ipAddress: "server",
      success: true,
      details: `Document generated: ${args.name} (${args.fileSize} bytes)`,
      timestamp: Date.now(),
    });
  },
});

/**
 * Log template generation error
 * INTERNAL
 */
export const logTemplateError = mutation({
  args: {
    dealId: v.id("deals"),
    templateId: v.id("documentTemplates"),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      return;
    }

    const template = await ctx.db.get(args.templateId);

    await ctx.db.insert("security_logs", {
      dealershipId: deal.dealershipId as Id<"dealerships">,
      action: "document_generation_failed",
      userId: "system",
      ipAddress: "server",
      success: false,
      details: `Template ${template?.name || args.templateId}: ${args.error}`,
      timestamp: Date.now(),
      severity: "high",
    });
  },
});

/**
 * Get generation status for a deal
 * Checks both documentInstances (new system) and document_packs (legacy system)
 */
export const getDealGenerationStatus = query({
  args: {
    dealId: v.id("deals"),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user to verify dealership access
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get deal to verify access
    const deal = await ctx.db.get(args.dealId);
    if (!deal) {
      throw new Error("Deal not found");
    }

    // Verify user has access to this dealership
    if (user.dealershipId !== deal.dealershipId) {
      throw new Error("Access denied: Deal belongs to different dealership");
    }

    // Query documentInstances (new system)
    const documentInstances = await ctx.db
      .query("documentInstances")
      .withIndex("by_deal", (q) => q.eq("dealId", args.dealId))
      .collect();

    // Also check document_packs (legacy system) for backward compatibility
    const documentPack = await ctx.db
      .query("document_packs")
      .withIndex("by_deal", (q) => q.eq("dealId", args.dealId))
      .first();

    // Count documents from both systems
    let total = documentInstances.length;
    let ready = documentInstances.filter((d) => d.status === "READY").length;
    let signed = documentInstances.filter((d) => d.status === "SIGNED").length;
    let draft = documentInstances.filter((d) => d.status === "DRAFT").length;
    let voided = documentInstances.filter((d) => d.status === "VOID").length;

    // If we have a document pack but no instances, count from the pack
    if (documentPack && documentInstances.length === 0) {
      const packDocuments = documentPack.documents || [];
      total = packDocuments.length;
      ready = packDocuments.filter((d) => d.status === "generated" || d.status === "ready").length;
      signed = packDocuments.filter((d) => d.status === "signed").length;
      draft = packDocuments.filter((d) => d.status === "pending" || d.status === "draft").length;
      voided = packDocuments.filter((d) => d.status === "void" || d.status === "voided").length;
    }

    return {
      total,
      ready,
      signed,
      draft,
      voided,
      inProgress: total > 0 && ready < total && draft > 0,
      allReady: total > 0 && ready === total,
      allSigned: total > 0 && signed === total,
    };
  },
});

