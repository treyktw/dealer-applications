// convex/pdfFieldMapper.ts - Dynamic field detection and mapping

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Analyze PDF and create dynamic field mapping
export const analyzePDFTemplate = action({
  args: {
    storageId: v.string(),
    templateType: v.string(), // "bill_of_sale", "finance_contract", etc.
  },
  handler: async (ctx, args) => {
    const pdfUrl = await ctx.storage.getUrl(args.storageId as any);
    if (!pdfUrl) throw new Error("Storage file not found");

    const response = await fetch(pdfUrl);
    const pdfBytes = await response.arrayBuffer();
    const { PDFDocument } = await import("pdf-lib");
    
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });

    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Analyze each field and determine its likely data type
    const fieldMappings = fields.map((field) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;
      
      // Smart field type detection based on name patterns
      const mapping = detectFieldMapping(fieldName, fieldType);
      
      return {
        pdfFieldName: fieldName,
        fieldType: fieldType.replace("PDF", ""),
        suggestedMapping: mapping.dataPath,
        suggestedLabel: mapping.label,
        suggestedInputType: mapping.inputType,
        validationRules: mapping.validation,
        required: mapping.required,
        category: mapping.category,
      };
    });

    // Group fields by category for better UI organization
    const categorizedFields = {
      vehicle: fieldMappings.filter(f => f.category === "vehicle"),
      buyer: fieldMappings.filter(f => f.category === "buyer"),
      seller: fieldMappings.filter(f => f.category === "seller"),
      financial: fieldMappings.filter(f => f.category === "financial"),
      dates: fieldMappings.filter(f => f.category === "dates"),
      other: fieldMappings.filter(f => f.category === "other"),
    };

    return {
      totalFields: fields.length,
      fieldMappings,
      categorizedFields,
      templateAnalysis: {
        hasVehicleInfo: categorizedFields.vehicle.length > 0,
        hasBuyerInfo: categorizedFields.buyer.length > 0,
        hasFinancialInfo: categorizedFields.financial.length > 0,
        isComplete: fields.length > 20, // Assume complete if has many fields
      },
    };
  },
});

// Smart field detection based on common patterns
function detectFieldMapping(fieldName: string, fieldType: string) {
  const name = fieldName.toLowerCase();
  
  // Vehicle patterns
  if (name.includes("vin")) {
    return {
      dataPath: "vehicle.vin",
      label: "VIN Number",
      inputType: "text",
      validation: { pattern: "^[A-HJ-NPR-Z0-9]{17}$", maxLength: 17 },
      required: true,
      category: "vehicle",
    };
  }
  
  if (name.includes("year") && (name.includes("vehicle") || name.includes("car") || !name.includes("birth"))) {
    return {
      dataPath: "vehicle.year",
      label: "Vehicle Year",
      inputType: "number",
      validation: { min: 1900, max: new Date().getFullYear() + 1 },
      required: true,
      category: "vehicle",
    };
  }
  
  if (name.includes("make")) {
    return {
      dataPath: "vehicle.make",
      label: "Make",
      inputType: "text",
      validation: {},
      required: true,
      category: "vehicle",
    };
  }
  
  if (name.includes("model")) {
    return {
      dataPath: "vehicle.model",
      label: "Model",
      inputType: "text",
      validation: {},
      required: true,
      category: "vehicle",
    };
  }
  
  if (name.includes("mileage") || name.includes("odometer")) {
    return {
      dataPath: "vehicle.mileage",
      label: "Mileage/Odometer",
      inputType: "number",
      validation: { min: 0, max: 999999 },
      required: true,
      category: "vehicle",
    };
  }
  
  // Financial patterns
  if (name.includes("price") || name.includes("amount") || name.includes("total")) {
    const label = fieldName.replace(/_/g, " ").replace(/([A-Z])/g, " $1").trim();
    return {
      dataPath: `financial.${fieldName.replace(/\s+/g, "_").toLowerCase()}`,
      label,
      inputType: "currency",
      validation: { min: 0 },
      required: name.includes("total") || name.includes("price"),
      category: "financial",
    };
  }
  
  if (name.includes("tax") || name.includes("fee")) {
    return {
      dataPath: `financial.${fieldName.replace(/\s+/g, "_").toLowerCase()}`,
      label: fieldName,
      inputType: "currency",
      validation: { min: 0 },
      required: false,
      category: "financial",
    };
  }
  
  // Buyer/Seller patterns
  if (name.includes("buyer") || name.includes("purchaser")) {
    if (name.includes("initial")) {
      return {
        dataPath: "buyer.initials",
        label: "Buyer Initials",
        inputType: "text",
        validation: { maxLength: 3 },
        required: false,
        category: "buyer",
      };
    }
    return {
      dataPath: "buyer.fullName",
      label: "Buyer Name",
      inputType: "text",
      validation: {},
      required: true,
      category: "buyer",
    };
  }
  
  if (name.includes("seller") || name.includes("dealer")) {
    if (name.includes("initial")) {
      return {
        dataPath: "seller.initials",
        label: "Seller Initials",
        inputType: "text",
        validation: { maxLength: 3 },
        required: false,
        category: "seller",
      };
    }
    return {
      dataPath: "seller.name",
      label: "Seller/Dealer",
      inputType: "text",
      validation: {},
      required: true,
      category: "seller",
    };
  }
  
  // Address patterns
  if (name.includes("street") || name.includes("address")) {
    const isBuyer = name.includes("2") || name.includes("buyer");
    return {
      dataPath: isBuyer ? "buyer.address" : "seller.address",
      label: isBuyer ? "Buyer Address" : "Seller Address",
      inputType: "text",
      validation: {},
      required: true,
      category: isBuyer ? "buyer" : "seller",
    };
  }
  
  if (name.includes("city")) {
    const isBuyer = name.includes("2") || name.includes("buyer");
    return {
      dataPath: isBuyer ? "buyer.city" : "seller.city",
      label: isBuyer ? "Buyer City" : "Seller City",
      inputType: "text",
      validation: {},
      required: true,
      category: isBuyer ? "buyer" : "seller",
    };
  }
  
  if (name.includes("state")) {
    const isBuyer = name.includes("2") || name.includes("buyer");
    return {
      dataPath: isBuyer ? "buyer.state" : "seller.state",
      label: isBuyer ? "Buyer State" : "Seller State",
      inputType: "select",
      validation: { options: ["GA", "FL", "SC", "NC", "TN", "AL"] },
      required: true,
      category: isBuyer ? "buyer" : "seller",
    };
  }
  
  if (name.includes("zip")) {
    const isBuyer = name.includes("2") || name.includes("buyer");
    return {
      dataPath: isBuyer ? "buyer.zip" : "seller.zip",
      label: isBuyer ? "Buyer ZIP" : "Seller ZIP",
      inputType: "text",
      validation: { pattern: "^\\d{5}(-\\d{4})?$" },
      required: true,
      category: isBuyer ? "buyer" : "seller",
    };
  }
  
  // Date patterns
  if (name.includes("date") || name === "mm" || name === "dd" || name === "yy") {
    return {
      dataPath: `dates.${fieldName.replace(/\s+/g, "_").toLowerCase()}`,
      label: fieldName,
      inputType: name.length <= 2 ? "text" : "date",
      validation: {},
      required: false,
      category: "dates",
    };
  }
  
  // Stock/Inventory
  if (name.includes("stock")) {
    return {
      dataPath: "vehicle.stockNumber",
      label: "Stock Number",
      inputType: "text",
      validation: {},
      required: false,
      category: "vehicle",
    };
  }
  
  // Default mapping for unknown fields
  return {
    dataPath: `other.${fieldName.replace(/\s+/g, "_").toLowerCase()}`,
    label: fieldName,
    inputType: "text",
    validation: {},
    required: false,
    category: "other",
  };
}

// Save field mapping for a template
export const saveTemplateMapping = mutation({
  args: {
    dealershipId: v.id("dealerships"),
    templateType: v.string(),
    storageId: v.string(),
    fieldMappings: v.array(v.object({
      pdfFieldName: v.string(),
      fieldType: v.string(),
      dataPath: v.string(),
      label: v.string(),
      inputType: v.string(),
      required: v.boolean(),
      category: v.string(),
      validation: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Save or update the template mapping
    const existing = await ctx.db
      .query("template_mappings")
      .withIndex("by_dealership_type", q =>
        q.eq("dealershipId", args.dealershipId)
         .eq("templateType", args.templateType)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        storageId: args.storageId,
        fieldMappings: args.fieldMappings,
        updatedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("template_mappings", {
        dealershipId: args.dealershipId,
        templateType: args.templateType,
        storageId: args.storageId,
        fieldMappings: args.fieldMappings,
        createdBy: identity.subject,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  },
});

// Get saved mapping for a template
export const getTemplateMapping = query({
  args: {
    dealershipId: v.id("dealerships"),
    templateType: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("template_mappings")
      .withIndex("by_dealership_type", q =>
        q.eq("dealershipId", args.dealershipId)
         .eq("templateType", args.templateType)
      )
      .first();
  },
});

// Generate form data based on mapping
export const generateFormData = action({
  args: {
    templateType: v.string(),
    dealId: v.id("deals"),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get the deal data
    const deal = await ctx.runQuery(api.deals.getDeal, { dealId: args.dealId });
    const dealership: any = await ctx.runQuery(api.dealerships.getCurrentDealership, {});
    
    // Get the template mapping
    const mapping: any = await ctx.runQuery(api.pdfFieldMapper.getTemplateMapping, {
      dealershipId: dealership._id,
      templateType: args.templateType,
    });

    if (!mapping) {
      throw new Error("No template mapping found");
    }

    // Create form data based on mapping
    const formData: Record<string, any> = {};
    
    for (const field of mapping.fieldMappings) {
      // Get value from deal data using the data path
      const value = getValueFromPath({ deal, dealership }, field.dataPath);
      
      if (value !== undefined) {
        formData[field.pdfFieldName] = formatValue(value, field.inputType);
      } else if (field.required) {
        // Mark required fields that are missing
        formData[field.pdfFieldName] = "";
      }
    }

    return {
      formData,
      mapping: mapping.fieldMappings,
      missingRequired: mapping.fieldMappings
        .filter((f: any) => f.required && !formData[f.pdfFieldName])
        .map((f: any) => f.label),
    };
  },
});

// Helper to get value from nested path
function getValueFromPath(data: any, path: string): any {
  const parts = path.split(".");
  let current = data;
  
  for (const part of parts) {
    if (current?.[part] !== undefined) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  
  return current;
}

// Helper to format values based on type
function formatValue(value: any, inputType: string): string {
  switch (inputType) {
    case "currency":
      return typeof value === "number" ? value.toFixed(2) : value;
    case "date":
      return value instanceof Date ? value.toISOString().split("T")[0] : value;
    case "number":
      return String(value);
    default:
      return String(value || "");
  }
}