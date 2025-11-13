/**
 * SQLite Documents Service
 * Wraps Tauri commands for document CRUD operations
 * Documents are stored as files on disk, metadata in SQLite
 */

import { invoke } from "@tauri-apps/api/core";

export interface LocalDocument {
  id: string;
  deal_id: string;
  type: string;
  filename: string;
  file_path: string; // Path to PDF file on disk
  file_size?: number;
  file_checksum?: string;
  created_at: number;
  updated_at: number;
  synced_at?: number;
}

/**
 * Get documents storage path (docsRoot)
 * Priority:
 * 1. User-chosen path from secure storage
 * 2. Default: AppData/DealerDocs/
 */
export async function getDocumentsPath(): Promise<string> {
  try {
    // First, check if user has chosen a custom path (stored in secure storage)
    const customPath = await invoke<string | null>("get_documents_root_path");
    
    if (customPath && customPath.trim() !== "") {
      console.log("📂 [DOCUMENTS] Using user-chosen documents path:", customPath);
      return customPath;
    }
    
    // Fallback to default path
    const defaultPath = await invoke<string>("get_documents_storage_path");
    if (!defaultPath || defaultPath.trim() === "") {
      throw new Error("Documents storage path is empty");
    }
    
    console.log("📂 [DOCUMENTS] Using default documents path:", defaultPath);
    return defaultPath;
  } catch (error) {
    console.error("❌ [DOCUMENTS] Error getting documents storage path:", error);
    throw new Error(`Failed to get documents storage path: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Prompt user to select documents root directory (first-run setup)
 * Stores the selected path securely
 */
export async function promptSelectDocumentsDirectory(): Promise<string | null> {
  try {
    const selectedPath = await invoke<string | null>("prompt_select_documents_directory");
    
    if (selectedPath && selectedPath.trim() !== "") {
      // Store the selected path securely
      await invoke("store_documents_root_path", { path: selectedPath });
      console.log("✅ [DOCUMENTS] Documents root path stored:", selectedPath);
      return selectedPath;
    }
    
    return null;
  } catch (error) {
    console.error("❌ [DOCUMENTS] Error selecting documents directory:", error);
    throw error;
  }
}

/**
 * Check if documents root path is configured
 */
export async function hasDocumentsRootPath(): Promise<boolean> {
  try {
    const path = await invoke<string | null>("get_documents_root_path");
    return path !== null && path !== undefined && path.trim() !== "";
  } catch (error) {
    console.error("❌ [DOCUMENTS] Error checking documents root path:", error);
    return false;
  }
}

/**
 * Create a new document
 * Saves the PDF blob to disk and stores metadata in SQLite
 * Path format: documents/{firstname}/{dealId}/{nameofdeal}.pdf
 */
export async function createDocument(
  document: Omit<LocalDocument, "id" | "created_at" | "updated_at">,
  pdfBlob: Blob,
  clientFirstName?: string
): Promise<LocalDocument> {
  try {
    console.log("📄 [CREATE-DOCUMENT] Starting document creation...");
    const now = Date.now();
    const id = `doc_${crypto.randomUUID()}`;
    
    // Validate required fields
    if (!document.deal_id || document.deal_id.trim() === "") {
      throw new Error("deal_id is required");
    }
    if (!document.filename || document.filename.trim() === "") {
      throw new Error("filename is required");
    }
    
    console.log("📄 [CREATE-DOCUMENT] Getting documents path...");
    const documentsPath = await getDocumentsPath();
    console.log("📄 [CREATE-DOCUMENT] Documents path:", documentsPath);
    
    // Sanitize first name for path (remove special chars, spaces, lowercase)
    const firstNameSegment = clientFirstName
      ? clientFirstName.trim().toLowerCase().replace(/[^a-z0-9]/g, "_")
      : "unknown";
    
    const dealIdSegment = document.deal_id.trim();
    // Use just the filename without UUID prefix, ensure .pdf extension
    const filenameBase = document.filename.trim().replace(/\.pdf$/i, "");
    const filenameSegment = `${filenameBase}.pdf`;
    
    if (!dealIdSegment || !filenameSegment) {
      throw new Error("Invalid path segments: deal_id or filename is empty");
    }
    
    console.log("📄 [CREATE-DOCUMENT] Creating document directory path...");
    // Path format: documents/{firstname}/{dealId}/{nameofdeal}.pdf
    const firstNameDir = await invoke<string>("join_path", {
      segments: [documentsPath, firstNameSegment],
    });
    const dealDir = await invoke<string>("join_path", {
      segments: [firstNameDir, dealIdSegment],
    });
    console.log("📄 [CREATE-DOCUMENT] Deal directory:", dealDir);
    
    // Create full file path: documents/{firstname}/{dealId}/{nameofdeal}.pdf
    const filePath = await invoke<string>("join_path", {
      segments: [dealDir, filenameSegment],
    });
    console.log("📄 [CREATE-DOCUMENT] Full file path:", filePath);
    
    // Convert Blob to Uint8Array
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    console.log("📄 [CREATE-DOCUMENT] PDF size:", uint8Array.length, "bytes");
    
    // Write file to disk using Tauri command
    // Tauri automatically converts camelCase to snake_case, so use camelCase here
    console.log("📄 [CREATE-DOCUMENT] Writing file to disk...");
    await invoke("write_file_to_path", {
      filePath: filePath,
      fileData: Array.from(uint8Array),
    });
    console.log("✅ [CREATE-DOCUMENT] File written to disk successfully");
    
    // Get file size
    const fileSize = uint8Array.length;
    
    // Create document record
    const newDocument: LocalDocument = {
      ...document,
      id,
      file_path: filePath,
      file_size: fileSize,
      created_at: now,
      updated_at: now,
    };

    console.log("📄 [CREATE-DOCUMENT] Saving document metadata to database...");
    const savedDocument = await invoke<LocalDocument>("db_create_document", {
      document: newDocument,
    });
    console.log("✅ [CREATE-DOCUMENT] Document saved to database:", savedDocument.id);
    
    return savedDocument;
  } catch (error) {
    console.error("❌ [CREATE-DOCUMENT] Error creating document:", error);
    throw error;
  }
}

/**
 * Get a document by ID
 * Returns undefined on error to prevent crashes
 * Wrapped in multiple layers of error handling to catch Rust panics
 */
export async function getDocument(
  id: string
): Promise<LocalDocument | undefined> {
  // Early validation - use try-catch for validation to prevent crashes
  let trimmedId: string;
  try {
    // Check if id exists
    if (id == null) { // Use == to catch both null and undefined
      return undefined;
    }
    
    // Safely convert to string
    trimmedId = String(id);
    
    // Safely trim
    if (trimmedId.trim) {
      trimmedId = trimmedId.trim();
    }
    
    // Check if empty
    if (!trimmedId || trimmedId.length === 0) {
      return undefined;
    }
  } catch (validationError) {
    console.warn("⚠️ [GET-DOCUMENT] Validation error:", validationError);
    return undefined;
  }

  // Wrap in Promise.resolve to ensure it's always a promise
  try {
    // Double-wrap to catch any synchronous errors
    const result = await Promise.resolve().then(async () => {
      try {
        // Check if invoke is available
        if (typeof invoke !== "function") {
          console.warn("⚠️ [GET-DOCUMENT] invoke function is not available");
          return undefined;
        }
        
        // Check if we're in Tauri environment
        if (typeof window !== "undefined" && !("__TAURI__" in window)) {
          console.warn("⚠️ [GET-DOCUMENT] Not in Tauri environment");
          return undefined;
        }
        
        // Use requestIdleCallback or setTimeout to prevent blocking the UI thread
        await new Promise(resolve => {
          if (typeof requestIdleCallback !== "undefined") {
            requestIdleCallback(() => resolve(undefined), { timeout: 100 });
          } else {
            setTimeout(() => resolve(undefined), 0);
          }
        });
        
        const invokeResult = await invoke<LocalDocument | null>("db_get_document", { 
          id: trimmedId 
        });
        
        // Validate result
        if (invokeResult === null || invokeResult === undefined) {
          return undefined;
        }
        
        // Ensure result has required fields
        if (typeof invokeResult !== "object") {
          console.warn("⚠️ [GET-DOCUMENT] Invalid result type:", typeof invokeResult);
          return undefined;
        }
        
        return invokeResult as LocalDocument;
      } catch (invokeError) {
        // Re-throw to outer catch
        throw invokeError;
      }
    });
    
    return result || undefined;
  } catch (error) {
    // Catch all errors including Rust panics, network errors, etc.
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("❌ [GET-DOCUMENT] Error fetching document", trimmedId, ":", errorMessage);
    if (errorStack) {
      console.error("❌ [GET-DOCUMENT] Stack trace:", errorStack);
    }
    
    // Return undefined instead of throwing to prevent crashes
    return undefined;
  }
}

/**
 * Get document PDF as Blob
 */
export async function getDocumentBlob(
  id: string
): Promise<Blob | undefined> {
  const doc = await getDocument(id);
  if (!doc) return undefined;

  try {
    const fileData = await invoke<number[]>("read_binary_file", {
      filePath: doc.file_path,
    });
    const uint8Array = new Uint8Array(fileData);
    return new Blob([uint8Array], { type: "application/pdf" });
  } catch (error) {
    console.error("Error reading document file:", error);
    return undefined;
  }
}

/**
 * Get all documents for a deal
 * Returns empty array on error to prevent crashes
 * Wrapped in multiple layers of error handling to catch Rust panics
 */
export async function getDocumentsByDeal(
  dealId: string
): Promise<LocalDocument[]> {
  // Early validation - use try-catch for validation to prevent crashes
  let trimmedDealId: string;
  try {
    // Check if dealId exists
    if (dealId == null) { // Use == to catch both null and undefined
      return [];
    }
    
    // Safely convert to string
    trimmedDealId = String(dealId);
    
    // Safely trim
    if (trimmedDealId.trim) {
      trimmedDealId = trimmedDealId.trim();
    }
    
    // Check if empty
    if (!trimmedDealId || trimmedDealId.length === 0) {
      return [];
    }
  } catch (validationError) {
    console.warn("⚠️ [GET-DOCUMENTS] Validation error:", validationError);
    return [];
  }

  // Wrap in Promise.resolve to ensure it's always a promise
  try {
    console.log("📄 [GET-DOCUMENTS] Fetching documents for deal:", trimmedDealId);
    
    // Double-wrap to catch any synchronous errors
    const result = await Promise.resolve().then(async () => {
      // Check if invoke is available
      if (typeof invoke !== "function") {
        console.warn("⚠️ [GET-DOCUMENTS] invoke function is not available");
        return [];
      }
      
      // Check if we're in Tauri environment
      if (typeof window !== "undefined" && !("__TAURI__" in window)) {
        console.warn("⚠️ [GET-DOCUMENTS] Not in Tauri environment");
        return [];
      }
      
      // Use requestIdleCallback or setTimeout to prevent blocking the UI thread
      await new Promise(resolve => {
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(() => resolve(undefined), { timeout: 100 });
        } else {
          setTimeout(() => resolve(undefined), 0);
        }
      });
      
      // Tauri converts camelCase to snake_case, so use dealId here
      const invokePromise = invoke<LocalDocument[]>("db_get_documents_by_deal", {
        dealId: trimmedDealId,
      });
      
      // Add timeout to prevent hanging (with cleanup)
      let timeoutId: NodeJS.Timeout | null = null;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("getDocumentsByDeal timeout after 10 seconds")), 10000);
      });
      
      try {
        const documents = await Promise.race([invokePromise, timeoutPromise]);
        
        // Clear timeout if promise resolved successfully
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        // Validate response
        if (!Array.isArray(documents)) {
          console.warn("⚠️ [GET-DOCUMENTS] Invalid response format, expected array:", typeof documents);
          return [];
        }
        
        // Validate each document in the array
        const validDocuments = documents.filter((doc) => {
          if (!doc || typeof doc !== "object") {
            console.warn("⚠️ [GET-DOCUMENTS] Invalid document in array:", doc);
            return false;
          }
          return true;
        });
        
        console.log("✅ [GET-DOCUMENTS] Retrieved", validDocuments.length, "documents");
        return validDocuments as LocalDocument[];
      } catch (raceError) {
        // Clear timeout on error
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        throw raceError;
      }
    });
    
    return result || [];
  } catch (error) {
    // Catch all errors including Rust panics, network errors, etc.
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error("❌ [GET-DOCUMENTS] Error fetching documents for deal", trimmedDealId, ":", errorMessage);
    if (errorStack) {
      console.error("❌ [GET-DOCUMENTS] Stack trace:", errorStack);
    }
    
    // Don't crash the app - return empty array instead
    // Callers can check if array is empty to determine if there was an error
    return [];
  }
}

/**
 * Update a document
 */
export async function updateDocument(
  id: string,
  updates: Partial<Omit<LocalDocument, "id" | "created_at">>
): Promise<LocalDocument> {
  return await invoke<LocalDocument>("db_update_document", { id, updates });
}

/**
 * Delete a document
 * Deletes both the file and database record
 */
export async function deleteDocument(id: string): Promise<void> {
  const doc = await getDocument(id);
  if (!doc) return;

  // Delete file from disk
  try {
    await invoke("remove_file", { filePath: doc.file_path });
  } catch (error) {
    console.error("Error deleting document file:", error);
    // Continue with database deletion even if file deletion fails
  }

  // Delete from database
  await invoke("db_delete_document", { id });
}

/**
 * Convert base64 string to Blob
 */
export function base64ToBlob(
  base64: string,
  mimeType: string = "application/pdf"
): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Convert Blob to base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

