/**
 * Default Document Templates
 * Templates stored in public/dealerpack folder for standalone users
 */

export interface DefaultTemplate {
  id: string;
  name: string;
  category: string;
  filename: string;
  path: string;
}

/**
 * Map of available default templates
 * These templates are stored in public/dealerpack folder
 */
export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  {
    id: "bill_of_sale_default",
    name: "Bill of Sale",
    category: "bill_of_sale",
    filename: "BillofSALEV1-2.pdf",
    path: "/dealerpack/BillofSALEV1-2.pdf",
  },
  {
    id: "buyers_guide_default",
    name: "Buyer's Guide (GA CFR)",
    category: "buyers_guide",
    filename: "GA_CFR_Buyers_Guides_English_Form.pdf",
    path: "/dealerpack/GA_CFR_Buyers_Guides_English_Form.pdf",
  },
  {
    id: "odometer_disclosure_default",
    name: "Odometer Disclosure (GA)",
    category: "odometer_disclosure",
    filename: "OdometerDisclosureGA25.pdf",
    path: "/dealerpack/OdometerDisclosureGA25.pdf",
  },
];

/**
 * Get default template by category
 */
export function getDefaultTemplateByCategory(category: string): DefaultTemplate | undefined {
  return DEFAULT_TEMPLATES.find(t => t.category === category);
}

/**
 * Get all default templates
 */
export function getAllDefaultTemplates(): DefaultTemplate[] {
  return DEFAULT_TEMPLATES;
}

/**
 * Get default template by ID
 */
export function getDefaultTemplateById(id: string): DefaultTemplate | undefined {
  return DEFAULT_TEMPLATES.find(t => t.id === id);
}

/**
 * Load a default template PDF file and convert to base64
 */
export async function loadDefaultTemplateAsBase64(template: DefaultTemplate): Promise<string> {
  try {
    // Fetch the PDF from the public folder
    const response = await fetch(template.path);
    if (!response.ok) {
      throw new Error(`Failed to load template: ${response.statusText}`);
    }

    // Convert to blob
    const blob = await response.blob();
    
    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove data URL prefix if present
          const base64 = reader.result.includes(',') 
            ? reader.result.split(',')[1] 
            : reader.result;
          resolve(base64);
        } else {
          reject(new Error('Failed to convert template to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error loading default template ${template.name}:`, error);
    throw new Error(`Failed to load default template: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Map document type to default template category
 */
export function mapDocumentTypeToCategory(documentType: string): string {
  const typeMap: Record<string, string> = {
    bill_of_sale: "bill_of_sale",
    buyers_order: "buyers_guide",
    buyers_guide: "buyers_guide",
    odometer_disclosure: "odometer_disclosure",
    finance_agreement: "bill_of_sale", // Fallback to bill of sale
    warranty: "bill_of_sale", // Fallback to bill of sale
    trade_in_appraisal: "bill_of_sale", // Fallback to bill of sale
    insurance_authorization: "bill_of_sale", // Fallback to bill of sale
    credit_application: "bill_of_sale", // Fallback to bill of sale
  };

  return typeMap[documentType] || "bill_of_sale";
}

