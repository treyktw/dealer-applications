# PDF Signature Implementation - TODO

## Current Status

❌ **NOT WORKING**: PDF signature capture and embedding is not functional in desktop app

## Issue Analysis

The desktop app needs to:
1. Capture signatures via canvas/drawing pad
2. Embed signatures into PDF form fields
3. Save signed PDFs to S3
4. Update Convex with signature metadata

## Required Dependencies

```bash
cd apps/desktop
pnpm add react-signature-canvas pdf-lib
pnpm add -D @types/react-signature-canvas
```

## Implementation Plan

### Step 1: Create Signature Capture Component

Create `apps/desktop/src/components/documents/SignatureCanvas.tsx`:

```typescript
import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SignatureCanvasProps {
  onSign: (signatureDataUrl: string) => void;
  onClear?: () => void;
}

export function SignaturePad({ onSign, onClear }: SignatureCanvasProps) {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setIsEmpty(true);
    onClear?.();
  };

  const handleSave = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const dataUrl = sigPadRef.current.toDataURL('image/png');
      onSign(dataUrl);
    }
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="border-2 border-dashed rounded-lg overflow-hidden">
          <SignatureCanvas
            ref={sigPadRef}
            canvasProps={{
              width: 500,
              height: 200,
              className: 'signature-canvas bg-white',
            }}
            onBegin={handleBegin}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleClear}
            variant="outline"
            disabled={isEmpty}
          >
            Clear
          </Button>
          <Button
            onClick={handleSave}
            disabled={isEmpty}
          >
            Sign Document
          </Button>
        </div>
      </div>
    </Card>
  );
}
```

### Step 2: PDF Embedding Utility

Create `apps/desktop/src/lib/pdf-signature.ts`:

```typescript
import { PDFDocument, rgb } from 'pdf-lib';

export interface SignatureField {
  name: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function embedSignatureInPDF(
  pdfBytes: ArrayBuffer,
  signatureDataUrl: string,
  fieldName: string
): Promise<Uint8Array> {
  // Load the PDF
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Convert data URL to bytes
  const signatureImageBytes = await fetch(signatureDataUrl).then(res =>
    res.arrayBuffer()
  );

  // Embed the signature image
  const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

  // Get the form
  const form = pdfDoc.getForm();

  // Try to find the signature field
  try {
    const field = form.getField(fieldName);

    // Get field position
    const widgets = field.acroField.getWidgets();
    if (widgets.length > 0) {
      const widget = widgets[0];
      const rect = widget.getRectangle();

      // Get the page
      const pageRef = widget.P();
      const pages = pdfDoc.getPages();
      const pageIndex = pages.findIndex(p => p.ref === pageRef);

      if (pageIndex !== -1) {
        const page = pages[pageIndex];

        // Draw signature image on the page
        page.drawImage(signatureImage, {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });
      }
    }
  } catch (error) {
    console.error('Field not found, trying fallback:', error);

    // Fallback: Add signature to bottom of last page
    const pages = pdfDoc.getPages();
    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    lastPage.drawImage(signatureImage, {
      x: width - 250,
      y: 100,
      width: 200,
      height: 75,
    });
  }

  // Flatten the form (make fields read-only)
  form.flatten();

  // Save the PDF
  const pdfBytesModified = await pdfDoc.save();
  return pdfBytesModified;
}

export async function listSignatureFields(
  pdfBytes: ArrayBuffer
): Promise<SignatureField[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const fields: SignatureField[] = [];

  try {
    const formFields = form.getFields();

    formFields.forEach((field) => {
      const name = field.getName();

      // Look for signature-related fields
      if (
        name.toLowerCase().includes('sign') ||
        name.toLowerCase().includes('signature')
      ) {
        const widgets = field.acroField.getWidgets();

        if (widgets.length > 0) {
          const widget = widgets[0];
          const rect = widget.getRectangle();

          fields.push({
            name,
            page: 0, // Would need to calculate actual page
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          });
        }
      }
    });
  } catch (error) {
    console.error('Error listing signature fields:', error);
  }

  return fields;
}
```

### Step 3: Integrate with Document Signing Flow

Update the document viewer to include signature capture:

```typescript
// In apps/desktop/src/routes/deals/$dealsId/documents/sign.tsx
import { SignaturePad } from '@/components/documents/SignatureCanvas';
import { embedSignatureInPDF } from '@/lib/pdf-signature';

function DocumentSigningPage() {
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const handleSign = async (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);

    try {
      // 1. Download the PDF
      const pdfResponse = await fetch(documentUrl);
      const pdfBytes = await pdfResponse.arrayBuffer();

      // 2. Embed signature
      const signedPdfBytes = await embedSignatureInPDF(
        pdfBytes,
        dataUrl,
        'SIGNATURE_FIELD' // Field name from PDF template
      );

      // 3. Save to temp location
      const tempDir = await invoke<string>('create_temp_print_dir');
      const filePath = `${tempDir}/signed-document.pdf`;

      await invoke('write_file_to_path', {
        path: filePath,
        contents: Array.from(signedPdfBytes),
      });

      // 4. Upload to S3 via Convex
      // TODO: Implement S3 upload from desktop

      // 5. Update Convex with signature metadata
      await convexMutation(api.deals.markDocumentSigned, {
        dealId,
        documentId,
        signatureDataUrl: dataUrl,
        signedAt: Date.now(),
      });

      toast.success('Document signed successfully!');
    } catch (error) {
      console.error('Signing failed:', error);
      toast.error('Failed to sign document');
    }
  };

  return (
    <div className="space-y-6">
      <PDFViewer url={documentUrl} />

      <div>
        <h3 className="text-lg font-semibold mb-4">Sign Below</h3>
        <SignaturePad onSign={handleSign} />
      </div>
    </div>
  );
}
```

### Step 4: Add Tauri Command for File Upload

Add to `apps/desktop/src-tauri/src/file_operations.rs`:

```rust
#[tauri::command]
pub async fn upload_file_to_url(
    file_path: String,
    upload_url: String,
) -> Result<(), String> {
    use std::fs;

    info!("📤 Uploading file to URL: {}", upload_url);

    // Read file
    let file_bytes = fs::read(&file_path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    // Upload via HTTP PUT
    let client = reqwest::Client::new();
    let response = client
        .put(&upload_url)
        .header("Content-Type", "application/pdf")
        .body(file_bytes)
        .send()
        .await
        .map_err(|e| format!("Upload failed: {}", e))?;

    if response.status().is_success() {
        info!("✅ File uploaded successfully");
        Ok(())
    } else {
        error!("❌ Upload failed with status: {}", response.status());
        Err(format!("Upload failed with status: {}", response.status()))
    }
}
```

### Step 5: S3 Upload from Desktop

Create `apps/desktop/src/lib/s3-upload.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';
import { convexAction } from './convex';
import { api } from '@dealer/convex';

export async function uploadSignedPDFToS3(
  localFilePath: string,
  dealId: string,
  documentType: string
): Promise<string> {
  // 1. Get presigned upload URL from Convex
  const { uploadUrl, s3Key } = await convexAction(
    api.documents.generateDocumentUploadUrl,
    {
      dealId,
      documentType,
      fileName: `signed-${Date.now()}.pdf`,
    }
  );

  // 2. Upload file using Tauri command
  await invoke('upload_file_to_url', {
    filePath: localFilePath,
    uploadUrl,
  });

  // 3. Return S3 key
  return s3Key;
}
```

## Testing Checklist

- [ ] Install dependencies (`pnpm add react-signature-canvas pdf-lib`)
- [ ] Create SignatureCanvas component
- [ ] Create pdf-signature utility
- [ ] Add Rust upload command
- [ ] Integrate with document signing flow
- [ ] Test signature capture
- [ ] Test PDF embedding
- [ ] Test S3 upload
- [ ] Test signature persistence in Convex
- [ ] Test signature display after signing

## Known Issues to Fix

1. **Field Mapping**: Need to map signature fields from PDF templates correctly
2. **Multi-Page Support**: Handle signatures on different pages
3. **Multiple Signatures**: Support dealer + client signatures
4. **Offline Mode**: Handle signature capture when offline, sync later
5. **Signature Quality**: Optimize image size/quality for PDFs

## References

- `react-signature-canvas` docs: https://github.com/agilgur5/react-signature-canvas
- `pdf-lib` docs: https://pdf-lib.js.org/
- Convex documents API: `convex/documents.ts`

## Priority

**HIGH** - This blocks the main deal signing workflow for desktop users

## Estimated Effort

**2-3 days** for full implementation and testing
