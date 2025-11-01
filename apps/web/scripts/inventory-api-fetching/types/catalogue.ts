// types/catalogue.ts
export interface CarInventoryItem {
  name: string;
  make: string;
  model: string;
  year: number;
  engine: string;
  horsepower: number;
  mileage: number;
  cost: number;
  location: string;
  imageUrl: string;
  status: 'available' | 'pending' | 'sold';
}