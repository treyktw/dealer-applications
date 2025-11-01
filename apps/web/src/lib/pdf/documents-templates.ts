export enum DocumentCategory {
  BILL_OF_SALE = "bill_of_sale",
  ODOMETER_DISCLOSURE = "odometer_disclosure",
  BUYERS_GUIDE = "buyers_guide",
  POWER_OF_ATTORNEY = "power_of_attorney",
  TRADE_IN = "trade_in",
  FINANCE_CONTRACT = "finance_contract",
  WARRANTY = "warranty",
  CUSTOM = "custom",
}

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  [DocumentCategory.BILL_OF_SALE]: "Bill of Sale",
  [DocumentCategory.ODOMETER_DISCLOSURE]: "Odometer Disclosure",
  [DocumentCategory.BUYERS_GUIDE]: "Buyers Guide",
  [DocumentCategory.POWER_OF_ATTORNEY]: "Power of Attorney",
  [DocumentCategory.TRADE_IN]: "Trade-In Agreement",
  [DocumentCategory.FINANCE_CONTRACT]: "Finance Contract",
  [DocumentCategory.WARRANTY]: "Warranty Agreement",
  [DocumentCategory.CUSTOM]: "Custom Document",
};