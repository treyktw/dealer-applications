// src/lib/document-storage/pdf-field-updater.ts
// Enhanced PDF field updater with proper appearance generation

import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  StandardFonts,
} from 'pdf-lib';

// ==================== Configuration ====================

const DEBOUNCE_DELAY_MS = 300;

// ==================== Field Update Functions ====================

/**
 * Update PDF form fields with proper appearance generation
 */
export async function updatePDFFields(
  pdfBuffer: ArrayBuffer,
  fieldValues: Record<string, unknown>
): Promise<ArrayBuffer> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  const form = pdfDoc.getForm();
  // Embed a standard font for text field appearances
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  
  // First pass: Update all field values
  for (const [fieldName, value] of Object.entries(fieldValues)) {
    try {
      const field = form.getField(fieldName);
      
      if (field instanceof PDFTextField) {
        const textValue = String(value ?? '');
        field.setText(textValue);
        
        // CRITICAL: Enable appearances and set properties for proper rendering
        field.enableReadOnly();
        field.disableReadOnly(); // This forces regeneration
        field.updateAppearances(helveticaFont); // Generate appearance streams
        
        // Set background color for visibility (light blue like Adobe)
        try {
          field.acroField.getWidgets().forEach((widget) => {
            const dict = widget.dict;
            // Set background color
            dict.set(
              pdfDoc.context.obj('MK'),
              pdfDoc.context.obj({
                BG: [0.9, 0.95, 1.0], // Light blue background
              })
            );
          });
        } catch (e) {
          // Widget styling failed, continue
        }
        
      } else if (field instanceof PDFCheckBox) {
        if (value) {
          field.check();
        } else {
          field.uncheck();
        }
        field.updateAppearances();
        
      } else if (field instanceof PDFDropdown) {
        field.select(String(value ?? ''));
        field.updateAppearances(helveticaFont);
        
      } else if (field instanceof PDFRadioGroup) {
        field.select(String(value ?? ''));
        field.updateAppearances();
      }
      
    } catch (err) {
      console.warn(`Failed to update field "${fieldName}":`, err);
    }
  }

  // Second pass: Ensure all fields have appearance streams
  try {
    const allFields = form.getFields();
    allFields.forEach((field) => {
      try {
        if (field instanceof PDFTextField) {
          field.updateAppearances(helveticaFont);
        } else if (field instanceof PDFCheckBox) {
          field.updateAppearances();
        } else if (field instanceof PDFDropdown) {
          field.updateAppearances(helveticaFont);
        } else if (field instanceof PDFRadioGroup) {
          field.updateAppearances();
        }
      } catch (e) {
        // Skip fields that can't be updated
      }
    });
  } catch (e) {
    console.warn('Failed to update all field appearances:', e);
  }

  // IMPORTANT: Do NOT flatten - we want editable fields
  const bytes = await pdfDoc.save({
    useObjectStreams: false, // Better compatibility
    updateFieldAppearances: true, // Ensure appearances are updated
  });
  // Convert Uint8Array to an exact-length ArrayBuffer
  const result = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return result as ArrayBuffer;
}

/**
 * Extract field values from PDF
 */
export async function extractPDFFieldValues(
  pdfBuffer: ArrayBuffer
): Promise<Record<string, unknown>> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const values: Record<string, unknown> = {};

  for (const field of fields) {
    const fieldName = field.getName();
    
    try {
      if (field instanceof PDFTextField) {
        values[fieldName] = field.getText() ?? '';
      } else if (field instanceof PDFCheckBox) {
        values[fieldName] = field.isChecked();
      } else if (field instanceof PDFDropdown) {
        values[fieldName] = field.getSelected()?.[0] ?? '';
      } else if (field instanceof PDFRadioGroup) {
        values[fieldName] = field.getSelected() ?? '';
      }
    } catch (err) {
      console.warn(`Failed to extract value for field "${fieldName}":`, err);
      values[fieldName] = '';
    }
  }

  return values;
}

// ==================== Debounced PDF Updater ====================

interface PendingUpdate {
  fieldName: string;
  value: unknown;
  timestamp: number;
}

export function createDebouncedPDFUpdater(
  onUpdate: (updatedBuffer: ArrayBuffer, fieldValues: Record<string, unknown>) => Promise<void>,
  debounceMs: number = DEBOUNCE_DELAY_MS
) {
  let timeoutId: NodeJS.Timeout | null = null;
  const pendingUpdates = new Map<string, PendingUpdate>();
  let currentBuffer: ArrayBuffer | null = null;

  const flush = async () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (pendingUpdates.size === 0 || !currentBuffer) {
      return;
    }

    const updates = Object.fromEntries(
      Array.from(pendingUpdates.entries()).map(([name, update]) => [name, update.value])
    );

    pendingUpdates.clear();

    try {
      const updatedBuffer = await updatePDFFields(currentBuffer, updates);
      await onUpdate(updatedBuffer, updates);
      currentBuffer = updatedBuffer; // Update reference
    } catch (err) {
      console.error('Failed to apply PDF updates:', err);
      throw err;
    }
  };

  const queueUpdate = (buffer: ArrayBuffer, fieldName: string, value: unknown) => {
    currentBuffer = buffer;
    
    pendingUpdates.set(fieldName, {
      fieldName,
      value,
      timestamp: Date.now(),
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      flush();
    }, debounceMs);
  };

  return {
    queueUpdate,
    flush,
  };
}

/**
 * Validate PDF buffer
 */
export function isValidPDFBuffer(buffer: ArrayBuffer | null): boolean {
  if (!buffer || buffer.byteLength < 32) {
    return false;
  }

  // Check PDF signature
  const header = new Uint8Array(buffer, 0, 5);
  const pdfSignature = String.fromCharCode(...header);
  
  return pdfSignature === '%PDF-';
}

/**
 * Get PDF metadata
 */
export async function getPDFMetadata(pdfBuffer: ArrayBuffer): Promise<{
  pageCount: number;
  fieldCount: number;
  fieldNames: string[];
  hasAcroForm: boolean;
}> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  return {
    pageCount: pdfDoc.getPageCount(),
    fieldCount: fields.length,
    fieldNames: fields.map((f) => f.getName()),
    hasAcroForm: fields.length > 0,
  };
}