/**
 * Smart Field Auto-Mapper
 * 
 * Intelligently maps PDF form field names to deal data schema.
 * Handles variations like firstname1, firstname2, buyer/cobuyer, etc.
 */

export interface FieldMapping {
  pdfFieldName: string;
  dataPath: string;
  transform?: "uppercase" | "lowercase" | "titlecase" | "currency" | "date";
  defaultValue?: string;
  required: boolean;
  autoMapped: boolean;
}

/**
 * Enhanced data schema with all available fields
 */
export const ENHANCED_DATA_SCHEMA = {
  // Primary Client (Buyer)
  client: [
    { value: "client.firstName", label: "First Name", aliases: ["firstname", "fname", "first_name", "given_name"] },
    { value: "client.middleName", label: "Middle Name", aliases: ["middlename", "mname", "middle_name", "middle_initial"] },
    { value: "client.lastName", label: "Last Name", aliases: ["lastname", "lname", "last_name", "surname", "family_name"] },
    { value: "client.firstName + ' ' + client.lastName", label: "Full Name", aliases: ["fullname", "name", "buyer_name", "customer_name"] },
    { value: "client.email", label: "Email", aliases: ["email", "email_address", "e_mail"] },
    { value: "client.phone", label: "Phone", aliases: ["phone", "phone_number", "tel", "telephone", "mobile"] },
    { value: "client.address", label: "Address", aliases: ["address", "street", "address_line", "street_address"] },
    { value: "client.addressLine2", label: "Address Line 2", aliases: ["address_line2", "address2", "apt", "suite", "unit"] },
    { value: "client.city", label: "City", aliases: ["city", "town", "municipality"] },
    { value: "client.state", label: "State", aliases: ["state", "province", "region"] },
    { value: "client.zipCode", label: "ZIP Code", aliases: ["zip", "zipcode", "zip_code", "postal", "postal_code"] },
    { value: "client.county", label: "County", aliases: ["county", "parish"] },
    { value: "client.driversLicense", label: "Driver's License", aliases: ["license", "dl", "drivers_license", "driver_license", "license_number"] },
  ],

  // Co-Buyer (Secondary Client)
  cobuyer: [
    { value: "cobuyer.firstName", label: "Co-Buyer First Name", aliases: ["cofirstname", "cobuyer_first", "co_buyer_first"] },
    { value: "cobuyer.middleName", label: "Co-Buyer Middle Name", aliases: ["comiddlename", "cobuyer_middle", "co_buyer_middle"] },
    { value: "cobuyer.lastName", label: "Co-Buyer Last Name", aliases: ["colastname", "cobuyer_last", "co_buyer_last"] },
    { value: "cobuyer.firstName + ' ' + cobuyer.lastName", label: "Co-Buyer Full Name", aliases: ["cobuyer_name", "co_buyer", "cobuyer"] },
    { value: "cobuyer.email", label: "Co-Buyer Email", aliases: ["coemail", "cobuyer_email", "email2"] },
    { value: "cobuyer.phone", label: "Co-Buyer Phone", aliases: ["cophone", "cobuyer_phone", "phone2"] },
    { value: "cobuyer.address", label: "Co-Buyer Address", aliases: ["coaddress", "cobuyer_address", "address2"] },
    { value: "cobuyer.addressLine2", label: "Co-Buyer Address Line 2", aliases: ["coaddress2", "coaddress_line2"] },
    { value: "cobuyer.city", label: "Co-Buyer City", aliases: ["cocity", "cobuyer_city", "city2"] },
    { value: "cobuyer.state", label: "Co-Buyer State", aliases: ["costate", "cobuyer_state", "state2"] },
    { value: "cobuyer.zipCode", label: "Co-Buyer ZIP", aliases: ["cozip", "cobuyer_zip", "zipcode2"] },
    { value: "cobuyer.county", label: "Co-Buyer County", aliases: ["cocounty", "cobuyer_county", "county2"] },
    { value: "cobuyer.driversLicense", label: "Co-Buyer License", aliases: ["colicense", "cobuyer_license", "drivers_license2"] },
  ],

  // Vehicle
  vehicle: [
    { value: "vehicle.vin", label: "VIN", aliases: ["vin", "vehicle_vin", "vvin", "serial"] },
    { value: "vehicle.year", label: "Year", aliases: ["year", "vyear", "vehicle_year", "model_year"] },
    { value: "vehicle.make", label: "Make", aliases: ["make", "vmake", "vehicle_make", "manufacturer"] },
    { value: "vehicle.model", label: "Model", aliases: ["model", "vmodel", "vehicle_model"] },
    { value: "vehicle.trim", label: "Trim", aliases: ["trim", "vtrim", "vehicle_trim", "series"] },
    { value: "vehicle.body", label: "Body Style", aliases: ["body", "vbody", "body_style", "style"] },
    { value: "vehicle.stock", label: "Stock Number", aliases: ["stock", "stock_no", "stock_number", "stockno", "inventory_no"] },
    { value: "vehicle.mileage", label: "Mileage", aliases: ["mileage", "vmileage", "odometer", "odo", "vodo", "miles"] },
    { value: "vehicle.exteriorColor", label: "Exterior Color", aliases: ["color", "exterior_color", "vcolor", "ext_color"] },
    { value: "vehicle.interiorColor", label: "Interior Color", aliases: ["interior_color", "vcolori", "int_color"] },
    { value: "vehicle.fuelType", label: "Fuel Type", aliases: ["fuel", "fuel_type", "vfuel"] },
    { value: "vehicle.transmission", label: "Transmission", aliases: ["transmission", "vtransmission", "trans"] },
    { value: "vehicle.engine", label: "Engine", aliases: ["engine", "vengine", "motor", "cyl", "vcyl", "cylinders"] },
    { value: "vehicle.doors", label: "Doors", aliases: ["doors", "vdoors", "door_count"] },
    { value: "vehicle.titleNumber", label: "Title Number", aliases: ["title", "title_number", "vtitlenumber", "title_no"] },
    { value: "vehicle.price", label: "Vehicle Price", aliases: ["price", "vehicle_price", "cash_price", "sale_price"] },
  ],

  // Deal / Financial
  deal: [
    { value: "deal.id", label: "Deal ID", aliases: ["deal_id", "deal_number", "contract_number"] },
    { value: "deal.type", label: "Deal Type", aliases: ["deal_type", "sale_type", "transaction_type"] },
    { value: "deal.saleDate", label: "Sale Date", aliases: ["date", "sale_date", "contract_date", "purchase_date"] },
    { value: "deal.cashPrice", label: "Cash Price", aliases: ["cash_price", "vehicle_price", "selling_price"] },
    { value: "deal.totalAmount", label: "Total Amount", aliases: ["total", "total_amount", "total_price", "grand_total", "total_amount_financed"] },
    { value: "deal.downPayment", label: "Down Payment", aliases: ["down", "down_payment", "cash_down", "cash_down_payment", "deposit"] },
    { value: "deal.tradeInValue", label: "Trade-In Value", aliases: ["tradein", "trade_in", "tradein_amount", "trade_value"] },
    { value: "deal.tradePayoff", label: "Trade Payoff", aliases: ["trade_payoff", "tradein_payoff", "payoff"] },
    { value: "deal.financeAmount", label: "Finance Amount", aliases: ["financed", "amount_financed", "loan_amount"] },
    { value: "deal.deferredPayments", label: "Deferred Payments", aliases: ["deferred", "deferred_payments", "deferred_down"] },
    
    // Fees
    { value: "deal.accessories", label: "Accessories", aliases: ["accessories", "accessory_cost", "add_ons"] },
    { value: "deal.servicePackage", label: "Service Package", aliases: ["service_package", "customer_service_pack", "service_contract"] },
    { value: "deal.tavtRate", label: "TAVT Rate", aliases: ["tavt", "tavt_rate", "tavt_rate_6600", "ad_valorem_tax"] },
    { value: "deal.licenseFee", label: "License Fee", aliases: ["license_fee", "tag_fee", "registration"] },
    { value: "deal.registrationFees", label: "Registration Fees", aliases: ["registration_fees", "registration", "title_fee"] },
    { value: "deal.etrFees", label: "ETR Fees", aliases: ["etr", "etr_fees", "electronic_title"] },
    { value: "deal.documentFees", label: "Document Fees", aliases: ["doc_fee", "document_fees", "documentation_fee", "admin_fee"] },
    { value: "deal.lienFees", label: "Lien Fees", aliases: ["lien", "lein_fees", "lien_fee"] },
    { value: "deal.serviceContractFees", label: "Service Contract Fees", aliases: ["service_contract_fees", "warranty_fee", "extended_warranty"] },
    
    { value: "deal.createdAt", label: "Created Date", aliases: ["created", "created_at", "stockdate"] },
  ],

  // Insurance & Lien Holder
  insurance: [
    { value: "insurance.companyName", label: "Insurance Company", aliases: ["insurance_company", "insurance_company_name", "insurer"] },
    { value: "insurance.policyNumber", label: "Policy Number", aliases: ["policy", "insurance_policy", "insurance_company_policy", "policy_number"] },
    { value: "lienHolder.companyName", label: "Lien Holder Name", aliases: ["lien_holder", "lein_holder_company_name", "lienholder", "lender"] },
    { value: "lienHolder.address", label: "Lien Holder Address", aliases: ["lien_holder_address", "lein_holder_address", "lienholder_address"] },
  ],

  // Dealership
  dealership: [
    { value: "dealership.name", label: "Dealership Name", aliases: ["dealer", "dealership", "dealer_name", "seller"] },
    { value: "dealership.address", label: "Dealership Address", aliases: ["dealer_address", "dealership_address"] },
    { value: "dealership.city", label: "Dealership City", aliases: ["dealer_city"] },
    { value: "dealership.state", label: "Dealership State", aliases: ["dealer_state"] },
    { value: "dealership.zipCode", label: "Dealership ZIP", aliases: ["dealer_zip"] },
    { value: "dealership.phone", label: "Dealership Phone", aliases: ["dealer_phone"] },
    { value: "dealership.email", label: "Dealership Email", aliases: ["dealer_email"] },
    { value: "dealership.dealerLicense", label: "Dealer License", aliases: ["dealer_license", "license_number", "dealer_id"] },
    { value: "dealership.representative", label: "Dealer Rep", aliases: ["dealer_rep", "seller_dealer_rep", "salesperson"] },
  ],

  // Signatures & Initials
  signatures: [
    { value: "SIGNATURE_BUYER", label: "Buyer Signature", aliases: ["buyer", "buyer_signature", "customer_signature", "purchaser_signature"] },
    { value: "SIGNATURE_COBUYER", label: "Co-Buyer Signature", aliases: ["cobuyer", "co_buyer_signature", "cobuyer_signature"] },
    { value: "SIGNATURE_SELLER", label: "Seller Signature", aliases: ["seller", "seller_signature", "dealer_signature", "seller_dealer_rep"] },
    { value: "INITIALS_BUYER", label: "Buyer Initials", aliases: ["buyer_initials", "customer_initials", "initials"] },
    { value: "INITIALS_COBUYER", label: "Co-Buyer Initials", aliases: ["cobuyer_initials", "co_buyer_initials"] },
    { value: "INITIALS_SELLER", label: "Seller Initials", aliases: ["seller_initials", "dealer_initials"] },
  ],

  // Dates
  dates: [
    { value: "deal.saleDate", label: "Sale Date", aliases: ["date", "date_1", "contract_date"] },
    { value: "deal.saleDate", label: "Date 2", aliases: ["date_2", "cobuyer_date"] },
    { value: "deal.saleDate", label: "Date 3", aliases: ["date_3", "seller_date"] },
  ],
};

/**
 * Smart auto-mapping function
 * Handles numeric suffixes (firstname1, firstname2), buyer/cobuyer variations, etc.
 */
export function autoMapField(
  pdfFieldName: string,
  fieldType?: string
): Partial<FieldMapping> | null {
  const cleaned = pdfFieldName.toLowerCase().trim();

  // Extract numeric suffix if present (e.g., "firstname1" -> "firstname", suffix: "1")
  const numericMatch = cleaned.match(/^(.+?)([0-9]+)$/);
  const baseName = numericMatch ? numericMatch[1] : cleaned;
  const suffix = numericMatch ? numericMatch[2] : null;

  // Determine if this is for primary client or cobuyer based on suffix
  const isCobuyer = suffix === "2";

  // Check all schema categories for matches
  for (const [category, fields] of Object.entries(ENHANCED_DATA_SCHEMA)) {
    for (const field of fields) {
      // Check if field name matches any alias
      const matchesAlias = field.aliases.some((alias: string) => {
        // Exact match
        if (baseName === alias || cleaned === alias) return true;
        
        // Match with underscores/hyphens variations
        const normalized = baseName.replace(/[-_]/g, "");
        const normalizedAlias = alias.replace(/[-_]/g, "");
        if (normalized === normalizedAlias) return true;

        return false;
      });

      if (matchesAlias) {
        // Special handling for client vs cobuyer
        if (category === "client" && isCobuyer) {
          // Map to cobuyer instead
          const cobuyerPath = field.value.replace("client.", "cobuyer.");
          return buildMapping(cobuyerPath, pdfFieldName);
        }

        return buildMapping(field.value, pdfFieldName);
      }
    }
  }

  // Signature/Initial special handling
  if (fieldType === "signature" || cleaned.includes("signature") || cleaned.includes("sign")) {
    if (cleaned.includes("cobuyer") || cleaned.includes("co_buyer") || suffix === "2") {
      return {
        dataPath: "SIGNATURE_COBUYER",
        defaultValue: "[Co-Buyer will sign electronically]",
      };
    } else if (cleaned.includes("seller") || cleaned.includes("dealer")) {
      return {
        dataPath: "SIGNATURE_SELLER",
        defaultValue: "[Seller will sign electronically]",
      };
    } else {
      return {
        dataPath: "SIGNATURE_BUYER",
        defaultValue: "[Buyer will sign electronically]",
      };
    }
  }

  // Initials special handling
  if (cleaned.includes("initial")) {
    if (cleaned.includes("cobuyer") || cleaned.includes("co_buyer") || suffix === "2") {
      return {
        dataPath: "INITIALS_COBUYER",
        defaultValue: "[Co-Buyer Initials]",
      };
    } else if (cleaned.includes("seller") || cleaned.includes("dealer")) {
      return {
        dataPath: "INITIALS_SELLER",
        defaultValue: "[Seller Initials]",
      };
    } else {
      return {
        dataPath: "INITIALS_BUYER",
        defaultValue: "[Buyer Initials]",
      };
    }
  }

  return null;
}

/**
 * Build mapping with appropriate transforms
 */
function buildMapping(
  dataPath: string,
  pdfFieldName: string
): Partial<FieldMapping> {
  const mapping: Partial<FieldMapping> = {
    dataPath,
    pdfFieldName,
    // Note: label is used for display purposes in the UI
    // but not stored in the FieldMapping interface
  };

  // Determine transform based on field type
  if (
    dataPath.includes("firstName") ||
    dataPath.includes("lastName") ||
    dataPath.includes("middleName") ||
    dataPath.includes("name") ||
    dataPath.includes("address") ||
    dataPath.includes("city") ||
    dataPath.includes("state") ||
    dataPath.includes("make") ||
    dataPath.includes("model") ||
    dataPath.includes("vin") ||
    dataPath.includes("license") ||
    dataPath.includes("stock")
  ) {
    mapping.transform = "uppercase";
  }

  if (dataPath.includes("email")) {
    mapping.transform = "lowercase";
  }

  if (
    dataPath.includes("Color") ||
    dataPath.includes("body") ||
    dataPath.includes("transmission") ||
    dataPath.includes("fuelType")
  ) {
    mapping.transform = "titlecase";
  }

  if (
    dataPath.includes("Price") ||
    dataPath.includes("Amount") ||
    dataPath.includes("Value") ||
    dataPath.includes("Payment") ||
    dataPath.includes("Fee") ||
    dataPath.includes("accessories") ||
    dataPath.includes("tavt")
  ) {
    mapping.transform = "currency";
  }

  if (dataPath.includes("Date") || dataPath === "deal.saleDate") {
    mapping.transform = "date";
  }

  // Mark important fields as required
  if (
    dataPath.includes("vin") ||
    dataPath.includes("year") ||
    dataPath.includes("make") ||
    dataPath.includes("model") ||
    dataPath.includes("firstName") ||
    dataPath.includes("lastName") ||
    dataPath.includes("totalAmount") ||
    dataPath.includes("cashPrice")
  ) {
    mapping.required = true;
  } else {
    mapping.required = false;
  }

  return mapping;
}

/**
 * Get all data paths for dropdown
 */
export function getAllDataPaths(): Array<{ value: string; label: string; category: string }> {
  const paths: Array<{ value: string; label: string; category: string }> = [];

  for (const [category, fields] of Object.entries(ENHANCED_DATA_SCHEMA)) {
    for (const field of fields) {
      paths.push({
        value: field.value,
        label: field.label,
        category: category.charAt(0).toUpperCase() + category.slice(1),
      });
    }
  }

  return paths;
}

/**
 * Auto-map all PDF fields
 */
export function autoMapAllFields(
  pdfFields: Array<{ name: string; type: string; pdfFieldName?: string }>,
  existingMappings?: FieldMapping[]
): FieldMapping[] {
  return pdfFields.map((pdfField) => {
    // Use the original PDF field name if available, otherwise use the sanitized name
    const originalFieldName = pdfField.pdfFieldName || pdfField.name;
    
    // Check if we should preserve existing manual mapping
    const existingMapping = existingMappings?.find(
      (m) => m.pdfFieldName === originalFieldName
    );

    if (existingMapping && !existingMapping.autoMapped && existingMapping.dataPath) {
      // Keep manually edited mappings
      return existingMapping;
    }

    // Auto-map the field using the sanitized name for matching logic
    const mapping = autoMapField(pdfField.name, pdfField.type);

    return {
      pdfFieldName: originalFieldName, // Use the original PDF field name (with spaces, proper case)
      dataPath: mapping?.dataPath || "",
      transform: mapping?.transform,
      defaultValue: mapping?.defaultValue,
      required: mapping?.required || false,
      autoMapped: true,
    };
  });
}