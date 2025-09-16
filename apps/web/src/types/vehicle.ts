// Vehicle status types
export type VehicleStatus = "available" | "sold" | "pending" | "reserved";

// Vehicle image type
export interface VehicleImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

// Vehicle feature type
export interface VehicleFeature {
  id: string;
  name: string;
  category: string | null;
}

// Vehicle interface
export interface Vehicle {
  id: string;
  stock: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  trim: string | null;
  mileage: number;
  price: number;
  exteriorColor: string | null;
  interiorColor: string | null;
  fuelType: string | null;
  transmission: string | null;
  engine: string | null;
  description: string | null;
  status: VehicleStatus;
  featured: boolean;
  dealershipId: string;
  images: VehicleImage[];
  features: VehicleFeature[];
  createdAt: string;
  updatedAt: string;
}

// Filter options for vehicles
export interface VehicleFilters {
  search?: string;
  status?: VehicleStatus | null;
  make?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  maxMileage?: number | null;
  featured?: boolean;
  dealershipId?: string;
}

// Sort options for vehicles
export type VehicleSortOption = 
  | "newest" 
  | "oldest" 
  | "price-asc" 
  | "price-desc" 
  | "mileage-asc" 
  | "mileage-desc";

// Vehicle import result
export interface VehicleImportResult {
  importedCount: number;
  failedCount: number;
  errors: Array<{
    rowIndex: number;
    message: string;
  }>;
}

// Form data for creating/updating vehicles
export interface VehicleFormData {
  stock: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  mileage: number;
  price: number;
  exteriorColor?: string;
  interiorColor?: string;
  fuelType?: string;
  transmission?: string;
  engine?: string;
  description?: string;
  status: VehicleStatus;
  featured: boolean;
  dealershipId: string;
}