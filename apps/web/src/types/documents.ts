// src/types/documents.ts

import type { Client } from "@/types/client";
import type { Vehicle } from "@/types/vehicle";

export enum DocumentType {
  TITLE_REASSIGNMENT = "Motor Vehicle Dealer Title Reassignment",
  TRADE_IN_REDUCTION = "Reduction for Trade In",
  TAX_AD_VALOREM = "Motor Vehicle Division State and Local Title Ad Valorem",
  BAILMENT_AGREEMENT = "Bailment Agreement",
  OFAC_COMPLIANCE = "OFAC Compliance Statement",
  FACTS_DOC = "What We Do With Your Information",
  POWER_OF_ATTORNEY = "Limited Power of Attorney - Motor Vehicle Transactions",
  BUYERS_GUIDE_P1 = "Buyers Guide Part 1",
  BUYERS_GUIDE_P2 = "Buyers Guide Part 2",
  ODOMETER_DISCLOSURE = "Odometer Disclosure Statement",
  ARBITRATION_AGREEMENT = "Arbitration Agreement",
  WE_OWE_DOC = "We Owe Document",
  BILL_OF_SALE = "Bill of Sale",
  MV1_APPLICATION = "MV-1 Motor Vehicle Title Application",
  AS_IS_SOLD = "As-Is Sold Without Warranty",
  BILL_OF_SALE_TERMS = "Bill of Sale Terms and Conditions",
}

export interface DocumentRequirements {
  type: DocumentType;
  required: boolean;
  requiresClientSignature: boolean;
  requiresDealerSignature: boolean;
  requiresNotary: boolean;
}

export interface DealDocument {
  id: string;
  type: DocumentType;
  clientId: string;
  vehicleId: string;
  dealId: string;
  generated: boolean;
  generatedAt: string | null;
  clientSigned: boolean;
  clientSignedAt: string | null;
  dealerSigned: boolean;
  dealerSignedAt: string | null;
  notarized: boolean;
  notarizedAt: string | null;
  documentUrl: string | null;
}

export interface DocumentGenerationRequest {
  clientId: string;
  vehicleId: string;
  dealershipId: string;
  documents: DocumentType[];
  userId: string;
  saleAmount: number;
  salesTax: number;
  docFee: number;
  tradeInValue: number;
  downPayment: number;
  totalAmount: number;
  financedAmount: number;
}

export interface DocumentGenerationResult {
  success: boolean;
  documents: DealDocument[];
  error?: string;
}

// Describes the context needed to generate documents
export interface DocumentContext {
  client: Client;
  vehicle: Vehicle;
  dealershipName: string;
  dealershipAddress: string;
  dealershipCity: string;
  dealershipState: string;
  dealershipZip: string;
  dealershipPhone: string;
  dealerId: string;
  dealerName: string;
  saleDate: string;
  saleAmount: number;
  salesTax: number;
  tradeInValue: number;
  downPayment: number;
  financedAmount: number;
  docFee: number;
  totalAmount: number;
}

export enum DealStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface Deal {
  id: string;
  clientId: string;
  vehicleId: string;
  dealershipId: string;
  userId: string;
  status: DealStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  documents: DealDocument[];
  saleAmount: number;
  salesTax: number;
  tradeInValue: number;
  downPayment: number;
  financedAmount: number;
  docFee: number;
  totalAmount: number;
}