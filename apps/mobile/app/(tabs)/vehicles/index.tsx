import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const DEALERSHIP_ID = process.env.EXPO_PUBLIC_DEALERSHIP_ID || 'dealership123';

export default function VehiclesListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const result = useQuery(api.inventory.getVehicles, {
    dealershipId: DEALERSHIP_ID,
    page: 1,
    limit: 50,
    search: search || undefined,
  });

  const vehicles = result?.vehicles || [];

  return (
    <View className="flex-1 bg-background">
      {/* Search bar */}
      <View className="border-b border-border bg-card p-4">
        <View className="flex-row items-center rounded-lg border border-input bg-background px-4">
          <Ionicons name="search" size={20} color="rgb(161, 163, 171)" />
          <TextInput
            className="flex-1 py-3 pl-3 text-foreground"
            placeholder="Search by VIN, make, model..."
            placeholderTextColor="rgb(161, 163, 171)"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Vehicles list */}
      <FlatList
        data={vehicles}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="rounded-xl bg-card p-4 shadow-sm active:opacity-80"
            onPress={() => router.push(`/(tabs)/vehicles/${item._id}`)}
          >
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-lg font-semibold text-foreground">
                  {item.year} {item.make} {item.model}
                </Text>
                {item.trim && (
                  <Text className="mt-1 text-sm text-muted-foreground">
                    {item.trim}
                  </Text>
                )}
                <Text className="mt-1 text-xs text-muted-foreground">
                  VIN: {item.vin}
                </Text>
                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-lg font-bold text-primary">
                    ${item.price?.toLocaleString() || 'N/A'}
                  </Text>
                  {item.mileage ? (
                    <Text className="text-sm text-muted-foreground">
                      {item.mileage.toLocaleString()} mi
                    </Text>
                  ) : null}
                </View>
                <View className="mt-2 flex-row items-center">
                  <View
                    className={`rounded-full px-3 py-1 ${
                      item.status === 'AVAILABLE'
                        ? 'bg-success/10'
                        : item.status === 'SOLD'
                          ? 'bg-info/10'
                          : item.status === 'PENDING'
                            ? 'bg-warning/10'
                            : 'bg-muted'
                    }`}
                  >
                    <Text
                      className={`text-xs font-medium ${
                        item.status === 'AVAILABLE'
                          ? 'text-success'
                          : item.status === 'SOLD'
                            ? 'text-info'
                            : item.status === 'PENDING'
                              ? 'text-warning'
                              : 'text-muted-foreground'
                      }`}
                    >
                      {item.status}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgb(161, 163, 171)"
              />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <Ionicons
              name="car-outline"
              size={64}
              color="rgb(161, 163, 171)"
            />
            <Text className="mt-4 text-lg text-muted-foreground">
              No vehicles found
            </Text>
            <Text className="mt-2 text-center text-sm text-muted-foreground">
              {search
                ? 'Try a different search term'
                : 'Add your first vehicle to get started'}
            </Text>
          </View>
        }
      />

      {/* Floating action button */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 size-14 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
        onPress={() => router.push('/(tabs)/vehicles/add')}
      >
        <Ionicons name="add" size={32} color="rgb(250, 250, 250)" />
      </TouchableOpacity>
    </View>
  );
}
