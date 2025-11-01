import { useState, useEffect, useCallback } from 'react';
import { createInventoryClient, type InventoryFilters, type InventoryVehicle } from '../api/inventory-api-client';

export function useInventory(filters?: InventoryFilters) {
  const [vehicles, setVehicles] = useState<InventoryVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const client = createInventoryClient();

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await client.getInventory(filters);
      setVehicles(response.vehicles);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [filters, client]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return {
    vehicles,
    loading,
    error,
    refetch: fetchVehicles,
  };
}