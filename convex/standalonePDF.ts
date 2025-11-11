/**
 * Standalone PDF Generation
 * Generates PDFs for standalone users without S3 storage
 * Returns PDF as base64 for local storage in IndexedDB
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from "pdf-lib";
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

type ExtractedPDFField = {
  pdfFieldName: string;
  type: "text" | "checkbox" | "dropdown" | "radio";
};

/**
 * Extract PDF form fields from a base64-encoded PDF template
 */
export const extractPDFFields = action({
  args: {
    templatePdfBase64: v.string(),
  },
  handler: async (_ctx, args): Promise<{ fields: ExtractedPDFField[] }> => {
    // Convert base64 to ArrayBuffer
    const base64String = atob(args.templatePdfBase64);
    const bytes = new Uint8Array(base64String.length);
    for (let i = 0; i < base64String.length; i++) {
      bytes[i] = base64String.charCodeAt(i);
    }
    const pdfBuffer = bytes.buffer;

    // Extract fields
    const fields = await extractPDFFormFields(pdfBuffer);
    
    return { fields };
  },
});

/**
 * Extract form fields from PDF buffer
 */
async function extractPDFFormFields(pdfBuffer: ArrayBuffer): Promise<ExtractedPDFField[]> {
  const fields: ExtractedPDFField[] = [];

  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    const formFields = form.getFields();

    console.log(`Found ${formFields.length} form fields in PDF`);

    for (const field of formFields) {
      try {
        const fieldName = field.getName();
        
        if (!fieldName || fieldName.trim() === '') {
          continue;
        }

        let fieldType: ExtractedPDFField["type"] = "text";
        if (field instanceof PDFTextField) {
          fieldType = "text";
        } else if (field instanceof PDFCheckBox) {
          fieldType = "checkbox";
        } else if (field instanceof PDFDropdown) {
          fieldType = "dropdown";
        } else if (field instanceof PDFRadioGroup) {
          fieldType = "radio";
        }

        fields.push({
          pdfFieldName: fieldName,
          type: fieldType,
        });

        console.log(`Extracted field: ${fieldName} (${fieldType})`);
      } catch (fieldError) {
        console.error(`Error processing field:`, fieldError);
      }
    }

    return fields;
  } catch (error) {
    console.error('Error extracting PDF fields:', error);
    throw new Error(`Failed to extract PDF fields: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Auto-map PDF field names to deal data paths
 * Intelligently matches field names to data schema
 */
function autoMapPDFFields(pdfFields: ExtractedPDFField[]): FieldMapping[] {
  const mappings: FieldMapping[] = [];

  // Enhanced data schema with aliases (simplified version of web app's schema)
  // Order matters: more specific aliases should come first for better matching
  const dataSchema: Record<string, Array<{ value: string; aliases: string[]; strictMatch?: boolean }>> = {
    client: [
      { value: "client.firstName", aliases: ["firstname1", "first_name1", "buyerfirstname", "buyer_firstname", "firstname", "fname", "first_name", "given_name"] },
      { value: "client.lastName", aliases: ["lastname1", "last_name1", "buyerlastname", "buyer_lastname", "lastname", "lname", "last_name", "surname", "family_name"] },
      { value: "client.email", aliases: ["email1", "email_1", "buyeremail", "buyer_email", "email", "email_address", "e_mail"] },
      { value: "client.phone", aliases: ["phone1", "phone_1", "phone1_1", "buyerphone", "buyer_phone"], strictMatch: true }, // Strict: no generic "phone" alias
      { value: "client.address", aliases: ["address1", "address_1", "addressline1", "address_line1", "address line 1", "address line1", "buyeraddress", "buyer_address", "address", "street", "address_line", "street_address"] },
      { value: "client.addressLine2", aliases: ["addressline2", "address line 2", "address line2", "address_line2", "address2", "address_2"] },
      { value: "client.city", aliases: ["city1", "city_1", "buyercity", "buyer_city", "city", "town", "municipality"] },
      { value: "client.state", aliases: ["state1", "state_1", "buyerstate", "buyer_state", "state", "province", "region"] },
      { value: "client.zipCode", aliases: ["zip1", "zip_1", "buyerzip", "buyerzipcode", "buyer_zip", "buyer_zipcode", "zip", "zipcode", "zip_code", "postal", "postal_code"] },
      { value: "client.driversLicense", aliases: ["license1", "license_1", "driverslicense", "license", "dl", "drivers_license", "driver_license", "license_number"] },
    ],
    cobuyer: [
      { value: "cobuyer.firstName", aliases: ["firstname2", "first_name2", "buyerfirstname2", "buyer_firstname2", "cofirstname", "cobuyer_firstname"] },
      { value: "cobuyer.lastName", aliases: ["lastname2", "last_name2", "buyerlastname2", "buyer_lastname2", "colastname", "cobuyer_lastname"] },
      { value: "cobuyer.email", aliases: ["email2", "email_2", "buyeremail2", "buyer_email2", "coemail", "cobuyer_email"] },
      { value: "cobuyer.phone", aliases: ["phone2", "phone_2", "phone2_1", "phone2_2", "buyerphone2", "buyer_phone2", "cophone", "cobuyer_phone"], strictMatch: true }, // Strict: no generic "phone" alias
      { value: "cobuyer.address", aliases: ["addressline12", "address_line1_2", "address line 1 2", "buyeraddress2", "buyer_address2", "coaddress", "cobuyer_address", "address2", "address_2"] },
      { value: "cobuyer.addressLine2", aliases: ["address_line2_2", "address line 2 2", "address2_2", "coaddress2", "coaddress_line2"] },
      { value: "cobuyer.city", aliases: ["city2", "city_2", "buyercity2", "buyer_city2", "cocity", "cobuyer_city"] },
      { value: "cobuyer.state", aliases: ["state2", "state_2", "buyerstate2", "buyer_state2", "costate", "cobuyer_state"] },
      { value: "cobuyer.zipCode", aliases: ["zip2", "zip_2", "zipcode2", "buyerzip2", "buyer_zip2", "cozip", "cobuyer_zip"] },
      { value: "cobuyer.driversLicense", aliases: ["license2", "license_2", "driverslicense2", "colicense", "cobuyer_license"] },
    ],
    vehicle: [
      { value: "vehicle.vin", aliases: ["vin", "vehicle_vin", "vvin", "serial", "serial_number"], strictMatch: true }, // Strict: must explicitly contain VIN/serial
      { value: "vehicle.year", aliases: ["year", "vyear", "vehicle_year", "model_year"] },
      { value: "vehicle.make", aliases: ["make", "vmake", "vehicle_make", "manufacturer", "brand"] },
      { value: "vehicle.model", aliases: ["car_model", "vehicle_model_name", "model_name", "vmodel", "vehicle_model"], strictMatch: true }, // Strict: must NOT contain VIN/serial
      { value: "vehicle.trim", aliases: ["trim", "vtrim", "vehicle_trim", "series"] },
      { value: "vehicle.body", aliases: ["body", "vbody", "body_style", "style", "bodytype", "body_type"] },
      { value: "vehicle.doors", aliases: ["doors", "vdoors", "door_count", "num_doors", "number_of_doors"] },
      { value: "vehicle.transmission", aliases: ["transmission", "vtransmission", "trans"] },
      { value: "vehicle.engine", aliases: ["engine", "vengine", "motor"] },
      { value: "vehicle.cylinders", aliases: ["cylinders", "cylinder", "cyl", "vcyl"] },
      { value: "vehicle.titleNumber", aliases: ["title", "title_number", "vtitlenumber", "title_no", "title_number"] },
      { value: "vehicle.mileage", aliases: ["mileage", "vmileage", "odometer", "odo", "vodo", "miles"] },
      { value: "vehicle.color", aliases: ["color", "exterior_color", "vcolor", "ext_color"] },
      { value: "vehicle.stockNumber", aliases: ["stock", "stock_no", "stock_number", "stockno", "inventory_no", "stocknumber"] },
    ],
    deal: [
      { value: "deal.salePrice", aliases: ["saleprice", "sale_price", "cash_price", "selling_price", "vehicle_price"] },
      { value: "deal.totalAmount", aliases: ["total", "total_amount", "total_price", "grand_total", "totalamount"] },
      { value: "deal.salesTax", aliases: ["salestax", "sales_tax", "tax"] },
      { value: "deal.docFee", aliases: ["docfee", "doc_fee", "document_fees", "documentation_fee", "admin_fee"] },
      { value: "deal.tradeInValue", aliases: ["tradein", "trade_in", "tradein_amount", "trade_value", "tradeinvalue"] },
      { value: "deal.downPayment", aliases: ["down", "down_payment", "cash_down", "cash_down_payment", "deposit", "downpayment"] },
      { value: "deal.financedAmount", aliases: ["financed", "amount_financed", "loan_amount", "financedamount"] },
      { value: "deal.type", aliases: ["deal_type", "sale_type", "transaction_type", "dealtype"] },
    ],
  };

  for (const pdfField of pdfFields) {
    const cleaned = pdfField.pdfFieldName.toLowerCase().trim();
    
    // Skip signature fields - comprehensive check
    if (
      cleaned.includes("signature") || 
      cleaned.includes("sign_") || 
      cleaned.includes("initial") ||
      cleaned.includes("sign") && (cleaned.includes("buyer") || cleaned.includes("seller") || cleaned.includes("date"))
    ) {
      continue;
    }

    // Skip insurance and lien holder fields (handled separately, left blank for in-person signing)
    if (cleaned.includes("insurance") || cleaned.includes("lien") || cleaned.includes("lein")) {
      continue;
    }

    let bestMatch: { dataPath: string; required: boolean } | null = null;
    let bestMatchScore = 0;

    // Extract numeric suffix if present (e.g., "address line 1 2" -> base: "address line 1", suffix: "2")
    // Also handle patterns like "phone1_1" and "phone2_1"
    // More specific pattern: match numbers at the end or after underscore/dash
    const numericSuffixMatch = cleaned.match(/(.+?)[\s_\-]*([12])[\s_\-]*$/);
    const baseName = numericSuffixMatch ? numericSuffixMatch[1].trim() : cleaned;
    const suffix = numericSuffixMatch ? numericSuffixMatch[2] : null;
    const isCobuyer = suffix === "2";
    const hasNumericSuffix = suffix !== null;

    // Pre-check: Determine field characteristics to prevent cross-contamination
    const hasPhone1 = cleaned.includes("phone1") || cleaned.includes("phone_1");
    const hasPhone2 = cleaned.includes("phone2") || cleaned.includes("phone_2");
    // VIN check: must be a standalone word or clearly VIN-related (not part of another word)
    const hasVIN = /\b(vin|serial)\b/.test(cleaned) || cleaned.startsWith("vin") || cleaned.startsWith("serial") || cleaned.endsWith("vin") || cleaned.endsWith("serial");
    const hasModel = cleaned.includes("model") && !cleaned.includes("year"); // Exclude "model_year"
    const hasColor = cleaned.includes("color");
    const hasExterior = cleaned.includes("exterior");

    // Check all schema categories
    for (const [category, fields] of Object.entries(dataSchema)) {
      // Strict category filtering based on suffix
      if (category === "cobuyer" && !isCobuyer) continue;
      if (category === "client" && isCobuyer) continue;
      
      // Pre-filter: Skip entire categories if field clearly belongs to another
      if (category === "cobuyer" && hasPhone1) continue; // Phone1 should never match cobuyer
      if (category === "client" && hasPhone2 && !hasPhone1) continue; // Phone2 without Phone1 should never match client

      for (const field of fields) {
        // For strict match fields (phone, VIN, model), only allow exact/normalized exact matches
        const isStrictMatch = field.strictMatch === true;
        
        // CRITICAL: Pre-filter phone fields based on field name characteristics
        if (field.value === "client.phone") {
          // Client phone should NEVER match if field has Phone2 indicators
          if (hasPhone2 || cleaned.includes("cobuyer") || cleaned.includes("co")) {
            continue;
          }
          // If field has Phone1, it MUST match client.phone (but we'll verify with strict matching)
        }
        if (field.value === "cobuyer.phone") {
          // Cobuyer phone should NEVER match if field has Phone1 indicators
          if (hasPhone1) {
            continue;
          }
          // Cobuyer phone should only match if field has Phone2 indicators
          if (!hasPhone2 && !cleaned.includes("cobuyer") && !cleaned.includes("co")) {
            continue;
          }
        }
        
        // CRITICAL: Pre-filter VIN - must explicitly contain VIN/serial and NOT contain model/color/exterior
        if (field.value === "vehicle.vin") {
          if (!hasVIN) {
            continue; // Field must contain VIN/serial
          }
          // VIN should NEVER match if field contains model, color, exterior, or any other vehicle descriptor
          if (hasModel || hasColor || hasExterior || cleaned.includes("make") || cleaned.includes("trim") || cleaned.includes("body")) {
            continue;
          }
        }
        
        // CRITICAL: Pre-filter model - must NOT contain VIN/serial and must contain model-related terms
        if (field.value === "vehicle.model") {
          if (hasVIN) {
            continue; // Model should never match fields with VIN/serial
          }
          // Model should only match if field explicitly contains model-related terms
          if (!cleaned.includes("model") && !cleaned.includes("car_model") && !cleaned.includes("vehicle_model")) {
            continue; // Skip if no model indicators
          }
        }
        
        // CRITICAL: Pre-filter color/exterior - must NOT contain VIN and must contain color/exterior terms
        if (field.value === "vehicle.color") {
          if (hasVIN) {
            continue; // Color should never match fields with VIN/serial
          }
          // Color should only match if field explicitly contains color/exterior terms
          if (!hasColor && !hasExterior) {
            continue; // Skip if no color/exterior indicators
          }
        }
        
        // Score-based matching: prioritize exact matches
        let matchScore = 0;
        let matched = false;

        for (const alias of field.aliases) {
          const normalizedBase = baseName.replace(/[-_\s]/g, "");
          const normalizedAlias = alias.replace(/[-_\s]/g, "");
          
          // Score 100: Exact match (case-insensitive)
          if (baseName === alias) {
            matchScore = 100;
            matched = true;
            break;
          }
          
          // Score 90: Normalized exact match (no dashes/underscores/spaces)
          if (normalizedBase === normalizedAlias) {
            matchScore = Math.max(matchScore, 90);
            matched = true;
            continue;
          }
          
          // For strict match fields, STOP HERE - don't allow partial matches
          if (isStrictMatch) {
            continue;
          }
          
          // Score 70: Field name starts with alias (for compound names like "buyer_first_name")
          if (baseName.startsWith(alias) || alias.startsWith(baseName)) {
            matchScore = Math.max(matchScore, 70);
            matched = true;
            continue;
          }
          
          // Score 50: Normalized starts with match
          if (normalizedBase.startsWith(normalizedAlias) || normalizedAlias.startsWith(normalizedBase)) {
            matchScore = Math.max(matchScore, 50);
            matched = true;
            continue;
          }
          
          // Score 30: Contains match (lowest priority, only if no better match)
          // BUT: Skip contains matching for fields with numeric suffixes to prevent cross-contamination
          if (hasNumericSuffix) {
            continue; // Don't allow contains matching when numeric suffix is present
          }
          
          if (baseName.includes(alias) || alias.includes(baseName)) {
            // Additional safety checks for contains matching
            // Prevent VIN from matching model fields
            if (field.value === "vehicle.model" && (cleaned.includes("vin") || cleaned.includes("serial"))) {
              continue; // Skip model if field contains VIN indicators
            }
            // Prevent model from matching VIN fields
            if (field.value === "vehicle.vin" && cleaned.includes("model") && !cleaned.includes("year")) {
              continue; // Skip VIN if field contains model (but allow "model_year")
            }
            
            matchScore = Math.max(matchScore, 30);
            matched = true;
            continue;
          }
        }

        // Only use this match if it's better than previous matches
        if (matched && matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestMatch = {
            dataPath: field.value,
            required: category === "vehicle" && (field.value.includes("vin") || field.value.includes("year") || field.value.includes("make") || field.value.includes("model")),
          };
        }
      }
    }

    // Only add the best match if we found one
    // For strict match fields, require at least score 90 (normalized exact match)
    // For other fields, require at least score 30
    if (bestMatch) {
      // Check if this field requires strict matching
      const category = bestMatch.dataPath.split('.')[0];
      const fieldRequiresStrictMatch = dataSchema[category]?.find(f => f.value === bestMatch.dataPath)?.strictMatch === true;
      const minScore = fieldRequiresStrictMatch ? 90 : 30;
      
      if (bestMatchScore >= minScore) {
        mappings.push({
          pdfFieldName: pdfField.pdfFieldName,
          dataPath: bestMatch.dataPath,
          required: bestMatch.required,
          autoMapped: true,
        } as FieldMapping);
      }
    }

    // If not mapped, skip it (don't add unmapped fields)
  }

  console.log(`Auto-mapped ${mappings.length} of ${pdfFields.length} PDF fields`);
  return mappings;
}

/**
 * Generate PDF from deal data
 * Returns base64-encoded PDF for local storage
 */
export const generateDealPDF = action({
  args: {
    userId: v.id("standalone_users"),
    templatePdfBase64: v.string(), // Base64-encoded PDF template with form fields
    fieldMappings: v.optional(v.array(v.object({
      pdfFieldName: v.string(),
      dataPath: v.string(), // e.g., "client.firstName", "vehicle.vin", "pricing.salePrice"
      transform: v.optional(v.string()), // Optional transform function name
      defaultValue: v.optional(v.string()),
      required: v.boolean(),
      autoMapped: v.boolean(),
    }))), // Optional - if not provided, will extract and auto-map
    dealData: v.object({
      id: v.string(),
      type: v.string(),
      client: v.object({
        firstName: v.string(),
        lastName: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        addressLine2: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        driversLicense: v.optional(v.string()),
      }),
      cobuyer: v.optional(v.object({
        firstName: v.string(),
        lastName: v.string(),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        addressLine2: v.optional(v.string()),
        city: v.optional(v.string()),
        state: v.optional(v.string()),
        zipCode: v.optional(v.string()),
        driversLicense: v.optional(v.string()),
      })),
      vehicle: v.object({
        vin: v.string(),
        year: v.number(),
        make: v.string(),
        model: v.string(),
        trim: v.optional(v.string()),
        body: v.optional(v.string()),
        doors: v.optional(v.number()),
        transmission: v.optional(v.string()),
        engine: v.optional(v.string()),
        cylinders: v.optional(v.number()),
        titleNumber: v.optional(v.string()),
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

    // Convert base64 template to ArrayBuffer (Convex doesn't have Buffer)
    const base64String = atob(args.templatePdfBase64);
    const bytes = new Uint8Array(base64String.length);
    for (let i = 0; i < base64String.length; i++) {
      bytes[i] = base64String.charCodeAt(i);
    }
    const templateBuffer = bytes.buffer;

    // Prepare deal data in the format expected by preparePdfData
    const dealDataForMapping: DealData = {
      client: {
        firstName: args.dealData.client.firstName,
        lastName: args.dealData.client.lastName,
        email: args.dealData.client.email,
        phone: args.dealData.client.phone,
        address: args.dealData.client.address,
        addressLine2: args.dealData.client.addressLine2,
        city: args.dealData.client.city,
        state: args.dealData.client.state,
        zipCode: args.dealData.client.zipCode,
        driversLicense: args.dealData.client.driversLicense,
      },
      cobuyer: args.dealData.cobuyer ? {
        firstName: args.dealData.cobuyer.firstName,
        lastName: args.dealData.cobuyer.lastName,
        email: args.dealData.cobuyer.email,
        phone: args.dealData.cobuyer.phone,
        address: args.dealData.cobuyer.address,
        addressLine2: args.dealData.cobuyer.addressLine2,
        city: args.dealData.cobuyer.city,
        state: args.dealData.cobuyer.state,
        zipCode: args.dealData.cobuyer.zipCode,
        driversLicense: args.dealData.cobuyer.driversLicense,
      } : undefined,
      vehicle: {
        vin: args.dealData.vehicle.vin,
        year: args.dealData.vehicle.year,
        make: args.dealData.vehicle.make,
        model: args.dealData.vehicle.model,
        trim: args.dealData.vehicle.trim,
        body: args.dealData.vehicle.body,
        doors: args.dealData.vehicle.doors,
        transmission: args.dealData.vehicle.transmission,
        engine: args.dealData.vehicle.engine,
        cylinders: args.dealData.vehicle.cylinders,
        titleNumber: args.dealData.vehicle.titleNumber,
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

    // Extract and auto-map fields if not provided
    let fieldMappings: FieldMapping[] = args.fieldMappings && args.fieldMappings.length > 0 
      ? (args.fieldMappings as FieldMapping[])
      : [];
    
    if (fieldMappings.length === 0) {
      console.log("No field mappings provided, extracting and auto-mapping PDF fields...");
      const extractedFields = await extractPDFFormFields(templateBuffer);
      
      if (extractedFields.length === 0) {
        throw new Error("No form fields found in the PDF template. Please ensure the PDF has form fields.");
      }
      
      console.log(`Extracted ${extractedFields.length} fields from PDF`);
      fieldMappings = autoMapPDFFields(extractedFields);
      
      if (fieldMappings.length === 0) {
        console.warn("No fields could be auto-mapped. PDF field names may not match expected patterns.");
        throw new Error(`No fields could be auto-mapped from the PDF. Found ${extractedFields.length} fields: ${extractedFields.map(f => f.pdfFieldName).join(", ")}. Please provide field mappings manually.`);
      }
      
      console.log(`Auto-mapped ${fieldMappings.length} of ${extractedFields.length} fields from PDF`);
    }

    // Prepare PDF data using field mappings
    const preparedData = preparePdfData(fieldMappings, dealDataForMapping);

    // Fill the template PDF with the prepared data
    const filledPdfBuffer = await fillTemplateWithData(
      templateBuffer,
      preparedData.fields
    );

    // Convert filled PDF to base64 (Convex doesn't have Buffer)
    const uint8Array = new Uint8Array(filledPdfBuffer);
    let pdfBinaryString = '';
    // Process in chunks to avoid stack overflow for large files
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      pdfBinaryString += String.fromCharCode(...chunk);
    }
    const base64PDF = btoa(pdfBinaryString);

    // Generate human-readable filename from document type
    const documentTypeNames: Record<string, string> = {
      bill_of_sale: "Bill of Sale",
      buyers_order: "Buyer's Order",
      buyers_guide: "Buyer's Guide",
      odometer_disclosure: "Odometer Disclosure",
      finance_agreement: "Finance Agreement",
      warranty: "Warranty Agreement",
      trade_in_appraisal: "Trade-In Appraisal",
      insurance_authorization: "Insurance Authorization",
      credit_application: "Credit Application",
    };
    const documentName = documentTypeNames[args.documentType] || args.documentType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    return {
      success: true,
      documentType: args.documentType,
      base64PDF,
      size: filledPdfBuffer.byteLength,
      filename: `${documentName}.pdf`,
      fieldsFilled: preparedData.fields.filter(f => !f.skipped).length,
      fieldsSkipped: preparedData.fields.filter(f => f.skipped).length,
      validationErrors: preparedData.validationErrors,
    };
  },
});

/**
 * Fill PDF template with prepared field data
 * Uses pdf-lib to fill form fields in the template
 * Handles duplicate/linked field names by deduplicating and prioritizing values
 */
async function fillTemplateWithData(
  templateBuffer: ArrayBuffer,
  fields: Array<{ pdfFieldName: string; value: string; skipped: boolean }>
): Promise<ArrayBuffer> {
  // Load PDF document
  const pdfDoc = await PDFDocument.load(templateBuffer);
  const form = pdfDoc.getForm();

  // Get all PDF field names to detect duplicates
  const allPdfFields = form.getFields();
  const fieldNameCounts = new Map<string, number>();
  for (const pdfField of allPdfFields) {
    const name = pdfField.getName();
    fieldNameCounts.set(name, (fieldNameCounts.get(name) || 0) + 1);
  }

  // Deduplicate fields by PDF field name and prioritize values
  // Priority: VIN > Model > Color/Exterior > Other
  const fieldMap = new Map<string, { value: string; skipped: boolean; priority: number }>();
  
  for (const field of fields) {
    const existing = fieldMap.get(field.pdfFieldName);
    const priority = getFieldPriority(field.pdfFieldName);
    
    // If field already exists, keep the one with higher priority
    if (!existing || priority > existing.priority) {
      fieldMap.set(field.pdfFieldName, {
        value: field.value,
        skipped: field.skipped,
        priority,
      });
    }
  }

  // Log duplicate field names
  const duplicates = Array.from(fieldNameCounts.entries()).filter(([_, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log(`⚠️ Found ${duplicates.length} duplicate/linked PDF field names:`, duplicates.map(([name]) => name).join(", "));
    console.log("These fields will be filled once with the highest priority value.");
  }

  let filledCount = 0;
  let skippedCount = 0;

  // Fill each unique field name only once
  for (const [pdfFieldName, fieldData] of fieldMap.entries()) {
    if (fieldData.skipped) {
      skippedCount++;
      continue;
    }

    try {
      // Get the PDF form field (will fill all fields with this name if they're linked)
      const pdfField = form.getField(pdfFieldName);

      // Get field type
      const fieldType = pdfField.constructor.name;

      // Fill based on type
      if (fieldType === "PDFTextField") {
        (pdfField as PDFTextField).setText(fieldData.value);
        filledCount++;
        const fieldCount = fieldNameCounts.get(pdfFieldName);
        if (fieldCount && fieldCount > 1) {
          console.log(`✓ Filled linked field "${pdfFieldName}" with value: "${fieldData.value}" (affects ${fieldCount} fields)`);
        }
      } else if (fieldType === "PDFCheckBox") {
        const checked = fieldData.value === "true" || fieldData.value === "yes" || fieldData.value === "1";
        if (checked) {
          (pdfField as PDFCheckBox).check();
        } else {
          (pdfField as PDFCheckBox).uncheck();
        }
        filledCount++;
      } else if (fieldType === "PDFDropdown") {
        (pdfField as PDFDropdown).select(fieldData.value);
        filledCount++;
      } else if (fieldType === "PDFRadioGroup") {
        (pdfField as PDFRadioGroup).select(fieldData.value);
        filledCount++;
      }
    } catch (fieldError) {
      console.error(`Error filling field ${pdfFieldName}:`, fieldError);
      skippedCount++;
    }
  }

  console.log(`PDF filled: ${filledCount} unique fields filled, ${skippedCount} skipped`);

  // DON'T flatten form - keep fields editable for later editing
  // form.flatten(); // Commented out to preserve form fields

  // Save and return
  const pdfBytes = await pdfDoc.save();
  return pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength) as ArrayBuffer;
}

/**
 * Get priority for field value when multiple mappings target the same PDF field name
 * Higher number = higher priority
 */
function getFieldPriority(pdfFieldName: string): number {
  const name = pdfFieldName.toLowerCase();
  
  // VIN has highest priority (most specific/important)
  if (name.includes("vin") || name.includes("serial")) {
    return 100;
  }
  
  // Model has high priority
  if (name.includes("model") && !name.includes("year")) {
    return 80;
  }
  
  // Color/Exterior has medium priority
  if (name.includes("color") || name.includes("exterior")) {
    return 60;
  }
  
  // Other vehicle fields
  if (name.includes("make") || name.includes("year") || name.includes("trim")) {
    return 50;
  }
  
  // Default priority
  return 10;
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
