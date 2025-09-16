export type ClientStatus = 'LEAD' | 'CUSTOMER' | 'PREVIOUS';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  source: string | null;
  status: ClientStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  dealershipId: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  status: 'available' | 'sold' | 'pending' | 'reserved';
  vin?: string;
  stock?: string;
  mileage?: number;
  exteriorColor?: string;
  interiorColor?: string;
  transmission?: string;
  fuelType?: string;
  engine?: string;
  trim?: string;
  featured?: boolean;
  lastViewed?: string;
  dealershipId: string;
}

export interface Activity {
  id: string;
  type: 'note' | 'email' | 'call' | 'visit' | 'purchase';
  content: string;
  date: string;
  user: string;
  clientId: string;
  dealershipId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientFormData {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  source: string | null;
  status: ClientStatus;
  notes: string | null;
  dealershipId: string;
}