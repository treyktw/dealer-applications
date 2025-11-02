/**
 * Available data fields for document generation
 */
export const DOCUMENT_DATA_SCHEMA = {
  client: {
    firstName: "string",
    lastName: "string",
    fullName: "string (computed)",
    email: "string",
    phone: "string",
    address: "string",
    city: "string",
    state: "string",
    zipCode: "string",
    driversLicense: "string",
  },
  vehicle: {
    vin: "string",
    year: "number",
    make: "string",
    model: "string",
    trim: "string",
    stock: "string",
    mileage: "number",
    exteriorColor: "string",
    interiorColor: "string",
    fuelType: "string",
    transmission: "string",
    engine: "string",
    price: "number",
  },
  deal: {
    id: "string",
    type: "string",
    saleDate: "date",
    totalAmount: "number",
    downPayment: "number",
    tradeInValue: "number",
    financeAmount: "number",
    createdAt: "date",
  },
  dealership: {
    name: "string",
    address: "string",
    city: "string",
    state: "string",
    zipCode: "string",
    phone: "string",
    email: "string",
    dealerLicense: "string",
    website: "string",
  },
};

export type DocumentDataPath = keyof typeof DOCUMENT_DATA_SCHEMA;