// src/lib/printing.ts
// Printing utilities for desktop app

import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

/**
 * Print a PDF file using the system's default PDF viewer
 * Opens the PDF in the default viewer, which usually shows a print dialog
 */
export async function printPDF(filePath: string): Promise<void> {
  try {
    console.log(`🖨️ Printing PDF: ${filePath}`);

    await invoke('print_pdf', { filePath });

    toast.success('PDF opened for printing');
    console.log('✅ PDF sent to printer');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to print PDF:', errorMessage);
    toast.error(`Failed to print: ${errorMessage}`);
    throw new Error(`Failed to print PDF: ${errorMessage}`);
  }
}

/**
 * Print multiple PDFs in batch
 * Opens each PDF sequentially for printing
 */
export async function batchPrintPDFs(filePaths: string[]): Promise<void> {
  try {
    console.log(`🖨️ Batch printing ${filePaths.length} PDFs`);

    await invoke('batch_print_pdfs', { filePaths });

    toast.success(`${filePaths.length} documents sent to printer`);
    console.log(`✅ Batch print completed: ${filePaths.length} files`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to batch print:', errorMessage);
    toast.error(`Failed to print documents: ${errorMessage}`);
    throw new Error(`Failed to batch print: ${errorMessage}`);
  }
}

/**
 * Download a PDF from URL and print it
 * Useful for printing documents from S3 or other sources
 */
export async function downloadAndPrint(
  pdfUrl: string,
  fileName?: string
): Promise<void> {
  try {
    console.log(`📥 Downloading and printing: ${pdfUrl}`);

    // Create temp directory
    const tempDir = await invoke<string>('create_temp_print_dir');
    console.log(`📁 Temp directory: ${tempDir}`);

    // Download file
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Save to temp directory
    const finalFileName = fileName || `print-${Date.now()}.pdf`;
    const filePath = `${tempDir}/${finalFileName}`;

    await invoke('write_file_to_path', {
      path: filePath,
      contents: Array.from(uint8Array),
    });

    console.log(`💾 File saved: ${filePath}`);

    // Print it
    await printPDF(filePath);

    // Schedule cleanup (5 minutes after printing)
    setTimeout(async () => {
      try {
        await invoke('cleanup_temp_print_dir', { dirPath: tempDir });
        console.log(`🗑️ Cleaned up temp directory: ${tempDir}`);
      } catch (cleanupError) {
        console.warn('⚠️ Failed to cleanup temp directory:', cleanupError);
      }
    }, 5 * 60 * 1000);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to download and print:', errorMessage);
    toast.error(`Failed to download PDF: ${errorMessage}`);
    throw new Error(`Failed to download and print: ${errorMessage}`);
  }
}

/**
 * Print a document from a deal
 * Fetches the signed URL from Convex and prints it
 */
export async function printDealDocument(
  documentS3Key: string,
  getSignedUrl: (key: string) => Promise<string>
): Promise<void> {
  try {
    toast.info('Preparing document for printing...');

    // Get signed URL
    const signedUrl = await getSignedUrl(documentS3Key);

    // Extract filename from S3 key
    const fileName = documentS3Key.split('/').pop() || 'document.pdf';

    // Download and print
    await downloadAndPrint(signedUrl, fileName);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to print deal document:', errorMessage);
    toast.error(`Failed to print document: ${errorMessage}`);
    throw new Error(`Failed to print deal document: ${errorMessage}`);
  }
}

/**
 * Open a PDF file without printing
 * Just opens it in the default PDF viewer
 */
export async function openPDF(filePath: string): Promise<void> {
  try {
    console.log(`📄 Opening PDF: ${filePath}`);

    await invoke('open_file_with_default_app', { filePath });

    console.log('✅ PDF opened');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to open PDF:', errorMessage);
    toast.error(`Failed to open PDF: ${errorMessage}`);
    throw new Error(`Failed to open PDF: ${errorMessage}`);
  }
}

/**
 * Check if a file exists before attempting to print
 */
export async function printPDFSafely(filePath: string): Promise<void> {
  try {
    // Check if file exists
    const exists = await checkFileExists(filePath);

    if (!exists) {
      throw new Error('File not found');
    }

    // Print it
    await printPDF(filePath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Failed to safely print PDF:', errorMessage);
    toast.error(`Cannot print: ${errorMessage}`);
    throw error;
  }
}

/**
 * Helper to check if a file exists
 */
async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    const { BaseDirectory } = await import('@tauri-apps/api/path');
    const { exists } = await import('@tauri-apps/plugin-fs');

    // For absolute paths, check directly
    if (filePath.startsWith('/') || filePath.match(/^[A-Z]:\\/)) {
      return await exists(filePath);
    }

    // For relative paths, check in documents directory
    return await exists(filePath, { baseDir: BaseDirectory.Document });
  } catch {
    // If we can't check, assume it exists and let the print command fail
    return true;
  }
}

// Export types for better TypeScript support
export interface PrintOptions {
  /** Show success toast */
  showToast?: boolean;
  /** Custom error message */
  errorMessage?: string;
}

/**
 * Print with options
 */
export async function printPDFWithOptions(
  filePath: string,
  options: PrintOptions = {}
): Promise<void> {
  const { showToast = true, errorMessage } = options;

  try {
    await invoke('print_pdf', { filePath });

    if (showToast) {
      toast.success('Document sent to printer');
    }
  } catch (error) {
    const message = errorMessage || 'Failed to print document';
    const details = error instanceof Error ? error.message : String(error);

    if (showToast) {
      toast.error(`${message}: ${details}`);
    }

    throw new Error(`${message}: ${details}`);
  }
}
