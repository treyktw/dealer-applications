/* eslint-disable @typescript-eslint/no-explicit-any */

// lib/inventory-api-client.ts
/**
 * Public Inventory API Client
 * Use this to fetch inventory data from the dealer admin system
 */

export interface InventoryVehicle {
  id: string;
  vin: string;
  stock: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  bodyType?: string;
  condition?: 'new' | 'used' | 'certified_pre_owned';
  price: number;
  featured?: boolean;
  daysOnLot?: number;
  mileage: number;
  exteriorColor?: string;
  interiorColor?: string;
  engine?: string;
  horsepower?: string;
  transmission?: string;
  drivetrain?: string;
  fuelType?: string;
  features?: string[];
  safetyFeatures?: string[];
  images: Array<{
    url: string;
    isPrimary: boolean;
  }>;
  seoTitle?: string;
  seoDescription?: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
}

export interface InventoryFilters {
  page?: number;
  limit?: number;
  make?: string;
  model?: string;
  year?: number;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  sortBy?: 'price' | 'year' | 'mileage' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface InventoryResponse {
  vehicles: InventoryVehicle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface DealershipInfo {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  website: string;
  logo?: string;
  businessHours?: string;
}

export class InventoryAPIClient {
  private baseUrl: string;
  private dealershipId: string;
  private apiKey: string;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  constructor(config: {
    baseUrl: string;
    dealershipId: string;
    apiKey: string;
  }) {
    this.baseUrl = config.baseUrl;
    this.dealershipId = config.dealershipId;
    this.apiKey = config.apiKey;
    this.cache = new Map();
  }

  /**
   * Get cached data if available and not expired
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * Set cache data
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Make API request with error handling
   */
  private async request<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}/api/public/v1/dealerships/${this.dealershipId}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        // Use Next.js cache for even better performance
        next: { revalidate: 300 }, // 5 minutes
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Inventory API Error:', error);
      throw error;
    }
  }

  /**
   * Get inventory with filters
   */
  async getInventory(filters?: InventoryFilters): Promise<InventoryResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.make) params.append('make', filters.make);
      if (filters.model) params.append('model', filters.model);
      if (filters.year) params.append('year', filters.year.toString());
      if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
      if (filters.featured !== undefined) params.append('featured', filters.featured.toString());
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
    }

    const queryString = params.toString();
    const endpoint = `/inventory${queryString ? `?${queryString}` : ''}`;
    
    // Check cache
    const cacheKey = `inventory-${queryString}`;
    const cached = this.getCached<InventoryResponse>(cacheKey);
    if (cached) return cached;

    // Fetch fresh data
    const data = await this.request<InventoryResponse>(endpoint);
    this.setCache(cacheKey, data);
    
    return data;
  }

  /**
   * Get single vehicle by ID
   */
  async getVehicle(vehicleId: string): Promise<InventoryVehicle> {
    const cacheKey = `vehicle-${vehicleId}`;
    const cached = this.getCached<InventoryVehicle>(cacheKey);
    if (cached) return cached;

    const data = await this.request<InventoryVehicle>(`/inventory/${vehicleId}`);
    this.setCache(cacheKey, data);
    
    return data;
  }

  /**
   * Get available filters
   */
  async getFilters(): Promise<{
    makes: string[];
    models: { [make: string]: string[] };
    years: { min: number; max: number };
    prices: { min: number; max: number };
  }> {
    const cacheKey = 'filters';
    const cached = this.getCached<any>(cacheKey);
    if (cached) return cached;

    const data = await this.request<any>('/inventory/filters');
    this.setCache(cacheKey, data);
    
    return data;
  }

  /**
   * Get dealership info
   */
  async getDealershipInfo(): Promise<DealershipInfo> {
    const cacheKey = 'dealership-info';
    const cached = this.getCached<DealershipInfo>(cacheKey);
    if (cached) return cached;

    const data = await this.request<DealershipInfo>('');
    this.setCache(cacheKey, data);
    
    return data;
  }

  /**
   * Search vehicles
   */
  async search(query: string, limit?: number): Promise<{
    vehicles: InventoryVehicle[];
    total: number;
  }> {
    const params = new URLSearchParams({
      q: query,
      ...(limit && { limit: limit.toString() }),
    });

    return await this.request(`/search?${params.toString()}`);
  }

  /**
   * Get featured vehicles
   */
  async getFeatured(limit: number = 6): Promise<InventoryVehicle[]> {
    const response = await this.getInventory({
      featured: true,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return response.vehicles;
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Create a singleton instance for your dealership
 */
export function createInventoryClient() {
  return new InventoryAPIClient({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
    dealershipId: process.env.NEXT_PUBLIC_DEALERSHIP_ID!,
    apiKey: process.env.NEXT_PUBLIC_API_KEY!,
  });
}