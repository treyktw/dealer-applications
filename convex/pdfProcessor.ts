// convex/pdfProcessor.ts - Complete implementation

import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  rgb,
  StandardFonts,
} from "pdf-lib";

// Generate prefilled PDF from template
export const generatePrefillPDF = action({
  args: {
    packId: v.id("document_packs"),
    documentIndex: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all necessary data
    const pack = await ctx.runQuery(api.documentPacks.getPackById, {
      packId: args.packId,
    });

    const document = pack.documents[args.documentIndex];
    const template = await ctx.runQuery(api.pdfTemplates.getTemplateById, {
      templateId: document.templateId,
    });

    const deal = await ctx.runQuery(api.deals.getDeal, {
      dealId: pack.dealId,
    });

    const dealership = await ctx.runQuery(api.dealerships.getDealershipById, {
      dealershipId: pack.dealershipId,
    });

    // Download template PDF
    const response = await fetch(template.blankPdfUrl);
    const templatePdfBytes = await response.arrayBuffer();

    // Merge all data
    const mergedData = mergeAllData(pack, deal, dealership);

    // Load PDF with error recovery
    const { PDFDocument } = await import('pdf-lib');
    
    let pdfDoc;
    let form;
    let canUseForm = false;
    
    try {
      // Try to load with form support but ignore errors
      pdfDoc = await PDFDocument.load(templatePdfBytes, {
        ignoreEncryption: true,
        throwOnInvalidObject: false, // Don't throw on invalid objects
        updateMetadata: false,
      });
      
      // Try to get the form
      try {
        form = pdfDoc.getForm();
        const fields = form.getFields();
        canUseForm = fields.length > 0;
        console.log(`Form loaded with ${fields.length} fields`);
      } catch (formError) {
        console.log("Cannot access form, will skip form filling");
        canUseForm = false;
      }
    } catch (loadError) {
      console.error("PDF load error:", loadError);
      throw new Error("Cannot process this PDF file");
    }

    // Map field names to data - based on the actual GA Bill of Sale fields
    const fieldMappings = {
      // Vehicle Information
      'VIN': mergedData.vehicle?.vin || '',
      'Year': String(mergedData.vehicle?.year || ''),
      'Make': mergedData.vehicle?.make || '',
      'Model': mergedData.vehicle?.model || '',
      'Odometer Reading': String(mergedData.vehicle?.mileage || ''),
      'MM': String(new Date(mergedData.deal?.saleDate || Date.now()).getMonth() + 1).padStart(2, '0'),
      'DD': String(new Date(mergedData.deal?.saleDate || Date.now()).getDate()).padStart(2, '0'),
      'YY': String(new Date(mergedData.deal?.saleDate || Date.now()).getFullYear()).slice(-2),
      'Purchase Price': String(mergedData.deal?.saleAmount || mergedData.deal?.totalAmount || ''),
      
      // Seller Information (Dealership)
      'Georgia Tax ID No': mergedData.dealership?.taxId || '',
      'Georgia Sales Tax No': '', // Add if available
      'SellersTransferors.0': mergedData.dealership?.name || '',
      'Street No': mergedData.dealership?.address?.split(' ')[0] || '',
      'Street Name': mergedData.dealership?.address?.split(' ').slice(1).join(' ') || mergedData.dealership?.address || '',
      'City': mergedData.dealership?.city || '',
      'State': mergedData.dealership?.state || '',
      'ZIP Code': mergedData.dealership?.zipCode || '',
      'County': mergedData.dealership?.county || '',
      
      // Purchaser Information
      'PurchasersTransferees.0': mergedData.buyer?.fullName || '',
      'Street No_2': mergedData.buyer?.address?.split(' ')[0] || '',
      'Street Name_2': mergedData.buyer?.address?.split(' ').slice(1).join(' ') || mergedData.buyer?.address || '',
      'City_2': mergedData.buyer?.city || '',
      'State_2': mergedData.buyer?.state || '',
      'ZIP Code_2': mergedData.buyer?.zip || '',
      // 'County_2': mergedData.buyer?.county || '',
      
      // // Lienholder (if applicable)
      // 'Lienholders or Security': mergedData.lienholder?.name || '',
      // 'City_3': mergedData.lienholder?.city || '',
      // 'State_3': mergedData.lienholder?.state || '',
      // 'ZIP Code_3': mergedData.lienholder?.zip || '',
      // 'Telephone No': mergedData.lienholder?.phone || '',
    };

    // If form is accessible, try to fill it
    if (canUseForm && form) {
      for (const [fieldName, value] of Object.entries(fieldMappings)) {
        if (value) {
          try {
            const field = form.getTextField(fieldName);
            field.setText(String(value));
            console.log(`Filled field ${fieldName} with value: ${value}`);
          } catch (fieldError) {
            // Field might not exist or be a different type
            console.warn(`Could not fill field ${fieldName}:`, fieldError instanceof Error ? fieldError.message : String(fieldError));
          }
        } 
      }
    } else {
      console.log("Form not accessible, saving PDF without modifications");
    }

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    
    // Store in Convex storage
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
    const storageId = await ctx.storage.store(blob);
    const downloadUrl = await ctx.storage.getUrl(storageId);

    // Calculate SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', new Uint8Array(pdfBytes));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Update document record
    await ctx.runMutation(internal.pdfProcessor.updateDocumentGenerated, {
      packId: args.packId,
      documentIndex: args.documentIndex,
      generatedPdfUrl: downloadUrl ?? '',
      generatedPdfSha256: hashHex,
      fieldData: mergedData,
    });

    // Log audit
    await ctx.runMutation(internal.pdfProcessor.logDocumentAudit, {
      documentPackId: args.packId,
      dealId: pack.dealId,
      dealershipId: pack.dealershipId,
      action: "generated",
      documentType: document.templateType,
      fileName: `bill-of-sale-${Date.now()}.pdf`,
      fileSha256: hashHex,
      fileSize: pdfBytes.byteLength,
    });

    return {
      success: true,
      downloadUrl,
      sha256: hashHex,
      expiresIn: 900,
      message: canUseForm ? "PDF filled successfully" : "PDF saved (form fields not accessible)"
    };
  },
});

// // Helper function
// function formatDate(timestamp: any): string {
//   if (!timestamp) return '';
//   const date = new Date(timestamp);
//   return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
// }

// Generate all documents in a pack
export const generateAllDocuments = action({
  args: {
    packId: v.id("document_packs"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    results: Array<{
      index: number;
      success: boolean;
      downloadUrl?: string;
      sha256?: string;
      expiresIn?: number;
      error?: string;
    }>;
  }> => {
    const pack = await ctx.runQuery(api.documentPacks.getPackById, {
      packId: args.packId,
    });

    // Validate pack data first
    const validation = await ctx.runQuery(api.documentPacks.validatePackData, {
      packId: args.packId,
    });

    if (!validation.valid) {
      throw new Error(
        `Pack validation failed: ${validation.errors?.map((e: any) => e.message).join(", ")}`
      );
    }

    const results = [];

    for (let i = 0; i < pack.documents.length; i++) {
      try {
        const result = await ctx.runAction(
          api.pdfProcessor.generatePrefillPDF,
          {
            packId: args.packId,
            documentIndex: i,
          }
        );
        results.push({
          index: i,
          success: result.success,
          downloadUrl: result.downloadUrl ?? undefined,
          sha256: result.sha256,
          expiresIn: result.expiresIn,
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Update pack status
    await ctx.runMutation(internal.pdfProcessor.updatePackStatus, {
      packId: args.packId,
      status: "generated",
    });

    return { results };
  },
});

// Helper functions
function mergeAllData(pack: any, deal: any, dealership: any) {
  const primaryBuyer = pack.buyers.find((b: any) => b.buyerType === "primary") || pack.buyers[0];
  const coBuyer = pack.buyers.find((b: any) => b.buyerType === "co_buyer");
  
  // Parse sale date
  const saleDate = new Date(deal.saleDate || Date.now());
  
  // Parse addresses into street number and name
  const parseAddress = (address: string) => {
    if (!address) return { streetNumber: '', streetName: '' };
    const parts = address.split(' ');
    return {
      streetNumber: parts[0] || '',
      streetName: parts.slice(1).join(' ') || address,
    };
  };

  const dealershipAddress = parseAddress(dealership?.address || '');
  const buyerAddress = parseAddress(primaryBuyer?.address?.street || '');

  return {
    // Vehicle data
    vehicle: {
      vin: deal.vehicle?.vin || deal.vin || "",
      year: String(deal.vehicle?.year || ""),
      make: deal.vehicle?.make || "",
      model: deal.vehicle?.model || "",
      mileage: String(deal.vehicle?.mileage || ""),
      stock: deal.vehicle?.stock || deal.stockNumber || "",
    },
    
    // Deal data with split date
    deal: {
      saleDate: deal.saleDate || Date.now(),
      saleDateMonth: String(saleDate.getMonth() + 1).padStart(2, '0'),
      saleDateDay: String(saleDate.getDate()).padStart(2, '0'),
      saleDateYear: String(saleDate.getFullYear()).slice(-2),
      saleAmount: String(deal.saleAmount || deal.totalAmount || 0),
      purchasePrice: String(deal.saleAmount || deal.totalAmount || 0),
      salesTax: String(deal.salesTax || 0),
      docFee: String(deal.docFee || 0),
      totalAmount: String(deal.totalAmount || 0),
    },
    
    // Dealership data with split address
    dealership: {
      name: dealership?.name || '',
      streetNumber: dealershipAddress.streetNumber,
      streetName: dealershipAddress.streetName,
      address: dealership?.address || '',
      city: dealership?.city || '',
      state: dealership?.state || '',
      zipCode: dealership?.zipCode || '',
      county: dealership?.county || '',
      phone: dealership?.phone || '',
      taxId: dealership?.taxId || '',
      salesTaxNumber: dealership?.salesTaxNumber || '',
      ...pack.dealershipInfo,
    },
    
    // Buyer data with split address
    buyer: primaryBuyer ? {
      fullName: `${primaryBuyer.firstName} ${primaryBuyer.middleName || ''} ${primaryBuyer.lastName}`.trim(),
      firstName: primaryBuyer.firstName,
      lastName: primaryBuyer.lastName,
      streetNumber: buyerAddress.streetNumber,
      streetName: buyerAddress.streetName,
      apt: primaryBuyer.address?.apt || '',
      address: `${primaryBuyer.address?.street} ${primaryBuyer.address?.apt || ''}`.trim(),
      city: primaryBuyer.address?.city || '',
      state: primaryBuyer.address?.state || '',
      zip: primaryBuyer.address?.zipCode || '',
      county: primaryBuyer.address?.county || '',
      email: primaryBuyer.email,
      phone: primaryBuyer.phone,
      dlNumber: primaryBuyer.dlNumber,
      dlState: primaryBuyer.dlState,
    } : {},
    
    // Co-buyer data
    coBuyer: coBuyer ? {
      fullName: `${coBuyer.firstName} ${coBuyer.middleName || ''} ${coBuyer.lastName}`.trim(),
      // ... similar fields
    } : {},
  };
}

function getValueFromPath(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    // Handle array notation like buyers[0]
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = current?.[key]?.[parseInt(index)];
    } else {
      current = current?.[part];
    }

    if (current === undefined) return undefined;
  }

  return current;
}

function applyTransform(value: any, transform?: string): any {
  if (!transform) return value;

  const transforms = transform.split("|");
  let result = value;

  for (const t of transforms) {
    const [fn, ...args] = t.split(":");

    switch (fn) {
      case "uppercase":
        result = String(result).toUpperCase();
        break;
      case "lowercase":
        result = String(result).toLowerCase();
        break;
      case "date":
        result = formatDate(result, args[0]);
        break;
      case "currency":
        result = formatCurrency(result);
        break;
      case "phone":
        result = formatPhone(result);
        break;
      case "ssn_mask":
        result = maskSSN(result);
        break;
      case "bool_to_checkbox":
        result = result ? args[0] || "Yes" : "";
        break;
    }
  }

  return result;
}

function formatDate(value: any, format = "MM/DD/YYYY"): string {
  const date = new Date(value);
  if (isNaN(date.getTime())) return "";

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  return format
    .replace("MM", month)
    .replace("DD", day)
    .replace("YYYY", String(year))
    .replace("YY", String(year).slice(-2));
}

function formatCurrency(value: any): string {
  const num = parseFloat(value);
  if (isNaN(num)) return "";
  return num.toFixed(2);
}

function formatPhone(value: string): string {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.length !== 10) return value;
  return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
}

function maskSSN(value: string): string {
  if (!value || value.length < 4) return value;
  return `XXX-XX-${value.slice(-4)}`;
}

// Internal mutations for updating state
export const getPrefilledUploadUrl = internalMutation({
  args: {
    dealershipId: v.id("dealerships"),
    fileName: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const dealership = await ctx.db.get(args.dealershipId);
    if (!dealership?.s3BucketName) {
      throw new Error("Dealership S3 bucket not configured");
    }

    // This would call your S3 presigned URL generation
    // For now, returning mock data
    return {
      uploadUrl: `https://${dealership.s3BucketName}.s3.amazonaws.com/upload`,
      downloadUrl: `https://${dealership.s3BucketName}.s3.amazonaws.com/${args.fileName}`,
      bucketName: dealership.s3BucketName,
    };
  },
});

export const updateDocumentGenerated = internalMutation({
  args: {
    packId: v.id("document_packs"),
    documentIndex: v.number(),
    generatedPdfUrl: v.string(),
    generatedPdfSha256: v.string(),
    fieldData: v.any(),
  },
  handler: async (ctx, args) => {
    const pack = await ctx.db.get(args.packId);
    if (!pack) throw new Error("Pack not found");

    const documents = [...pack.documents];
    documents[args.documentIndex] = {
      ...documents[args.documentIndex],
      status: "generated",
      generatedAt: Date.now(),
      generatedPdfUrl: args.generatedPdfUrl,
      generatedPdfSha256: args.generatedPdfSha256,
      generatedPdfExpiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      fieldData: args.fieldData,
    };

    await ctx.db.patch(args.packId, {
      documents,
      updatedAt: Date.now(),
    });
  },
});

export const recordSignedDocument = action({
  args: {
    packId: v.id("document_packs"),
    documentIndex: v.number(),
    signedPdfUrl: v.string(),
    signedPdfSha256: v.string(),
  },
  handler: async (ctx, args) => {
    const pack = await ctx.runQuery(api.documentPacks.getPackById, {
      packId: args.packId,
    });

    if (!pack) throw new Error("Pack not found");

    const documents = [...pack.documents];
    documents[args.documentIndex] = {
      ...documents[args.documentIndex],
      status: "uploaded",
      signedAt: Date.now(),
      signedPdfUrl: args.signedPdfUrl,
      signedPdfSha256: args.signedPdfSha256,
      uploadedBy: "user", // TODO: Get actual user ID
    };

    await ctx.runMutation(internal.pdfProcessor.updateDocumentSigned, {
      packId: args.packId,
      documentIndex: args.documentIndex,
      signedPdfUrl: args.signedPdfUrl,
      signedPdfSha256: args.signedPdfSha256,
    });

    return { success: true };
  },
});

export const updateDocumentSigned = internalMutation({
  args: {
    packId: v.id("document_packs"),
    documentIndex: v.number(),
    signedPdfUrl: v.string(),
    signedPdfSha256: v.string(),
  },
  handler: async (ctx, args) => {
    const pack = await ctx.db.get(args.packId);
    if (!pack) throw new Error("Pack not found");

    const documents = [...pack.documents];
    documents[args.documentIndex] = {
      ...documents[args.documentIndex],
      status: "uploaded",
      signedAt: Date.now(),
      signedPdfUrl: args.signedPdfUrl,
      signedPdfSha256: args.signedPdfSha256,
      uploadedBy: "user", // TODO: Get actual user ID
    };

    await ctx.db.patch(args.packId, {
      documents,
      updatedAt: Date.now(),
    });
  },
});

export const updatePackStatus = internalMutation({
  args: {
    packId: v.id("document_packs"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const logDocumentAudit = internalMutation({
  args: {
    documentPackId: v.id("document_packs"),
    dealId: v.id("deals"),
    dealershipId: v.id("dealerships"),
    action: v.string(),
    documentType: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSha256: v.optional(v.string()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const user = identity
      ? await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
          .first()
      : null;

    await ctx.db.insert("document_audit_logs", {
      ...args,
      userId: identity?.subject || "system",
      userName: user?.name || "System",
      userRole: user?.role || "system",
      ipAddress: "server",
      userAgent: undefined,
      details: `Document ${args.action}: ${args.documentType}`,
      timestamp: Date.now(),
    });
  },
});

export const inspectPDFFields = action({
  args: {
    templateId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the template
    const template = await ctx.runQuery(api.pdfTemplates.getTemplateById, {
      templateId: args.templateId,
    });

    if (!template) {
      throw new Error("Template not found");
    }

    // Download the PDF
    const response = await fetch(template.blankPdfUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch template PDF");
    }
    const templatePdfBytes = await response.arrayBuffer();

    // Load with pdf-lib
    const { PDFDocument } = await import("pdf-lib");
    const pdfDoc = await PDFDocument.load(templatePdfBytes, {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    // Check if form exists
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Extract field information
    const fieldInfo = fields.map((field) => ({
      name: field.getName(),
      type: field.constructor.name,
      isReadOnly: field.isReadOnly(),
      isRequired: field.isRequired(),
      isExported: field.isExported(),
    }));

    console.log("PDF has", fields.length, "form fields:");
    console.log(JSON.stringify(fieldInfo, null, 2));

    return {
      fieldCount: fields.length,
      fields: fieldInfo,
    };
  },
});
