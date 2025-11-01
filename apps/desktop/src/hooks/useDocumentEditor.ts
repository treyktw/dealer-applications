// src/hooks/useDocumentEditor.ts
// WITH AUTOMATIC PDF FIELD REPAIR

import { useState, useEffect, useCallback, useRef } from "react";
import { documentStorage } from "@/lib/document-storage/document-storage-service";
import {
  updatePDFFields,
  extractPDFFieldValues,
  createDebouncedPDFUpdater,
} from "@/lib/document-storage/pdf-field-updater";
import { repairPDFFieldAppearances, needsFieldRepair } from "@/lib/document-storage/pdf-field-repair";
import { convexMutation, convexAction } from "@/lib/convex";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// ==================== Types ====================

interface UseDocumentEditorOptions {
  documentId: string;
  sessionToken?: string;
  autoSaveEnabled?: boolean;
  autoSaveDelay?: number;
  onSaveSuccess?: () => void;
  onSaveError?: (error: Error) => void;
  onFinalized?: () => void;
}

interface DocumentEditorState {
  isLoading: boolean;
  isInitialized: boolean;
  pdfBuffer: ArrayBuffer | null;
  fieldValues: Record<string, unknown>;
  downloadUrl?: string;
  hasChanges: boolean;
  isSaving: boolean;
  lastSaved: number | null;
  status: "draft" | "finalizing" | "finalized";
  error: Error | null;
}

// ==================== Hook ====================

export function useDocumentEditor(options: UseDocumentEditorOptions) {
  const {
    documentId,
    sessionToken,
    autoSaveEnabled = true,
    autoSaveDelay = 2000,
    onSaveSuccess,
    onSaveError,
    onFinalized,
  } = options;

  // ==================== State ====================

  const [state, setState] = useState<DocumentEditorState>({
    isLoading: true,
    isInitialized: false,
    pdfBuffer: null,
    fieldValues: {},
    downloadUrl: undefined,
    hasChanges: false,
    isSaving: false,
    lastSaved: null,
    status: "draft",
    error: null,
  });

  // ==================== Refs ====================

  const debouncedUpdaterRef = useRef<ReturnType<
    typeof createDebouncedPDFUpdater
  > | null>(null);
  const initialFieldValuesRef = useRef<Record<string, unknown>>({});
  const mountedRef = useRef(true);
  const initializingRef = useRef(false);
  const pdfBufferRef = useRef<ArrayBuffer | null>(null);

  // ==================== Initialize ====================

  useEffect(() => {
    mountedRef.current = true;

    if (initializingRef.current) {
      console.log("⏭️ Skipping duplicate initialization");
      return;
    }

    if (
      !documentId ||
      typeof documentId !== "string" ||
      documentId.trim().length === 0
    ) {
      console.warn("⚠️ Invalid documentId, skipping initialization");
      return;
    }

    initializingRef.current = true;

    const initialize = async () => {
      try {
        console.log("🔄 Initializing document editor for:", documentId);

        await documentStorage.initialize();

        let pdfBuffer: ArrayBuffer | null =
          await documentStorage.loadDraft(documentId);
        let fieldValues: Record<string, unknown> = {};
        let status: "draft" | "finalizing" | "finalized" = "draft";
        let downloadUrl: string | undefined = undefined;

        if (pdfBuffer && pdfBuffer.byteLength > 32) {
          console.log(`✅ Draft found (${pdfBuffer.byteLength} bytes)`);

          // **CHECK IF PDF NEEDS REPAIR**
          const needsRepair = await needsFieldRepair(pdfBuffer);
          if (needsRepair) {
            console.log('🔧 PDF fields need repair, fixing now...');
            pdfBuffer = await repairPDFFieldAppearances(pdfBuffer);
            console.log('✅ PDF fields repaired');
            
            // Save the repaired version
            const metadata = await documentStorage.getDraftMetadata(documentId);
            fieldValues = metadata?.fieldValues || {};
            await documentStorage.saveDraft(documentId, pdfBuffer, fieldValues);
          } else {
            const metadata = await documentStorage.getDraftMetadata(documentId);
            fieldValues = metadata?.fieldValues || {};
          }

          status = (await documentStorage.getDraftMetadata(documentId))?.status || "draft";

          try {
            const urlResp = await convexAction(
              api.documents.generator.getDocumentDownloadUrl,
              {
                documentId: documentId as Id<"documentInstances">,
                token: sessionToken,
                expiresIn: 300,
              }
            );
            downloadUrl = urlResp.downloadUrl;
            console.log("📎 S3 download URL obtained");
          } catch (e) {
            console.warn("⚠️ Failed to get S3 URL:", e);
          }
        } else {
          console.log("☁️ No local draft, fetching from S3...");

          const doc = await fetchDocumentFromS3(documentId, sessionToken);
          pdfBuffer = doc.buffer;
          downloadUrl = doc.downloadUrl;

          if (!pdfBuffer || pdfBuffer.byteLength < 32) {
            throw new Error("Failed to fetch valid PDF from S3");
          }

          console.log(`✅ Fetched from S3 (${pdfBuffer.byteLength} bytes)`);

          // **REPAIR NEWLY FETCHED PDF**
          const needsRepair = await needsFieldRepair(pdfBuffer);
          if (needsRepair) {
            console.log('🔧 Repairing fields in S3 PDF...');
            pdfBuffer = await repairPDFFieldAppearances(pdfBuffer);
            console.log('✅ S3 PDF fields repaired');
          }

          fieldValues = await extractPDFFieldValues(pdfBuffer);
          await documentStorage.saveDraft(documentId, pdfBuffer, fieldValues);
          console.log("💾 Saved initial draft to storage");
        }

        if (!mountedRef.current) {
          console.warn("⚠️ Component unmounted during initialization");
          return;
        }

        initialFieldValuesRef.current = { ...fieldValues };
        pdfBufferRef.current = pdfBuffer ? pdfBuffer.slice(0) : null;

        debouncedUpdaterRef.current = createDebouncedPDFUpdater(
          async (updatedBuffer, updatedFields) => {
            if (!mountedRef.current) return;

            const clonedBuffer = updatedBuffer.slice(0);
            await documentStorage.saveDraft(documentId, clonedBuffer, {
              ...initialFieldValuesRef.current,
              ...updatedFields,
            });

            if (mountedRef.current) {
              pdfBufferRef.current = updatedBuffer.slice(0);

              setState((prev) => ({
                ...prev,
                pdfBuffer: updatedBuffer.slice(0),
                fieldValues: { ...prev.fieldValues, ...updatedFields },
                lastSaved: Date.now(),
                isSaving: false,
              }));

              onSaveSuccess?.();
            }
          },
          autoSaveDelay
        );

        setState({
          isLoading: false,
          isInitialized: true,
          pdfBuffer: pdfBuffer ? pdfBuffer.slice(0) : null,
          fieldValues,
          downloadUrl,
          hasChanges: false,
          isSaving: false,
          lastSaved: null,
          status,
          error: null,
        });

        console.log("✅ Document editor initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize document editor:", error);

        if (mountedRef.current) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            isInitialized: false,
            error: error instanceof Error ? error : new Error(String(error)),
          }));
        }
      } finally {
        initializingRef.current = false;
      }
    };

    initialize();

    return () => {
      mountedRef.current = false;
      debouncedUpdaterRef.current?.flush();
    };
  }, [documentId, sessionToken]);

  // ==================== Field Change Handler ====================

  const handleFieldChange = useCallback(
    (fieldName: string, value: unknown) => {
      setState((prev) => {
        const newFieldValues = {
          ...prev.fieldValues,
          [fieldName]: value,
        };

        const hasChanges = Object.keys(newFieldValues).some(
          (key) => newFieldValues[key] !== initialFieldValuesRef.current[key]
        );

        return {
          ...prev,
          fieldValues: newFieldValues,
          hasChanges,
          isSaving: autoSaveEnabled,
        };
      });

      if (pdfBufferRef.current && autoSaveEnabled) {
        debouncedUpdaterRef.current?.queueUpdate(
          pdfBufferRef.current,
          fieldName,
          value
        );
      }

      console.log(`📝 Field changed: ${fieldName}`);
    },
    [autoSaveEnabled]
  );

  // ==================== Manual Save ====================

  const handleSave = useCallback(async () => {
    if (!state.hasChanges || state.isSaving || !pdfBufferRef.current) return;

    setState((prev) => ({ ...prev, isSaving: true }));

    try {
      await debouncedUpdaterRef.current?.flush();

      const updatedBuffer = await updatePDFFields(
        pdfBufferRef.current,
        state.fieldValues
      );
      await documentStorage.saveDraft(
        documentId,
        updatedBuffer,
        state.fieldValues
      );

      pdfBufferRef.current = updatedBuffer.slice(0);

      setState((prev) => ({
        ...prev,
        pdfBuffer: updatedBuffer.slice(0),
        hasChanges: false,
        isSaving: false,
        lastSaved: Date.now(),
      }));

      onSaveSuccess?.();
      console.log("💾 Manual save completed");
    } catch (error) {
      console.error("❌ Save failed:", error);

      setState((prev) => ({
        ...prev,
        isSaving: false,
        error: error instanceof Error ? error : new Error(String(error)),
      }));

      onSaveError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [
    documentId,
    state.fieldValues,
    state.hasChanges,
    state.isSaving,
    onSaveSuccess,
    onSaveError,
  ]);

  // ==================== Finalize ====================

  const handleFinalize = useCallback(async () => {
    if (state.status !== "draft" || !pdfBufferRef.current) return;

    setState((prev) => ({ ...prev, status: "finalizing", isSaving: true }));

    try {
      await debouncedUpdaterRef.current?.flush();
      await documentStorage.markFinalizing(documentId);

      const finalBuffer = pdfBufferRef.current.slice(0);
      console.log("☁️ Uploading to S3...");

      const s3Key = await uploadToS3(documentId, finalBuffer, sessionToken);

      await convexMutation(api.documents.generator.markDocumentGenerated, {
        documentId: documentId as Id<"documentInstances">,
        s3Key,
        fileSize: finalBuffer.byteLength,
      });

      await documentStorage.markFinalized(documentId);

      setState((prev) => ({
        ...prev,
        status: "finalized",
        isSaving: false,
        hasChanges: false,
      }));

      onFinalized?.();
      console.log("✅ Document finalized");
    } catch (error) {
      console.error("❌ Finalization failed:", error);

      setState((prev) => ({
        ...prev,
        status: "draft",
        isSaving: false,
        error: error instanceof Error ? error : new Error(String(error)),
      }));

      onSaveError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [
    documentId,
    state.status,
    sessionToken,
    onFinalized,
    onSaveError,
  ]);

  // ==================== Discard Changes ====================

  const discardChanges = useCallback(async () => {
    const draftBuffer = await documentStorage.loadDraft(documentId);
    if (draftBuffer) {
      const fieldValues = await extractPDFFieldValues(draftBuffer);

      pdfBufferRef.current = draftBuffer.slice(0);

      setState((prev) => ({
        ...prev,
        pdfBuffer: draftBuffer.slice(0),
        fieldValues,
        hasChanges: false,
      }));

      initialFieldValuesRef.current = { ...fieldValues };
      console.log("↩️ Discarded changes");
    }
  }, [documentId]);

  // ==================== Return ====================

  return {
    ...state,
    handleFieldChange,
    handleSave,
    handleFinalize,
    discardChanges,
    getVersionHistory: () => documentStorage.getVersionHistory(documentId),
    getStorageStats: documentStorage.getStorageStats.bind(documentStorage),
  };
}

// ==================== Helper Functions ====================

async function fetchDocumentFromS3(
  documentId: string,
  sessionToken?: string
): Promise<{ buffer: ArrayBuffer; s3Key: string; downloadUrl: string }> {
  const { downloadUrl, s3Key } = await convexAction(
    api.documents.generator.getDocumentDownloadUrl,
    {
      documentId: documentId as Id<"documentInstances">,
      token: sessionToken,
      expiresIn: 300,
    }
  );

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  console.log(`[S3] Downloaded ${buffer.byteLength} bytes`);

  return { buffer, s3Key, downloadUrl };
}

async function uploadToS3(
  documentId: string,
  pdfBuffer: ArrayBuffer,
  sessionToken?: string
): Promise<string> {
  const { uploadUrl, s3Key } = await convexAction(
    api.documents.generator.getDocumentUploadUrl,
    {
      documentId: documentId as Id<"documentInstances">,
      fileSize: pdfBuffer.byteLength,
      token: sessionToken,
    }
  );

  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: pdfBuffer,
    headers: { "Content-Type": "application/pdf" },
  });

  if (!response.ok) {
    throw new Error(`Failed to upload PDF: ${response.statusText}`);
  }

  console.log(`[S3] Uploaded ${pdfBuffer.byteLength} bytes`);
  return s3Key;
}