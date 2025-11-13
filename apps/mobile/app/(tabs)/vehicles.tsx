import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useState, useMemo } from 'react';
import { AppHeader } from '../../components/AppHeader';
import { useQuery } from 'convex/react';
import { api } from '../../convex-api';

export default function VehiclesScreen() {
  const [search, setSearch] = useState('');

  // Get current user to get dealershipId
  const currentUser = useQuery(api.users.getCurrentUser);

  // Get vehicles from Convex
  const vehiclesData = useQuery(
    api.inventory.getVehicles,
    currentUser?.dealershipId
      ? {
          dealershipId: currentUser.dealershipId.toString(),
          limit: 100, // Get more vehicles
        }
      : 'skip'
  );

  // Filter vehicles based on search
  const vehicles = useMemo(() => {
    // The query returns { vehicles: [...], total, page, etc. }
    const vehicleList = vehiclesData?.vehicles || [];
    
    if (!vehicleList || vehicleList.length === 0) return [];
    
    if (!search.trim()) {
      return vehicleList;
    }

    const searchLower = search.toLowerCase();
    return vehicleList.filter((vehicle) => {
      const searchableText = [
        vehicle.make,
        vehicle.model,
        vehicle.vin,
        vehicle.stock,
        vehicle.year?.toString(),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(searchLower);
    });
  }, [vehiclesData, search]);

  // Loading state
  if (currentUser === undefined) {
    return (
      <View className="flex-1 bg-[#1d1e1f]">
        <AppHeader onSearchPress={() => {}} />
        <View className="flex-1 justify-center items-center bg-[#28282a] rounded-t-[32px]">
          <ActivityIndicator size="large" color="#0aadd1" />
        </View>
      </View>
    );
  }

  // Check if user has a dealership
  if (currentUser && !currentUser.dealershipId) {
    return (
      <View className="flex-1 bg-[#1d1e1f]">
        <AppHeader onSearchPress={() => {}} />
        <View className="flex-1 justify-center items-center bg-[#28282a] rounded-t-[32px]">
          <Text className="text-lg font-medium text-muted-foreground">
            No dealership associated
          </Text>
          <Text className="mt-2 text-sm text-muted-foreground">
            Please contact your administrator
          </Text>
        </View>
      </View>
    );
  }

  // Loading vehicles
  if (vehiclesData === undefined) {
    return (
      <View className="flex-1 bg-[#1d1e1f]">
        <AppHeader onSearchPress={() => {}} />
        <View className="flex-1 justify-center items-center bg-[#28282a] rounded-t-[32px]">
          <ActivityIndicator size="large" color="#0aadd1" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#1d1e1f]">
      <AppHeader 
        onSearchPress={() => {}}
      />
      
      <ScrollView className="flex-1 bg-[#28282a] rounded-t-[32px]" showsVerticalScrollIndicator={false}>
        {/* Search bar */}
        <View className="p-4">
          <View className="flex-row items-center rounded-xl border border-[#3f3f46] bg-[#2d2d2e] px-4">
            <Text className="text-lg text-muted-foreground">🔍</Text>
            <TextInput
              className="flex-1 py-3 pl-3 text-base text-foreground"
              placeholder="Search by VIN, make, model..."
              placeholderTextColor="hsl(240, 5%, 64.9%)"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {/* Vehicles list */}
        <View className="p-6">
          {vehicles.length === 0 ? (
            <View className="justify-center items-center py-12">
              <Text className="text-lg font-medium text-muted-foreground">
                {search ? 'No vehicles found' : 'No vehicles available'}
              </Text>
              <Text className="mt-2 text-sm text-muted-foreground">
                {search
                  ? 'Try adjusting your search terms'
                  : 'Add your first vehicle to get started'}
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {vehicles.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle._id}
                  className="p-6 rounded-2xl bg-[#2d2d2e] border-[#3f3f46] border-dashed border-2 active:opacity-80"
                >
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-xl font-bold text-foreground">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </Text>
                      {vehicle.trim && (
                        <Text className="mt-1 text-sm text-muted-foreground">
                          {vehicle.trim}
                        </Text>
                      )}
                      {vehicle.vin && (
                        <Text className="mt-2 font-mono text-xs text-muted-foreground">
                          VIN: {vehicle.vin}
                        </Text>
                      )}
                      <View className="flex-row justify-between items-center mt-4">
                        <Text className="text-2xl font-bold text-primary">
                          ${vehicle.price ? vehicle.price.toLocaleString() : 'N/A'}
                        </Text>
                        {vehicle.mileage && (
                          <Text className="text-sm text-muted-foreground">
                            {vehicle.mileage.toLocaleString()} mi
                          </Text>
                        )}
                      </View>
                      <View className="flex-row items-center mt-3">
                        <View
                          className={`rounded-full px-3 py-1 ${
                            vehicle.status === 'AVAILABLE'
                              ? 'bg-primary/10'
                              : vehicle.status === 'PENDING'
                              ? 'bg-secondary/10'
                              : 'bg-muted/10'
                          }`}
                        >
                          <Text
                            className={`text-xs font-bold ${
                              vehicle.status === 'AVAILABLE'
                                ? 'text-primary'
                                : vehicle.status === 'PENDING'
                                ? 'text-secondary'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {vehicle.status || 'UNKNOWN'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text className="text-2xl text-muted-foreground">›</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating action button */}
      <TouchableOpacity className="absolute right-6 bottom-6 justify-center items-center w-16 h-16 rounded-full shadow-lg bg-primary active:opacity-80">
        <Text className="text-3xl text-primary-foreground">+</Text>
      </TouchableOpacity>
    </View>
  );
}
