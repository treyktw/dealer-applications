import type { Id } from "@/convex/_generated/dataModel";

export type SignerRole = "buyer" | "seller" | "notary";

export type SessionStatus = "pending" | "signed" | "expired" | "cancelled";

export interface SignatureSession {
  _id: Id<"signatureSessions">;
  sessionToken: string;
  dealId: Id<"deals">;
  documentId: Id<"documentInstances">;
  dealershipId: Id<"dealerships">;
  signerRole: SignerRole;
  signerName: string;
  signerEmail?: string;
  status: SessionStatus;
  signatureS3Key?: string;
  signedAt?: number;
  ipAddress?: string;
  userAgent?: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  consentGiven: boolean;
  consentTimestamp?: number;
  consentText: string;
  createdBy: Id<"users">;
  expiresAt: number;
  createdAt: number;
}

export interface Signature {
  _id: Id<"signatures">;
  dealershipId: Id<"dealerships">;
  dealId: Id<"deals">;
  documentId: Id<"documentInstances">;
  signerRole: SignerRole;
  signerName: string;
  signerEmail?: string;
  s3Key: string;
  imageDataUrl?: string; // Only available for 24hrs
  ipAddress: string;
  userAgent: string;
  geolocation?: {
    latitude: number;
    longitude: number;
  };
  consentGiven: boolean;
  consentText: string;
  consentTimestamp: number;
  createdAt: number;
  scheduledDeletionAt: number;
  deletedAt?: number;
}

export interface ESignatureConsent {
  _id: Id<"eSignatureConsents">;
  dealershipId: Id<"dealerships">;
  clientId?: Id<"clients">;
  dealId: Id<"deals">;
  consentGiven: boolean;
  consentText: string;
  consentVersion: string;
  ipAddress: string;
  userAgent: string;
  timestamp: number;
  revoked: boolean;
  revokedAt?: number;
  revokedReason?: string;
}