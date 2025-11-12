import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const { user } = useUser();
  const stats = useQuery(api.inventory.getStats);

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6">
        {/* Welcome header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-foreground">
            Welcome back, {user?.firstName || 'there'}!
          </Text>
          <Text className="mt-2 text-muted-foreground">
            Here's what's happening with your dealership
          </Text>
        </View>

        {/* Stats grid */}
        <View className="gap-4">
          {/* Total Vehicles */}
          <View className="rounded-xl bg-card p-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-muted-foreground">
                  Total Vehicles
                </Text>
                <Text className="mt-1 text-3xl font-bold text-foreground">
                  {stats?.totalVehicles || 0}
                </Text>
              </View>
              <View className="size-12 items-center justify-center rounded-full bg-primary/10">
                <Ionicons name="car" size={24} color="rgb(17, 185, 199)" />
              </View>
            </View>
          </View>

          {/* Available Vehicles */}
          <View className="rounded-xl bg-card p-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-muted-foreground">
                  Available
                </Text>
                <Text className="mt-1 text-3xl font-bold text-success">
                  {stats?.availableVehicles || 0}
                </Text>
              </View>
              <View className="size-12 items-center justify-center rounded-full bg-success/10">
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="rgb(34, 197, 94)"
                />
              </View>
            </View>
          </View>

          {/* Pending Sales */}
          <View className="rounded-xl bg-card p-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-muted-foreground">
                  Pending Sales
                </Text>
                <Text className="mt-1 text-3xl font-bold text-warning">
                  {stats?.pendingVehicles || 0}
                </Text>
              </View>
              <View className="size-12 items-center justify-center rounded-full bg-warning/10">
                <Ionicons
                  name="time-outline"
                  size={24}
                  color="rgb(234, 179, 8)"
                />
              </View>
            </View>
          </View>

          {/* Sales This Month */}
          <View className="rounded-xl bg-card p-5 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm text-muted-foreground">
                  Sales This Month
                </Text>
                <Text className="mt-1 text-3xl font-bold text-info">
                  {stats?.recentSales || 0}
                </Text>
              </View>
              <View className="size-12 items-center justify-center rounded-full bg-info/10">
                <Ionicons
                  name="trending-up"
                  size={24}
                  color="rgb(59, 130, 246)"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mt-8">
          <Text className="mb-4 text-lg font-semibold text-foreground">
            Quick Actions
          </Text>
          <View className="gap-3">
            <TouchableOpacity className="flex-row items-center rounded-xl bg-card p-4">
              <View className="mr-4 size-10 items-center justify-center rounded-full bg-primary/10">
                <Ionicons name="add" size={24} color="rgb(17, 185, 199)" />
              </View>
              <View>
                <Text className="font-semibold text-foreground">
                  Add New Vehicle
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Scan VIN or enter manually
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center rounded-xl bg-card p-4">
              <View className="mr-4 size-10 items-center justify-center rounded-full bg-secondary/10">
                <Ionicons
                  name="person-add"
                  size={24}
                  color="rgb(145, 107, 209)"
                />
              </View>
              <View>
                <Text className="font-semibold text-foreground">
                  Add New Customer
                </Text>
                <Text className="text-sm text-muted-foreground">
                  Create a new lead or customer
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
