/**
 * Document Generation Helper
 * Utilities for automatically generating documents for deals
 */

import { convexAction } from "@/lib/convex";
import { api } from "@dealer/convex";
import {
  getDefaultTemplateByCategory,
  loadDefaultTemplateAsBase64,
  mapDocumentTypeToCategory,
} from "@/lib/default-templates";
import {
  createDocument,
  base64ToBlob,
} from "@/lib/sqlite/local-documents-service";
import type { LocalDeal } from "@/lib/sqlite/local-deals-service";
import type { LocalClient } from "@/lib/sqlite/local-clients-service";
import type { LocalVehicle } from "@/lib/sqlite/local-vehicles-service";

export interface GenerateDocumentParams {
  dealId: string;
  documentType: string;
  deal: LocalDeal;
  client: LocalClient;
  vehicle: LocalVehicle;
  userId: string;
  userEmail?: string;
  userName?: string;
}

/**
 * Generate a single document for a deal
 */
export async function generateDocumentForDeal({
  dealId,
  documentType,
  deal,
  client,
  vehicle,
  userId,
  userEmail,
  userName,
}: GenerateDocumentParams): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    // Get default template for this document type
    const category = mapDocumentTypeToCategory(documentType);
    const template = getDefaultTemplateByCategory(category);

    if (!template) {
      console.warn(`⚠️ [DOC-GEN] No default template for ${documentType}, skipping`);
      return { success: false, error: `No template available for ${documentType}` };
    }

    // Load template as base64
    const templateBase64 = await loadDefaultTemplateAsBase64(template);

    // Prepare deal data for API
    const dealDataForAPI = {
      id: deal.id,
      type: deal.type || "retail",
      client: {
        firstName: client.first_name || "",
        lastName: client.last_name || "",
        email: client.email || undefined,
        phone: client.phone || undefined,
        address: client.address || undefined,
        city: client.city || undefined,
        state: client.state || undefined,
        zipCode: client.zip_code || undefined,
        driversLicense: client.drivers_license || undefined,
      },
      cobuyer: deal.cobuyer_data ? {
        firstName: deal.cobuyer_data.firstName || "",
        lastName: deal.cobuyer_data.lastName || "",
        email: deal.cobuyer_data.email || undefined,
        phone: deal.cobuyer_data.phone || undefined,
        address: deal.cobuyer_data.address || undefined,
        addressLine2: deal.cobuyer_data.addressLine2 || undefined,
        city: deal.cobuyer_data.city || undefined,
        state: deal.cobuyer_data.state || undefined,
        zipCode: deal.cobuyer_data.zipCode || undefined,
        driversLicense: deal.cobuyer_data.driversLicense || undefined,
      } : undefined,
      vehicle: {
        vin: vehicle.vin || "",
        year: vehicle.year || 0,
        make: vehicle.make || "",
        model: vehicle.model || "",
        trim: vehicle.trim || undefined,
        body: vehicle.body || undefined,
        doors: vehicle.doors ?? undefined,
        transmission: vehicle.transmission || undefined,
        engine: vehicle.engine || undefined,
        cylinders: vehicle.cylinders ?? undefined,
        titleNumber: vehicle.title_number || undefined,
        mileage: vehicle.mileage || 0,
        color: vehicle.color || undefined,
      },
      pricing: {
        salePrice: deal.sale_amount || 0,
        salesTax: deal.sales_tax ?? undefined,
        docFee: deal.doc_fee ?? undefined,
        tradeInValue: deal.trade_in_value ?? undefined,
        downPayment: deal.down_payment ?? undefined,
        financedAmount: deal.financed_amount ?? undefined,
        totalAmount: deal.total_amount || 0,
      },
      businessInfo: {
        name: userName || "Dealership",
        email: userEmail || undefined,
      },
    };

    // Generate PDF with Convex
    const result = await convexAction(api.api.standalonePDF.generateDealPDF, {
      userId: userId as any,
      templatePdfBase64: templateBase64,
      dealData: dealDataForAPI as any,
      documentType,
    });

    if (!result.success || !result.base64PDF) {
      const errorMsg = result.validationErrors?.length
        ? `Validation errors: ${result.validationErrors.map((e: any) => e.error || `${e.pdfFieldName}: ${e.dataPath}` || String(e)).join(", ")}`
        : "Failed to generate document";
      return { success: false, error: errorMsg };
    }

    // Convert base64 to Blob
    const pdfBlob = base64ToBlob(result.base64PDF);

    // Save document to disk and database
    const clientFirstName = client.first_name || "unknown";
    const documentName = result.filename || `${documentType}_${Date.now()}.pdf`;
    const savedDocument = await createDocument(
      {
        deal_id: dealId,
        type: documentType,
        filename: documentName,
        file_path: "", // Will be set by createDocument
      },
      pdfBlob,
      clientFirstName
    );

    return { success: true, documentId: savedDocument.id };
  } catch (error) {
    console.error(`❌ [DOC-GEN] Error generating ${documentType}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate multiple documents for a deal
 */
export async function generateDocumentsForDeal(
  documentTypes: string[],
  params: GenerateDocumentParams
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const documentType of documentTypes) {
    const result = await generateDocumentForDeal({
      ...params,
      documentType,
    });

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push(`${documentType}: ${result.error || "Unknown error"}`);
    }
  }

  return results;
}

