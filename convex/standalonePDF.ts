/**
 * Standalone PDF Generation
 * Generates PDFs for standalone users without S3 storage
 * Returns PDF as base64 for local storage in IndexedDB
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { PDFDocument, type PDFTextField, type PDFCheckBox, type PDFDropdown, type PDFRadioGroup } from "pdf-lib";
import { preparePdfData, type FieldMapping, type DealData } from "./lib/pdf_data_preparer";

// Type definitions for document generation results
type DocumentResult = {
  success: boolean;
  documentType?: string;
  base64PDF?: string;
  size?: number;
  filename?: string;
  error?: string;
};

type DocumentPackResult = {
  success: boolean;
  documents: DocumentResult[];
  totalGenerated: number;
  totalFailed: number;
};

/**
 * Generate PDF from deal data
 * Returns base64-encoded PDF for local storage
 */
export const generateDealPDF = action({
  args: {
    userId: v.id("standalone_users"),
    templatePdfBase64: v.string(), // Base64-encoded PDF template with form fields
    fieldMappings: v.array(v.object({
      pdfFieldName: v.string(),
      dataPath: v.string(), // e.g., "client.firstName", "vehicle.vin", "pricing.salePrice"
      transform: v.optional(v.string()), // Optional transform function name
      defaultValue: v.optional(v.string()),
      required: v.boolean(),
      autoMapped: v.boolean(),
    })),
    dealData: v.object({
      id: v.string(),
      type: v.string(),
      client: v.object({
        firstName: v.string(),
        lastName: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        driversLicense: v.optional(v.string()),
      }),
      vehicle: v.object({
        vin: v.string(),
        year: v.number(),
        make: v.string(),
        model: v.string(),
        trim: v.optional(v.string()),
        mileage: v.number(),
        color: v.optional(v.string()),
      }),
      pricing: v.object({
        salePrice: v.number(),
        salesTax: v.optional(v.number()),
        docFee: v.optional(v.number()),
        tradeInValue: v.optional(v.number()),
        downPayment: v.optional(v.number()),
        financedAmount: v.optional(v.number()),
        totalAmount: v.number(),
      }),
      businessInfo: v.optional(v.object({
        name: v.string(),
        address: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
      })),
    }),
    documentType: v.string(), // "bill_of_sale", "buyers_order", etc.
  },
  handler: async (ctx, args) => {
    // Verify user has active subscription
    const user = await ctx.runQuery(api.standaloneAuth.checkSubscription, {
      userId: args.userId,
    });

    if (!user.valid) {
      throw new Error("Active subscription required to generate documents");
    }

    // Convert base64 template to ArrayBuffer
    const templateBuffer = Buffer.from(args.templatePdfBase64, 'base64');

    // Prepare deal data in the format expected by preparePdfData
    const dealDataForMapping: DealData = {
      client: {
        firstName: args.dealData.client.firstName,
        lastName: args.dealData.client.lastName,
        email: args.dealData.client.email,
        phone: args.dealData.client.phone,
        address: args.dealData.client.address,
        city: args.dealData.client.city,
        state: args.dealData.client.state,
        zipCode: args.dealData.client.zipCode,
        driversLicense: args.dealData.client.driversLicense,
      },
      vehicle: {
        vin: args.dealData.vehicle.vin,
        year: args.dealData.vehicle.year,
        make: args.dealData.vehicle.make,
        model: args.dealData.vehicle.model,
        trim: args.dealData.vehicle.trim,
        mileage: args.dealData.vehicle.mileage,
        color: args.dealData.vehicle.color,
      },
      deal: {
        type: args.dealData.type,
        salePrice: args.dealData.pricing.salePrice,
        salesTax: args.dealData.pricing.salesTax,
        docFee: args.dealData.pricing.docFee,
        tradeInValue: args.dealData.pricing.tradeInValue,
        downPayment: args.dealData.pricing.downPayment,
        financedAmount: args.dealData.pricing.financedAmount,
        totalAmount: args.dealData.pricing.totalAmount,
      },
      dealership: args.dealData.businessInfo ? {
        name: args.dealData.businessInfo.name,
        address: args.dealData.businessInfo.address,
        phone: args.dealData.businessInfo.phone,
        email: args.dealData.businessInfo.email,
      } : {},
    };

    // Prepare PDF data using field mappings
    const preparedData = preparePdfData(args.fieldMappings as FieldMapping[], dealDataForMapping);

    // Fill the template PDF with the prepared data
    const filledPdfBuffer = await fillTemplateWithData(
      templateBuffer.buffer,
      preparedData.fields
    );

    // Convert filled PDF to base64
    const base64PDF = Buffer.from(filledPdfBuffer).toString('base64');

    return {
      success: true,
      documentType: args.documentType,
      base64PDF,
      size: filledPdfBuffer.byteLength,
      filename: `${args.documentType}_${args.dealData.id}_${Date.now()}.pdf`,
      fieldsFilled: preparedData.fields.filter(f => !f.skipped).length,
      fieldsSkipped: preparedData.fields.filter(f => f.skipped).length,
      validationErrors: preparedData.validationErrors,
    };
  },
});

/**
 * Fill PDF template with prepared field data
 * Uses pdf-lib to fill form fields in the template
 */
async function fillTemplateWithData(
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
      } else if (fieldType === "PDFDropdown") {
        (pdfField as PDFDropdown).select(field.value);
        filledCount++;
      } else if (fieldType === "PDFRadioGroup") {
        (pdfField as PDFRadioGroup).select(field.value);
        filledCount++;
      }
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
 * Batch generate multiple documents for a deal
 */
export const generateDealDocumentPack = action({
  args: {
    userId: v.id("standalone_users"),
    dealData: v.object({
      id: v.string(),
      type: v.string(),
      client: v.object({
        firstName: v.string(),
        lastName: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        driversLicense: v.optional(v.string()),
      }),
      vehicle: v.object({
        vin: v.string(),
        year: v.number(),
        make: v.string(),
        model: v.string(),
        trim: v.optional(v.string()),
        mileage: v.number(),
        color: v.optional(v.string()),
      }),
      pricing: v.object({
        salePrice: v.number(),
        salesTax: v.optional(v.number()),
        docFee: v.optional(v.number()),
        tradeInValue: v.optional(v.number()),
        downPayment: v.optional(v.number()),
        financedAmount: v.optional(v.number()),
        totalAmount: v.number(),
      }),
      businessInfo: v.optional(v.object({
        name: v.string(),
        address: v.optional(v.string()),
        phone: v.optional(v.string()),
        email: v.optional(v.string()),
      })),
    }),
    documents: v.array(v.object({
      documentType: v.string(),
      templatePdfBase64: v.string(),
      fieldMappings: v.array(v.object({
        pdfFieldName: v.string(),
        dataPath: v.string(),
        transform: v.optional(v.string()),
        defaultValue: v.optional(v.string()),
        required: v.boolean(),
        autoMapped: v.boolean(),
      })),
    })),
  },
  handler: async (ctx, args): Promise<DocumentPackResult> => {
    const documents: DocumentResult[] = [];

    for (const doc of args.documents) {
      try {
        const result = await ctx.runAction(api.standalonePDF.generateDealPDF, {
          userId: args.userId,
          dealData: args.dealData,
          documentType: doc.documentType,
          templatePdfBase64: doc.templatePdfBase64,
          fieldMappings: doc.fieldMappings,
        });

        documents.push(result);
      } catch (error) {
        console.error(`Failed to generate ${doc.documentType}:`, error);
        documents.push({
          success: false,
          documentType: doc.documentType,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: true,
      documents,
      totalGenerated: documents.filter(d => d.success).length,
      totalFailed: documents.filter(d => !d.success).length,
    };
  },
});
