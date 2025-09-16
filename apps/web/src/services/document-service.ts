// src/services/document-service.ts
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { db } from "@/db";
import { 
  DocumentType, 
  DocumentGenerationRequest, 
  DocumentGenerationResult, 
  DealDocument,
  DocumentContext,
  Deal,
  DealStatus
} from "@/types/documents";
import { Client } from "@/types/client";
import { Vehicle, VehicleStatus } from "@/types/vehicle";

// Import the schema
import { 
  deals as dealsTable,
  dealDocuments as dealDocumentsTable,
  clients,
  vehicles,
  dealerships
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Import the PDF template processing service
import { 
  fillPdfTemplate, 
  prepareDocumentData, 
} from "@/services/pdf-template-service";

// This function would gather all the necessary context data for document generation
async function prepareDocumentContext(
  clientId: string,
  vehicleId: string,
  dealershipId: string
): Promise<DocumentContext> {
  // Fetch client data with relations
  const clientResult = await db.query.clients.findFirst({
    where: and(
      eq(clients.id, clientId),
      eq(clients.dealershipId, dealershipId)
    ),
  });

  if (!clientResult) {
    throw new Error("Client not found");
  }

  // Convert to Client type
  const client: Client = {
    id: clientResult.id,
    firstName: clientResult.firstName,
    lastName: clientResult.lastName,
    email: clientResult.email,
    phone: clientResult.phone,
    address: clientResult.address,
    city: clientResult.city,
    state: clientResult.state,
    zipCode: clientResult.zipCode,
    source: clientResult.source,
    status: clientResult.status || 'LEAD',
    notes: clientResult.notes,
    createdAt: clientResult.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: clientResult.updatedAt?.toISOString() || new Date().toISOString(),
    dealershipId: clientResult.dealershipId
  };

  // Fetch vehicle data with relations
  const vehicleResult = await db.query.vehicles.findFirst({
    where: and(
      eq(vehicles.id, vehicleId),
      eq(vehicles.dealershipId, dealershipId)
    ),
    with: {
      images: true,
      features: true
    }
  });

  if (!vehicleResult) {
    throw new Error("Vehicle not found");
  }

  // Convert to Vehicle type
  const vehicle: Vehicle = {
    id: vehicleResult.id,
    stock: vehicleResult.stock,
    vin: vehicleResult.vin,
    make: vehicleResult.make,
    model: vehicleResult.model,
    year: vehicleResult.year,
    trim: vehicleResult.trim,
    mileage: vehicleResult.mileage,
    price: vehicleResult.price,
    exteriorColor: vehicleResult.exteriorColor,
    interiorColor: vehicleResult.interiorColor,
    fuelType: vehicleResult.fuelType,
    transmission: vehicleResult.transmission,
    engine: vehicleResult.engine,
    description: vehicleResult.description,
    status: (vehicleResult.status?.toLowerCase() || 'available') as VehicleStatus,
    featured: vehicleResult.featured || false,
    dealershipId: vehicleResult.dealershipId,
    images: vehicleResult.images.map(img => ({
      ...img,
      isPrimary: img.isPrimary || false
    })),
    features: vehicleResult.features,
    createdAt: vehicleResult.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: vehicleResult.updatedAt?.toISOString() || new Date().toISOString()
  };

  // Fetch dealership data
  const dealership = await db.query.dealerships.findFirst({
    where: eq(dealerships.id, dealershipId),
  });

  if (!dealership) {
    throw new Error("Dealership not found");
  }

  // Calculate financial details
  const saleAmount = vehicle.price;
  const salesTax = saleAmount * 0.07; // Example 7% tax rate
  const tradeInValue = 0; // Default value, would be specified by user
  const downPayment = 0; // Default value, would be specified by user
  const docFee = 699; // Example document fee
  const totalAmount = saleAmount + salesTax + docFee - tradeInValue - downPayment;
  const financedAmount = totalAmount; // Default to financing the full amount

  return {
    client,
    vehicle,
    dealershipName: dealership.name,
    dealershipAddress: dealership.address || "",
    dealershipCity: dealership.city || "",
    dealershipState: dealership.state || "",
    dealershipZip: dealership.zipCode || "",
    dealershipPhone: dealership.phone || "",
    dealerId: dealershipId,
    dealerName: dealership.name,
    saleDate: format(new Date(), "yyyy-MM-dd"),
    saleAmount,
    salesTax,
    tradeInValue,
    downPayment,
    financedAmount,
    docFee,
    totalAmount,
  };
}

// Generate a document using the PDF template
async function generateDocument(
  documentType: DocumentType,
  context: DocumentContext
): Promise<string> {
  try {
    // Prepare data for the document
    const documentData = prepareDocumentData(documentType, {
      client: {
        firstName: context.client.firstName,
        lastName: context.client.lastName,
        address: context.client.address || undefined,
        city: context.client.city || undefined,
        state: context.client.state || undefined,
        zipCode: context.client.zipCode || undefined,
        email: context.client.email || undefined,
        phone: context.client.phone || undefined,
      },
      vehicle: {
        vin: context.vehicle.vin,
        year: context.vehicle.year,
        make: context.vehicle.make,
        model: context.vehicle.model,
        trim: context.vehicle.trim || undefined,
        mileage: context.vehicle.mileage,
      },
      dealership: {
        name: context.dealershipName,
        address: context.dealershipAddress,
        city: context.dealershipCity,
        state: context.dealershipState,
        zipCode: context.dealershipZip,
      },
      saleDate: context.saleDate,
      saleAmount: context.saleAmount,
      salesTax: context.salesTax,
      docFee: context.docFee,
      tradeInValue: context.tradeInValue,
      downPayment: context.downPayment,
      totalAmount: context.totalAmount,
    });
    
    // In a server environment, we would use a path in the file system
    const outputDir = "./public/documents/generated";
    
    // Fill the PDF template with the data
    const documentUrl = await fillPdfTemplate(
      documentType,
      documentData,
      outputDir
    );
    
    return documentUrl;
  } catch (error) {
    console.error(`Error generating document ${documentType}:`, error);
    throw new Error(`Failed to generate document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Main document generation function
export async function generateDealDocuments(
  request: DocumentGenerationRequest
): Promise<DocumentGenerationResult> {
  try {
    // Prepare document generation context
    const context = await prepareDocumentContext(
      request.clientId,
      request.vehicleId,
      request.dealershipId
    );
    
    // Create a new deal record
    const dealId = uuidv4();
    await db.insert(dealsTable).values({
      id: dealId,
      clientId: request.clientId,
      vehicleId: request.vehicleId,
      dealershipId: request.dealershipId,
      userId: request.userId,
      status: DealStatus.DRAFT,
      saleAmount: sql`${context.saleAmount}::decimal`,
      salesTax: sql`${context.salesTax}::decimal`,
      tradeInValue: sql`${context.tradeInValue}::decimal`,
      downPayment: sql`${context.downPayment}::decimal`,
      financedAmount: sql`${context.financedAmount}::decimal`,
      docFee: sql`${context.docFee}::decimal`,
      totalAmount: sql`${context.totalAmount}::decimal`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Generate each document and create records
    const documents: DealDocument[] = [];
    
    for (const documentType of request.documents) {
      // Generate the document
      const documentUrl = await generateDocument(documentType, context);
      
      // Create document record
      const [newDocument] = await db.insert(dealDocumentsTable).values({
        id: uuidv4(),
        type: documentType,
        clientId: request.clientId,
        vehicleId: request.vehicleId,
        dealId: dealId,
        generated: true,
        generatedAt: new Date(),
        clientSigned: false,
        dealerSigned: false,
        notarized: false,
        documentUrl: documentUrl,
      }).returning();

      // Convert to DealDocument type
      const dealDocument: DealDocument = {
        id: newDocument.id,
        type: documentType,
        clientId: newDocument.clientId,
        vehicleId: newDocument.vehicleId,
        dealId: newDocument.dealId,
        generated: newDocument.generated || false,
        generatedAt: newDocument.generatedAt?.toISOString() || null,
        clientSigned: newDocument.clientSigned || false,
        clientSignedAt: newDocument.clientSignedAt?.toISOString() || null,
        dealerSigned: newDocument.dealerSigned || false,
        dealerSignedAt: newDocument.dealerSignedAt?.toISOString() || null,
        notarized: newDocument.notarized || false,
        notarizedAt: newDocument.notarizedAt?.toISOString() || null,
        documentUrl: newDocument.documentUrl,
      };
      
      documents.push(dealDocument);
    }
    
    return {
      success: true,
      documents,
    };
  } catch (error) {
    console.error("Error generating documents:", error);
    return {
      success: false,
      documents: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Function to retrieve all documents for a deal
export async function getDealDocuments(dealId: string): Promise<DealDocument[]> {
  const documentsResult = await db.query.dealDocuments.findMany({
    where: eq(dealDocumentsTable.dealId, dealId),
  });
  
  // Convert to DealDocument type
  return documentsResult.map(doc => ({
    id: doc.id,
    type: doc.type as DocumentType,
    clientId: doc.clientId,
    vehicleId: doc.vehicleId,
    dealId: doc.dealId,
    generated: doc.generated || false,
    generatedAt: doc.generatedAt?.toISOString() || null,
    clientSigned: doc.clientSigned || false,
    clientSignedAt: doc.clientSignedAt?.toISOString() || null,
    dealerSigned: doc.dealerSigned || false,
    dealerSignedAt: doc.dealerSignedAt?.toISOString() || null,
    notarized: doc.notarized || false,
    notarizedAt: doc.notarizedAt?.toISOString() || null,
    documentUrl: doc.documentUrl,
  }));
}

// Function to get a deal by ID
export async function getDeal(dealId: string): Promise<Deal | null> {
  const dealResult = await db.query.deals.findFirst({
    where: eq(dealsTable.id, dealId),
    with: {
      documents: true,
    },
  });

  if (!dealResult) {
    return null;
  }

  // Convert to Deal type
  return {
    id: dealResult.id,
    clientId: dealResult.clientId,
    vehicleId: dealResult.vehicleId,
    dealershipId: dealResult.dealershipId,
    userId: dealResult.userId,
    status: dealResult.status as DealStatus,
    createdAt: dealResult.createdAt.toISOString(),
    updatedAt: dealResult.updatedAt.toISOString(),
    completedAt: dealResult.completedAt?.toISOString() || null,
    cancelledAt: dealResult.cancelledAt?.toISOString() || null,
    documents: dealResult.documents.map(doc => ({
      id: doc.id,
      type: doc.type as DocumentType,
      clientId: doc.clientId,
      vehicleId: doc.vehicleId,
      dealId: doc.dealId,
      generated: doc.generated || false,
      generatedAt: doc.generatedAt?.toISOString() || null,
      clientSigned: doc.clientSigned || false,
      clientSignedAt: doc.clientSignedAt?.toISOString() || null,
      dealerSigned: doc.dealerSigned || false,
      dealerSignedAt: doc.dealerSignedAt?.toISOString() || null,
      notarized: doc.notarized || false,
      notarizedAt: doc.notarizedAt?.toISOString() || null,
      documentUrl: doc.documentUrl,
    })),
    saleAmount: Number(dealResult.saleAmount),
    salesTax: Number(dealResult.salesTax),
    tradeInValue: Number(dealResult.tradeInValue),
    downPayment: Number(dealResult.downPayment),
    financedAmount: Number(dealResult.financedAmount),
    docFee: Number(dealResult.docFee),
    totalAmount: Number(dealResult.totalAmount),
  };
}

// Function to get deals for a client
export async function getClientDeals(clientId: string): Promise<Deal[]> {
  const dealsResult = await db.query.deals.findMany({
    where: eq(dealsTable.clientId, clientId),
    with: {
      documents: true,
    },
  });
  
  // Convert to Deal type
  return dealsResult.map(deal => ({
    id: deal.id,
    clientId: deal.clientId,
    vehicleId: deal.vehicleId,
    dealershipId: deal.dealershipId,
    userId: deal.userId,
    status: deal.status as DealStatus,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
    completedAt: deal.completedAt?.toISOString() || null,
    cancelledAt: deal.cancelledAt?.toISOString() || null,
    documents: deal.documents.map(doc => ({
      id: doc.id,
      type: doc.type as DocumentType,
      clientId: doc.clientId,
      vehicleId: doc.vehicleId,
      dealId: doc.dealId,
      generated: doc.generated || false,
      generatedAt: doc.generatedAt?.toISOString() || null,
      clientSigned: doc.clientSigned || false,
      clientSignedAt: doc.clientSignedAt?.toISOString() || null,
      dealerSigned: doc.dealerSigned || false,
      dealerSignedAt: doc.dealerSignedAt?.toISOString() || null,
      notarized: doc.notarized || false,
      notarizedAt: doc.notarizedAt?.toISOString() || null,
      documentUrl: doc.documentUrl,
    })),
    saleAmount: Number(deal.saleAmount),
    salesTax: Number(deal.salesTax),
    tradeInValue: Number(deal.tradeInValue),
    downPayment: Number(deal.downPayment),
    financedAmount: Number(deal.financedAmount),
    docFee: Number(deal.docFee),
    totalAmount: Number(deal.totalAmount),
  }));
}

// Function to update deal status
export async function updateDealStatus(
  dealId: string, 
  status: DealStatus
): Promise<Deal | null> {
  const [dealResult] = await db.update(dealsTable)
    .set({ 
      status,
      updatedAt: new Date(),
      ...(status === DealStatus.COMPLETED ? { completedAt: new Date() } : {}),
      ...(status === DealStatus.CANCELLED ? { cancelledAt: new Date() } : {}),
    })
    .where(eq(dealsTable.id, dealId))
    .returning();

  if (!dealResult) {
    return null;
  }

  // Fetch the deal with documents to return complete Deal type
  return getDeal(dealId);
}

// Function to mark a document as signed by the client
export async function markDocumentClientSigned(documentId: string): Promise<DealDocument | null> {
  const [docResult] = await db.update(dealDocumentsTable)
    .set({ 
      clientSigned: true,
      clientSignedAt: new Date(),
    })
    .where(eq(dealDocumentsTable.id, documentId))
    .returning();

  if (!docResult) {
    return null;
  }

  return {
    id: docResult.id,
    type: docResult.type as DocumentType,
    clientId: docResult.clientId,
    vehicleId: docResult.vehicleId,
    dealId: docResult.dealId,
    generated: docResult.generated || false,
    generatedAt: docResult.generatedAt?.toISOString() || null,
    clientSigned: docResult.clientSigned || false,
    clientSignedAt: docResult.clientSignedAt?.toISOString() || null,
    dealerSigned: docResult.dealerSigned || false,
    dealerSignedAt: docResult.dealerSignedAt?.toISOString() || null,
    notarized: docResult.notarized || false,
    notarizedAt: docResult.notarizedAt?.toISOString() || null,
    documentUrl: docResult.documentUrl,
  };
}

// Function to mark a document as signed by the dealer
export async function markDocumentDealerSigned(documentId: string): Promise<DealDocument | null> {
  const [docResult] = await db.update(dealDocumentsTable)
    .set({ 
      dealerSigned: true,
      dealerSignedAt: new Date(),
    })
    .where(eq(dealDocumentsTable.id, documentId))
    .returning();

  if (!docResult) {
    return null;
  }

  return {
    id: docResult.id,
    type: docResult.type as DocumentType,
    clientId: docResult.clientId,
    vehicleId: docResult.vehicleId,
    dealId: docResult.dealId,
    generated: docResult.generated || false,
    generatedAt: docResult.generatedAt?.toISOString() || null,
    clientSigned: docResult.clientSigned || false,
    clientSignedAt: docResult.clientSignedAt?.toISOString() || null,
    dealerSigned: docResult.dealerSigned || false,
    dealerSignedAt: docResult.dealerSignedAt?.toISOString() || null,
    notarized: docResult.notarized || false,
    notarizedAt: docResult.notarizedAt?.toISOString() || null,
    documentUrl: docResult.documentUrl,
  };
}

// Function to mark a document as notarized
export async function markDocumentNotarized(documentId: string): Promise<DealDocument | null> {
  const [docResult] = await db.update(dealDocumentsTable)
    .set({ 
      notarized: true,
      notarizedAt: new Date(),
    })
    .where(eq(dealDocumentsTable.id, documentId))
    .returning();

  if (!docResult) {
    return null;
  }

  return {
    id: docResult.id,
    type: docResult.type as DocumentType,
    clientId: docResult.clientId,
    vehicleId: docResult.vehicleId,
    dealId: docResult.dealId,
    generated: docResult.generated || false,
    generatedAt: docResult.generatedAt?.toISOString() || null,
    clientSigned: docResult.clientSigned || false,
    clientSignedAt: docResult.clientSignedAt?.toISOString() || null,
    dealerSigned: docResult.dealerSigned || false,
    dealerSignedAt: docResult.dealerSignedAt?.toISOString() || null,
    notarized: docResult.notarized || false,
    notarizedAt: docResult.notarizedAt?.toISOString() || null,
    documentUrl: docResult.documentUrl,
  };
}
