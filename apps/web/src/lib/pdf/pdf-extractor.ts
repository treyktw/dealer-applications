import { PDFDocument } from "pdf-lib";

export interface PDFField {
  name: string;
  type: "text" | "checkbox" | "radio" | "dropdown" | "signature" | "date";
  page: number;
  rect?: number[]; // [x, y, width, height]
  required?: boolean;
}

/**
 * Extract form fields from PDF
 */
export async function extractPDFFields(pdfBuffer: Buffer): Promise<PDFField[]> {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const extractedFields: PDFField[] = [];

    for (const field of fields) {
      const name = field.getName();
      let type: PDFField["type"] = "text";

      // Determine field type
      if (field.constructor.name.includes("Text")) {
        type = "text";
      } else if (field.constructor.name.includes("CheckBox")) {
        type = "checkbox";
      } else if (field.constructor.name.includes("Radio")) {
        type = "radio";
      } else if (field.constructor.name.includes("Dropdown")) {
        type = "dropdown";
      }

      // Check if it's a signature field by name
      if (
        name.toLowerCase().includes("signature") ||
        name.toLowerCase().includes("sign_")
      ) {
        type = "signature";
      }

      // Check if it's a date field
      if (
        name.toLowerCase().includes("date") ||
        name.toLowerCase().includes("_dt")
      ) {
        type = "date";
      }

      // Get field widgets (positions)
      const widgets = (field as { acroField: { getWidgets: () => Array<{ P: () => unknown; Rect: () => { x: number; y: number; width: number; height: number } | undefined }> } }).acroField.getWidgets();
      let page = 0;
      let rect: number[] | undefined;

      if (widgets.length > 0) {
        const widget = widgets[0];
        const pageRef = widget.P();
        if (pageRef) {
          const pages = pdfDoc.getPages();
          page = pages.findIndex((p) => (p as { ref: unknown }).ref === pageRef);
        }

        // Get rectangle
        const rectArray = widget.Rect();
        if (rectArray) {
          rect = [
            rectArray.x,
            rectArray.y,
            rectArray.width,
            rectArray.height,
          ];
        }
      }

      extractedFields.push({
        name,
        type,
        page: page + 1, // 1-indexed
        rect,
      });
    }

    return extractedFields;
  } catch (error) {
    console.error("Error extracting PDF fields:", error);
    throw new Error("Failed to extract PDF form fields");
  }
}