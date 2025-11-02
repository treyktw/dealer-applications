// src/lib/document-storage/indexeddb-schema.ts

export interface DraftDocument {
  id: string; // documentId
  pdfBlob: Blob; // The actual PDF binary
  version: number; // Incremental version
  fieldValues: Record<string, any>; // Current field state
  lastModified: number; // Timestamp
  createdAt: number; // Timestamp
  status: 'draft' | 'finalizing' | 'finalized';
  size: number; // Blob size in bytes
  checksum?: string; // Optional integrity check
}

export interface DraftVersion {
  id: string; // `${documentId}_v${version}`
  documentId: string;
  version: number;
  pdfBlob: Blob;
  fieldValues: Record<string, any>;
  createdAt: number;
  size: number;
}

export interface FieldChangeLog {
  id: string; // Auto-generated
  documentId: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}