import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';

export default function VehiclesScreen() {
  const [search, setSearch] = useState('');

  // Mock data for demonstration
  const vehicles = [
    {
      id: '1',
      year: 2023,
      make: 'Honda',
      model: 'Accord',
      vin: '1HGCV1F3XMA123456',
      price: 28500,
      mileage: 15000,
      status: 'AVAILABLE',
    },
    {
      id: '2',
      year: 2024,
      make: 'Toyota',
      model: 'Camry',
      vin: '4T1B11HK1RU123456',
      price: 32000,
      mileage: 8000,
      status: 'PENDING',
    },
    {
      id: '3',
      year: 2022,
      make: 'Ford',
      model: 'F-150',
      vin: '1FTFW1E52MFC12345',
      price: 45000,
      mileage: 25000,
      status: 'AVAILABLE',
    },
  ];

  return (
    <View className="flex-1 bg-background">
      {/* Search bar */}
      <View className="border-b border-border bg-card p-4">
        <View className="flex-row items-center rounded-xl border border-input bg-background px-4">
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
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="gap-3">
          {vehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              className="rounded-2xl bg-card p-5 shadow-sm active:opacity-80"
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-foreground">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </Text>
                  <Text className="mt-2 text-xs font-mono text-muted-foreground">
                    VIN: {vehicle.vin}
                  </Text>
                  <View className="mt-4 flex-row items-center justify-between">
                    <Text className="text-2xl font-bold text-primary">
                      ${vehicle.price.toLocaleString()}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {vehicle.mileage.toLocaleString()} mi
                    </Text>
                  </View>
                  <View className="mt-3 flex-row items-center">
                    <View
                      className={`rounded-full px-3 py-1 ${
                        vehicle.status === 'AVAILABLE'
                          ? 'bg-primary/10'
                          : 'bg-secondary/10'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          vehicle.status === 'AVAILABLE'
                            ? 'text-primary'
                            : 'text-secondary'
                        }`}
                      >
                        {vehicle.status}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text className="text-2xl text-muted-foreground">›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Floating action button */}
      <TouchableOpacity className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80">
        <Text className="text-3xl text-primary-foreground">+</Text>
      </TouchableOpacity>
    </View>
  );
}
