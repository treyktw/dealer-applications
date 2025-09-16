// convex/pdfFieldInspector.ts - Unified and Simplified

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Main unified inspection function
export const inspectPDF = action({
  args: {
    source: v.union(
      v.object({ type: v.literal("storageId"), id: v.string() }),
      v.object({ type: v.literal("templateId"), id: v.string() }),
      v.object({ type: v.literal("url"), url: v.string() }),
      v.object({ type: v.literal("base64"), data: v.string() })
    ),
  },
  handler: async (ctx, args) => {
    let pdfBytes: ArrayBuffer | undefined;
    let sourceName = "";
    let sourceUrl = "";

    // Get PDF based on source type
    switch (args.source.type) {
      case "storageId":
        sourceUrl = await ctx.storage.getUrl(args.source.id as any) || "";
        if (!sourceUrl) throw new Error(`Storage file not found: ${args.source.id}`);
        sourceName = `storage:${args.source.id}`;
        break;

      case "templateId":
        const template = await ctx.runQuery(api.pdfTemplates.getTemplateById, {
          templateId: args.source.id,
        });
        sourceUrl = template.blankPdfUrl;
        sourceName = `template:${args.source.id}`;
        break;

      case "url":
        sourceUrl = args.source.url;
        sourceName = `url:${args.source.url.split('/').pop()}`;
        break;

      case "base64":
        const binaryString = atob(args.source.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        pdfBytes = bytes.buffer;
        sourceName = "base64:input";
        break;
    }

    // Fetch PDF if we have URL
    if (sourceUrl && !pdfBytes) {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.status}`);
      }
      pdfBytes = await response.arrayBuffer();
    }

    if (!pdfBytes) throw new Error("No PDF data available");

    // Load and analyze PDF
    const { PDFDocument } = await import("pdf-lib");
    
    const analysis = {
      source: sourceName,
      sourceUrl,
      formAccessible: false,
      fieldCount: 0,
      fields: [] as any[],
      metadata: {} as any,
      structure: {
        hasAcroForm: false,
        hasXFA: false,
        hasJavaScript: false,
        pageCount: 0,
      },
      issues: [] as string[],
      recommendations: [] as string[],
    };

    try {
      // Load PDF
      const pdfDoc = await PDFDocument.load(pdfBytes, {
        ignoreEncryption: true,
        throwOnInvalidObject: false,
        updateMetadata: false,
      });

      // Get metadata
      analysis.structure.pageCount = pdfDoc.getPageCount();
      analysis.metadata = {
        title: pdfDoc.getTitle() || null,
        author: pdfDoc.getAuthor() || null,
        subject: pdfDoc.getSubject() || null,
        creator: pdfDoc.getCreator() || null,
        producer: pdfDoc.getProducer() || null,
        creationDate: pdfDoc.getCreationDate()?.toISOString() || null,
        modificationDate: pdfDoc.getModificationDate()?.toISOString() || null,
      };

      // Try to access form
      try {
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        analysis.formAccessible = true;
        analysis.fieldCount = fields.length;

        // Extract field details
        analysis.fields = fields.map((field) => {
          const fieldName = field.getName();
          const fieldType = field.constructor.name.replace("PDF", "");
          
          let fieldInfo: any = {
            name: fieldName,
            type: fieldType,
            mappable: true,
          };

          // Add type-specific info
          try {
            if (fieldType === "TextField") {
              const textField = field as any;
              fieldInfo.maxLength = textField.getMaxLength?.() || null;
              fieldInfo.multiline = textField.isMultiline?.() || false;
            } else if (fieldType === "CheckBox") {
              const checkBox = field as any;
              fieldInfo.checked = checkBox.isChecked?.() || false;
            } else if (fieldType === "RadioGroup") {
              const radioGroup = field as any;
              fieldInfo.options = radioGroup.getOptions?.() || [];
            } else if (fieldType === "Dropdown" || fieldType === "OptionList") {
              const dropdown = field as any;
              fieldInfo.options = dropdown.getOptions?.() || [];
            }
          } catch (e) {
            fieldInfo.error = "Could not read field properties";
          }

          return fieldInfo;
        });

        if (fields.length === 0) {
          analysis.issues.push("PDF has form but no fields");
          analysis.recommendations.push("Add form fields using Adobe Acrobat");
        }
      } catch (formError) {
        analysis.formAccessible = false;
        analysis.issues.push(`Form not accessible: ${formError}`);
        
        // Try raw detection as fallback
        const rawFields = await detectFieldsRaw(pdfBytes);
        if (rawFields.length > 0) {
          analysis.fields = rawFields;
          analysis.fieldCount = rawFields.length;
          analysis.issues.push("Fields detected via raw analysis only");
          analysis.recommendations.push("Recreate PDF with proper AcroForm structure");
        }
      }

      // Check for XFA and JavaScript
      const pdfString = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(pdfBytes));
      analysis.structure.hasXFA = pdfString.includes("/XFA") || pdfString.includes("</xfa:");
      analysis.structure.hasJavaScript = pdfString.includes("/JavaScript") || pdfString.includes("/JS");
      analysis.structure.hasAcroForm = pdfString.includes("/AcroForm");

      if (analysis.structure.hasXFA) {
        analysis.issues.push("XFA forms not supported");
        analysis.recommendations.push("Convert to AcroForm using Adobe Acrobat");
      }

    } catch (error) {
      analysis.issues.push(`PDF processing error: ${error}`);
      analysis.recommendations.push("Verify PDF is valid and not corrupted");
    }

    return analysis;
  },
});

// Simplified fill test
export const testFillPDF = action({
  args: {
    source: v.union(
      v.object({ type: v.literal("storageId"), id: v.string() }),
      v.object({ type: v.literal("templateId"), id: v.string() })
    ),
    testData: v.optional(v.record(v.string(), v.string())),
  },
  handler: async (ctx, args): Promise<any> => {
    // First inspect the PDF
    const inspection: any = await ctx.runAction(api.pdfFieldInspector.inspectPDF, {
      source: args.source,
    });

    if (!inspection.formAccessible) {
      return {
        success: false,
        message: "PDF form is not accessible",
        inspection,
      };
    }

    // Get PDF URL
    let pdfUrl = "";
    if (args.source.type === "storageId") {
      pdfUrl = await ctx.storage.getUrl(args.source.id as any) || "";
    } else {
      const template = await ctx.runQuery(api.pdfTemplates.getTemplateById, {
        templateId: args.source.id,
      });
      pdfUrl = template.blankPdfUrl;
    }

    // Download and fill PDF
    const response = await fetch(pdfUrl);
    const pdfBytes = await response.arrayBuffer();
    const { PDFDocument } = await import("pdf-lib");
    
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      throwOnInvalidObject: false,
    });

    const form = pdfDoc.getForm();
    const fields = form.getFields();

    // Default test data for GA Bill of Sale
    const defaultTestData: Record<string, string> = {
      // Vehicle Info
      'VIN': 'TEST123VIN456789',
      'Year': '2024',
      'Make': 'Toyota',
      'Model': 'Camry',
      'Odometer Reading': '15000',
      'MM': '01',
      'DD': '15',
      'YY': '25',
      'Purchase Price': '25000.00',
      
      // Seller (Dealership)
      'Georgia Tax ID No': '12-3456789',
      'SellersTransferors.0': 'Test Dealership LLC',
      'Street No': '123',
      'Street Name': 'Main Street',
      'City': 'Atlanta',
      'State': 'GA',
      'ZIP Code': '30303',
      'County': 'Fulton',
      
      // Buyer
      'PurchasersTransferees.0': 'John Test Buyer',
      'Street No_2': '456',
      'Street Name_2': 'Oak Avenue',
      'City_2': 'Decatur',
      'State_2': 'GA',
      'ZIP Code_2': '30030',
      
      // Add more based on what's in the PDF
      ...args.testData,
    };

    let filledCount = 0;
    const filledFields: string[] = [];
    const failedFields: string[] = [];

    // Fill fields
    for (const field of fields) {
      const fieldName = field.getName();
      const value = defaultTestData[fieldName];
      
      if (value) {
        try {
          const fieldType = field.constructor.name;
          
          if (fieldType === 'PDFTextField') {
            (field as any).setText(value);
            filledCount++;
            filledFields.push(fieldName);
          } else if (fieldType === 'PDFCheckBox' && value === 'true') {
            (field as any).check();
            filledCount++;
            filledFields.push(fieldName);
          }
          // Add more field types as needed
        } catch (e) {
          failedFields.push(fieldName);
        }
      }
    }

    // Save filled PDF
    const filledPdfBytes = await pdfDoc.save();
    const blob = new Blob([new Uint8Array(filledPdfBytes)], { type: 'application/pdf' });
    const filledStorageId = await ctx.storage.store(blob);
    const filledUrl = await ctx.storage.getUrl(filledStorageId);

    return {
      success: true,
      message: `Filled ${filledCount} of ${fields.length} fields`,
      filledUrl,
      filledStorageId,
      stats: {
        totalFields: fields.length,
        filledCount,
        filledFields,
        failedFields,
      },
      inspection,
    };
  },
});

// Helper function for raw field detection
async function detectFieldsRaw(pdfBytes: ArrayBuffer): Promise<any[]> {
  const fields: any[] = [];
  const pdfString = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(pdfBytes));
  
  const fieldNamePattern = /\/T\s*\(([^)]+)\)/g;
  let match;
  const fieldNames = new Set<string>();
  
  while ((match = fieldNamePattern.exec(pdfString)) !== null) {
    const fieldName = match[1];
    if (fieldName && !fieldNames.has(fieldName)) {
      fieldNames.add(fieldName);
      
      // Determine field type from context
      let fieldType = "Unknown";
      const contextStart = Math.max(0, match.index - 100);
      const contextEnd = Math.min(pdfString.length, match.index + 200);
      const context = pdfString.substring(contextStart, contextEnd);
      
      if (context.includes("/FT /Tx")) fieldType = "TextField";
      else if (context.includes("/FT /Btn")) fieldType = "Button/Checkbox";
      else if (context.includes("/FT /Ch")) fieldType = "Choice/Dropdown";
      else if (context.includes("/FT /Sig")) fieldType = "Signature";
      
      fields.push({
        name: fieldName,
        type: fieldType,
        mappable: false,
        detectedVia: "raw_analysis",
      });
    }
  }
  
  return fields;
}

// Quick test functions for debugging
export const quickTest = action({
  args: {},
  handler: async (ctx) => {
    const results = {
      gaTemplate: null as any,
      directStorage: null as any,
      fillTest: null as any,
    };

    try {
      // Test 1: Template inspection
      results.gaTemplate = await ctx.runAction(api.pdfFieldInspector.inspectPDF, {
        source: { type: "templateId", id: "bill_of_sale-ga-v1" },
      });
    } catch (e) {
      results.gaTemplate = { error: String(e) };
    }

    try {
      // Test 2: Direct storage inspection
      results.directStorage = await ctx.runAction(api.pdfFieldInspector.inspectPDF, {
        source: { type: "storageId", id: "kg20v1zvcervng2zq7tmqkhvs57q7abj" },
      });
    } catch (e) {
      results.directStorage = { error: String(e) };
    }

    try {
      // Test 3: Fill test
      results.fillTest = await ctx.runAction(api.pdfFieldInspector.testFillPDF, {
        source: { type: "storageId", id: "kg20v1zvcervng2zq7tmqkhvs57q7abj" },
      });
    } catch (e) {
      results.fillTest = { error: String(e) };
    }

    console.log("=== Quick Test Results ===");
    console.log("GA Template:", results.gaTemplate?.fieldCount || "Failed");
    console.log("Direct Storage:", results.directStorage?.fieldCount || "Failed");
    console.log("Fill Test:", results.fillTest?.success || "Failed");

    return results;
  },
});