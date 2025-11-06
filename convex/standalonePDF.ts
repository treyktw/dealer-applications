/**
 * Standalone PDF Generation
 * Generates PDFs for standalone users without S3 storage
 * Returns PDF as base64 for local storage in IndexedDB
 */

import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Generate PDF from deal data
 * Returns base64-encoded PDF for local storage
 */
export const generateDealPDF = action({
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
    documentType: v.string(), // "bill_of_sale", "buyers_order", etc.
  },
  handler: async (ctx, args) => {
    // Verify user has active subscription
    const user = await ctx.runQuery(internal => internal.standaloneAuth.checkSubscription, {
      userId: args.userId,
    });

    if (!user.valid) {
      throw new Error("Active subscription required to generate documents");
    }

    // Generate PDF based on document type
    let pdfBuffer: Buffer;

    switch (args.documentType) {
      case "bill_of_sale":
        pdfBuffer = await generateBillOfSale(args.dealData);
        break;
      case "buyers_order":
        pdfBuffer = await generateBuyersOrder(args.dealData);
        break;
      case "odometer_disclosure":
        pdfBuffer = await generateOdometerDisclosure(args.dealData);
        break;
      default:
        throw new Error(`Unknown document type: ${args.documentType}`);
    }

    // Convert to base64
    const base64PDF = pdfBuffer.toString('base64');

    return {
      success: true,
      documentType: args.documentType,
      base64PDF,
      size: pdfBuffer.length,
      filename: `${args.documentType}_${args.dealData.id}_${Date.now()}.pdf`,
    };
  },
});

/**
 * Generate Bill of Sale PDF
 */
async function generateBillOfSale(dealData: any): Promise<Buffer> {
  // TODO: Replace with actual PDF generation library (pdf-lib or similar)
  // This is a placeholder that creates a simple text-based PDF

  const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;
  const fontSize = 12;
  const lineHeight = 20;

  // Title
  page.drawText('BILL OF SALE', {
    x: 50,
    y,
    size: 18,
    font: boldFont,
    color: rgb(0, 0, 0),
  });

  y -= 40;

  // Business Info
  if (dealData.businessInfo) {
    page.drawText(`Seller: ${dealData.businessInfo.name}`, { x: 50, y, size: fontSize, font });
    y -= lineHeight;
    if (dealData.businessInfo.address) {
      page.drawText(`Address: ${dealData.businessInfo.address}`, { x: 50, y, size: fontSize, font });
      y -= lineHeight;
    }
    if (dealData.businessInfo.phone) {
      page.drawText(`Phone: ${dealData.businessInfo.phone}`, { x: 50, y, size: fontSize, font });
      y -= lineHeight;
    }
  }

  y -= 20;

  // Buyer Info
  page.drawText('BUYER INFORMATION', { x: 50, y, size: fontSize, font: boldFont });
  y -= lineHeight;
  page.drawText(`Name: ${dealData.client.firstName} ${dealData.client.lastName}`, { x: 50, y, size: fontSize, font });
  y -= lineHeight;
  if (dealData.client.address) {
    page.drawText(`Address: ${dealData.client.address}`, { x: 50, y, size: fontSize, font });
    y -= lineHeight;
  }
  if (dealData.client.city && dealData.client.state && dealData.client.zipCode) {
    page.drawText(`City, State ZIP: ${dealData.client.city}, ${dealData.client.state} ${dealData.client.zipCode}`, { x: 50, y, size: fontSize, font });
    y -= lineHeight;
  }
  if (dealData.client.phone) {
    page.drawText(`Phone: ${dealData.client.phone}`, { x: 50, y, size: fontSize, font });
    y -= lineHeight;
  }

  y -= 20;

  // Vehicle Info
  page.drawText('VEHICLE INFORMATION', { x: 50, y, size: fontSize, font: boldFont });
  y -= lineHeight;
  page.drawText(`Year/Make/Model: ${dealData.vehicle.year} ${dealData.vehicle.make} ${dealData.vehicle.model}`, { x: 50, y, size: fontSize, font });
  y -= lineHeight;
  if (dealData.vehicle.trim) {
    page.drawText(`Trim: ${dealData.vehicle.trim}`, { x: 50, y, size: fontSize, font });
    y -= lineHeight;
  }
  page.drawText(`VIN: ${dealData.vehicle.vin}`, { x: 50, y, size: fontSize, font });
  y -= lineHeight;
  page.drawText(`Mileage: ${dealData.vehicle.mileage.toLocaleString()} miles`, { x: 50, y, size: fontSize, font });
  y -= lineHeight;
  if (dealData.vehicle.color) {
    page.drawText(`Color: ${dealData.vehicle.color}`, { x: 50, y, size: fontSize, font });
    y -= lineHeight;
  }

  y -= 20;

  // Pricing Info
  page.drawText('PURCHASE DETAILS', { x: 50, y, size: fontSize, font: boldFont });
  y -= lineHeight;
  page.drawText(`Sale Price: $${dealData.pricing.salePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 50, y, size: fontSize, font });
  y -= lineHeight;
  if (dealData.pricing.salesTax) {
    page.drawText(`Sales Tax: $${dealData.pricing.salesTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 50, y, size: fontSize, font });
    y -= lineHeight;
  }
  if (dealData.pricing.docFee) {
    page.drawText(`Doc Fee: $${dealData.pricing.docFee.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 50, y, size: fontSize, font });
    y -= lineHeight;
  }
  if (dealData.pricing.tradeInValue) {
    page.drawText(`Trade-In Value: -$${dealData.pricing.tradeInValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 50, y, size: fontSize, font });
    y -= lineHeight;
  }
  if (dealData.pricing.downPayment) {
    page.drawText(`Down Payment: $${dealData.pricing.downPayment.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 50, y, size: fontSize, font });
    y -= lineHeight;
  }
  page.drawText(`TOTAL: $${dealData.pricing.totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, { x: 50, y, size: fontSize, font: boldFont });
  y -= lineHeight * 2;

  // Signature lines
  y -= 40;
  page.drawText('_________________________________', { x: 50, y, size: fontSize, font });
  page.drawText('_________________________________', { x: 350, y, size: fontSize, font });
  y -= lineHeight;
  page.drawText('Buyer Signature', { x: 50, y, size: fontSize - 2, font });
  page.drawText('Seller Signature', { x: 350, y, size: fontSize - 2, font });
  y -= lineHeight;
  page.drawText(`Date: _______________`, { x: 50, y, size: fontSize - 2, font });
  page.drawText(`Date: _______________`, { x: 350, y, size: fontSize - 2, font });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Generate Buyer's Order PDF
 */
async function generateBuyersOrder(dealData: any): Promise<Buffer> {
  // Similar to Bill of Sale but with different layout
  // TODO: Implement full buyer's order template
  return generateBillOfSale(dealData); // Placeholder
}

/**
 * Generate Odometer Disclosure PDF
 */
async function generateOdometerDisclosure(dealData: any): Promise<Buffer> {
  // TODO: Implement odometer disclosure template
  return generateBillOfSale(dealData); // Placeholder
}

/**
 * Batch generate multiple documents for a deal
 */
export const generateDealDocumentPack = action({
  args: {
    userId: v.id("standalone_users"),
    dealData: v.any(), // Same as above
    documentTypes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const documents = [];

    for (const docType of args.documentTypes) {
      try {
        const result = await ctx.runAction(internal => internal.standalonePDF.generateDealPDF, {
          userId: args.userId,
          dealData: args.dealData,
          documentType: docType,
        });

        documents.push(result);
      } catch (error) {
        console.error(`Failed to generate ${docType}:`, error);
        documents.push({
          success: false,
          documentType: docType,
          error: error.message,
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
