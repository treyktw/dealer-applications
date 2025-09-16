// src/services/pdf-template-service.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { DocumentType } from '@/types/documents';

// Map document types to template file names
const documentTemplates: Record<DocumentType, string> = {
  [DocumentType.TITLE_REASSIGNMENT]: 'title-reassignment.pdf',
  [DocumentType.TRADE_IN_REDUCTION]: 'trade-in-reduction.pdf',
  [DocumentType.TAX_AD_VALOREM]: 'tax-ad-valorem.pdf',
  [DocumentType.BAILMENT_AGREEMENT]: 'bailment-agreement.pdf',
  [DocumentType.OFAC_COMPLIANCE]: 'ofac-compliance.pdf',
  [DocumentType.FACTS_DOC]: 'facts-doc.pdf',
  [DocumentType.POWER_OF_ATTORNEY]: 'power-of-attorney.pdf',
  [DocumentType.BUYERS_GUIDE_P1]: 'buyers-guide-p1.pdf',
  [DocumentType.BUYERS_GUIDE_P2]: 'buyers-guide-p2.pdf',
  [DocumentType.ODOMETER_DISCLOSURE]: 'odometer-disclosure.pdf',
  [DocumentType.ARBITRATION_AGREEMENT]: 'arbitration-agreement.pdf',
  [DocumentType.WE_OWE_DOC]: 'we-owe-doc.pdf',
  [DocumentType.BILL_OF_SALE]: 'bill-of-sale.pdf',
  [DocumentType.MV1_APPLICATION]: 'mv1-application.pdf',
  [DocumentType.AS_IS_SOLD]: 'as-is-sold.pdf',
  [DocumentType.BILL_OF_SALE_TERMS]: 'bill-of-sale-terms.pdf',
};

// Define field coordinates for each document template
// These would be determined by examining each PDF template
interface FieldPosition {
  page: number;
  x: number;
  y: number;
  maxWidth?: number;
  fontSize?: number;
}

interface DocumentFields {
  [key: string]: FieldPosition;
}

// Example field positions for one document type (would need to be defined for each document)
const documentFieldPositions: Record<DocumentType, DocumentFields> = {
  [DocumentType.TITLE_REASSIGNMENT]: {
    clientName: { page: 0, x: 150, y: 700, maxWidth: 200, fontSize: 12 },
    dealerName: { page: 0, x: 150, y: 650, maxWidth: 200, fontSize: 12 },
    vehicleVin: { page: 0, x: 150, y: 600, maxWidth: 200, fontSize: 12 },
    vehicleYear: { page: 0, x: 150, y: 550, maxWidth: 50, fontSize: 12 },
    vehicleMake: { page: 0, x: 210, y: 550, maxWidth: 100, fontSize: 12 },
    vehicleModel: { page: 0, x: 320, y: 550, maxWidth: 120, fontSize: 12 },
    // Add more fields as needed
  },
  // Define other document types (simplified for example)
  [DocumentType.TRADE_IN_REDUCTION]: {},
  [DocumentType.TAX_AD_VALOREM]: {},
  [DocumentType.BAILMENT_AGREEMENT]: {},
  [DocumentType.OFAC_COMPLIANCE]: {},
  [DocumentType.FACTS_DOC]: {},
  [DocumentType.POWER_OF_ATTORNEY]: {},
  [DocumentType.BUYERS_GUIDE_P1]: {},
  [DocumentType.BUYERS_GUIDE_P2]: {},
  [DocumentType.ODOMETER_DISCLOSURE]: {},
  [DocumentType.ARBITRATION_AGREEMENT]: {},
  [DocumentType.WE_OWE_DOC]: {},
  [DocumentType.BILL_OF_SALE]: {},
  [DocumentType.MV1_APPLICATION]: {},
  [DocumentType.AS_IS_SOLD]: {},
  [DocumentType.BILL_OF_SALE_TERMS]: {},
};

// Add near the top with other interfaces
interface DocumentData {
  client?: {
    firstName: string;
    lastName: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    email?: string;
    phone?: string;
  };
  vehicle?: {
    vin?: string;
    year?: number;
    make?: string;
    model?: string;
    trim?: string;
    mileage?: number;
  };
  dealership?: {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  saleDate?: string;
  saleAmount?: number;
  salesTax?: number;
  docFee?: number;
  tradeInValue?: number;
  downPayment?: number;
  totalAmount?: number;
  attorneyName?: string;
}

/**
 * Fill a PDF template with data
 */
export async function fillPdfTemplate(
  documentType: DocumentType,
  data: Record<string, string>,
  outputDir: string
): Promise<string> {
  // Get the template file name
  const templateFileName = documentTemplates[documentType];
  
  // Get the field positions for this document type
  const fieldPositions = documentFieldPositions[documentType];
  
  // Load the template PDF
  const templatePath = path.join(process.cwd(), 'public', 'documents', 'templates', templateFileName);
  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);
  
  // Get the font
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // Get the pages
  const pages = pdfDoc.getPages();
  
  // Fill in the fields
  for (const [fieldName, fieldValue] of Object.entries(data)) {
    const position = fieldPositions[fieldName];
    
    if (position) {
      const page = pages[position.page];
      
      // Draw the text
      page.drawText(fieldValue, {
        x: position.x,
        y: position.y,
        size: position.fontSize || 12,
        font,
        color: rgb(0, 0, 0),
        maxWidth: position.maxWidth,
      });
    }
  }
  
  // Save the filled PDF
  const fileName = `${documentType.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
  const outputPath = path.join(outputDir, fileName);
  
  // Ensure the output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Save the PDF to the output path
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  
  // Create a URL to access the file
  const fileUrl = `/documents/generated/${fileName}`;
  
  return fileUrl;
}

/**
 * For server-side deployment, we'll need to save to a storage solution
 * This function demonstrates using a cloud storage service
 */
export async function savePdfToStorage(
  documentType: DocumentType,
  pdfBytes: Uint8Array
): Promise<string> {
  // In a real implementation, this would upload to S3, Azure Blob Storage, etc.
  // For this example, we just return a mock URL
  const fileName = `${documentType.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
  
  // Mock implementation - in production this would call your storage service
  console.log(`Saving ${fileName} to storage (${pdfBytes.length} bytes)`);
  
  // Return a mock URL that would be used to access the file
  return `https://storage.yourdomain.com/documents/${fileName}`;
}

/**
 * Get a list of all template documents available in the system
 */
export function getAvailableTemplates(): DocumentType[] {
  return Object.keys(documentTemplates) as DocumentType[];
}

/**
 * Helper function to convert client and vehicle data to field values
 */
export function prepareDocumentData(
  documentType: DocumentType,
  data: DocumentData
): Record<string, string> {
  // Extract relevant data for each field depending on document type
  const result: Record<string, string> = {};
  
  // Common fields across many documents
  if (data.client) {
    result.clientName = `${data.client.firstName} ${data.client.lastName}`;
    result.clientAddress = data.client.address || '';
    result.clientCity = data.client.city || '';
    result.clientState = data.client.state || '';
    result.clientZip = data.client.zipCode || '';
    result.clientEmail = data.client.email || '';
    result.clientPhone = data.client.phone || '';
  }
  
  if (data.vehicle) {
    result.vehicleVin = data.vehicle.vin || '';
    result.vehicleYear = data.vehicle.year?.toString() || '';
    result.vehicleMake = data.vehicle.make || '';
    result.vehicleModel = data.vehicle.model || '';
    result.vehicleTrim = data.vehicle.trim || '';
    result.vehicleMileage = data.vehicle.mileage?.toString() || '';
  }
  
  if (data.dealership) {
    result.dealerName = data.dealership.name || '';
    result.dealerAddress = data.dealership.address || '';
    result.dealerCity = data.dealership.city || '';
    result.dealerState = data.dealership.state || '';
    result.dealerZip = data.dealership.zipCode || '';
  }
  
  // Sale-specific fields
  result.saleDate = data.saleDate || new Date().toISOString().split('T')[0];
  result.saleAmount = data.saleAmount?.toFixed(2) || '0.00';
  result.salesTax = data.salesTax?.toFixed(2) || '0.00';
  result.docFee = data.docFee?.toFixed(2) || '0.00';
  result.tradeInValue = data.tradeInValue?.toFixed(2) || '0.00';
  result.downPayment = data.downPayment?.toFixed(2) || '0.00';
  result.totalAmount = data.totalAmount?.toFixed(2) || '0.00';
  
  // Add custom logic for specific document types
  switch (documentType) {
    case DocumentType.ODOMETER_DISCLOSURE:
      // Special handling for odometer disclosure
      result.odometerReading = data.vehicle?.mileage?.toString() || '';
      result.odometerDate = new Date().toISOString().split('T')[0];
      break;
      
    case DocumentType.POWER_OF_ATTORNEY:
      // Special handling for power of attorney
      result.attorneyName = data.attorneyName || '';
      break;
      
    // Add cases for other document types that need special handling
  }
  
  return result;
}