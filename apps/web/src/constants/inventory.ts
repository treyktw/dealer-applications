// Mock vehicle data
export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  vin: string;
  mileage: number;
  color: string;
  transmission: string;
  fuelType: string;
  engineSize: string;
  description: string;
  features: string[];
  status: string;
  stockNumber: string;
  condition: string;
  bodyType: string;
  interiorColor: string;
  createdAt: string;
  updatedAt: string;
  images: string[];
}

// Mock activity
export interface Activity {
  id: string;
  type: string;
  content: string;
  date: string;
  user: string;
}