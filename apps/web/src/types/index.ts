export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED'; 

export interface InventoryStats {
  totalVehicles: number;
  totalValue: number;
  avgPrice: number;
  availableVehicles: number;
  pendingVehicles: number;
  soldVehicles: number;
  reservedVehicles: number;
  newInventoryThisMonth: number;
  inventoryChange: number;
  topMake: string;
  topMakeCount: number;
}