// src/lib/document-storage/pdf-field-repair.ts
// Fixed: Adds styling WITHOUT calling updateAppearances (which fails without embedded fonts)

import { PDFDocument, PDFName, PDFDict, PDFNumber } from 'pdf-lib';

/**
 * Repair PDF form fields by adding appearance characteristics
 * Does NOT call updateAppearances() to avoid font errors
 */
export async function repairPDFFieldAppearances(
  pdfBuffer: ArrayBuffer
): Promise<ArrayBuffer> {
  console.log('🔧 Starting PDF field repair...');
  
  const pdfDoc = await PDFDocument.load(pdfBuffer, {
    updateMetadata: false,
    ignoreEncryption: true,
  });

  const form = pdfDoc.getForm();
  const fields = form.getFields();
  
  let repairedCount = 0;

  for (const field of fields) {
    try {
      const fieldName = field.getName();
      const acroField = (field as any).acroField;
      const widgets = acroField?.getWidgets() || [];

      for (const widget of widgets) {
        const dict = widget.dict;
        const context = pdfDoc.context;

        // 1. Add/Update MK (Appearance Characteristics) dictionary
        let mk = dict.get(PDFName.of('MK'));
        if (!mk || !(mk instanceof PDFDict)) {
          mk = context.obj({});
          dict.set(PDFName.of('MK'), mk);
        }

        // Set background color (light blue like Adobe: RGB 0.85, 0.92, 0.98)
        const bgColor = context.obj([0.85, 0.92, 0.98]);
        (mk as PDFDict).set(PDFName.of('BG'), bgColor);

        // Set border color (darker blue: RGB 0.4, 0.65, 0.9)
        const bcColor = context.obj([0.4, 0.65, 0.9]);
        (mk as PDFDict).set(PDFName.of('BC'), bcColor);

        // 2. Set border style
        let bs = dict.get(PDFName.of('BS'));
        if (!bs || !(bs instanceof PDFDict)) {
          bs = context.obj({});
          dict.set(PDFName.of('BS'), bs);
        }
        
        // Solid border, width 1
        (bs as PDFDict).set(PDFName.of('W'), PDFNumber.of(1));
        (bs as PDFDict).set(PDFName.of('S'), PDFName.of('S')); // Solid

        // 3. Ensure field has default appearance string (DA)
        if (!dict.has(PDFName.of('DA'))) {
          // Set default appearance: Helvetica, 11pt, black
          const da = context.obj('0 0 0 rg /Helv 11 Tf');
          dict.set(PDFName.of('DA'), da);
        }

        // 4. Set field flags for better rendering
        const flags = acroField.getFlags();
        // Ensure field is not hidden and is printable
        const newFlags = (flags | 4) & ~2; // Set Print (4), clear Hidden (2)
        acroField.setFlags(newFlags);

        repairedCount++;
      }

      // DO NOT call updateAppearances() - it requires embedded fonts and will fail
      // The MK dictionary is enough for react-pdf to render the backgrounds

    } catch (err) {
      console.warn(`Failed to repair field "${field.getName()}":`, err);
    }
  }

  console.log(`✅ Repaired ${repairedCount} field widgets`);

  // Save with appearance data
  const bytes = await pdfDoc.save({
    useObjectStreams: false,
    updateFieldAppearances: false, // Don't auto-update (causes font errors)
  });
  // Convert Uint8Array to an exact-length ArrayBuffer
  const result = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return result as ArrayBuffer;
}

/**
 * Check if PDF needs repair (no backgrounds)
 */
export async function needsFieldRepair(pdfBuffer: ArrayBuffer): Promise<boolean> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
    });

    const form = pdfDoc.getForm();
    const fields = form.getFields();

    if (fields.length === 0) {
      return false;
    }

    let fieldsNeedingRepair = 0;

    for (const field of fields) {
      const acroField = (field as any).acroField;
      const widgets = acroField?.getWidgets() || [];

      for (const widget of widgets) {
        const dict = widget.dict;
        
        const mk = dict.get(PDFName.of('MK'));
        const hasBG = mk && mk instanceof PDFDict && mk.has(PDFName.of('BG'));

        if (!hasBG) {
          fieldsNeedingRepair++;
        }
      }
    }

    const needsRepair = fieldsNeedingRepair > 0;
    console.log(`🔍 PDF field check: ${fieldsNeedingRepair}/${fields.length} widgets need repair`);
    
    return needsRepair;

  } catch (err) {
    console.error('Failed to check PDF:', err);
    return false;
  }
}