import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

export default function DashboardScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6">
        {/* Welcome header */}
        <View className="mb-8">
          <Text className="text-4xl font-bold text-foreground">
            Welcome back!
          </Text>
          <Text className="mt-3 text-lg text-muted-foreground">
            Here's what's happening with your dealership
          </Text>
        </View>

        {/* Stats grid */}
        <View className="gap-4">
          {/* Total Vehicles */}
          <View className="rounded-2xl bg-card p-6 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-medium text-muted-foreground">
                  Total Vehicles
                </Text>
                <Text className="mt-2 text-4xl font-bold text-foreground">
                  245
                </Text>
                <Text className="mt-1 text-sm text-muted-foreground">
                  +12% from last month
                </Text>
              </View>
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Text className="text-3xl">🚗</Text>
              </View>
            </View>
          </View>

          {/* Available Vehicles */}
          <View className="rounded-2xl bg-card p-6 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-medium text-muted-foreground">
                  Available
                </Text>
                <Text className="mt-2 text-4xl font-bold text-primary">
                  189
                </Text>
                <Text className="mt-1 text-sm text-muted-foreground">
                  Ready for sale
                </Text>
              </View>
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                <Text className="text-3xl">✅</Text>
              </View>
            </View>
          </View>

          {/* Pending Sales */}
          <View className="rounded-2xl bg-card p-6 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-medium text-muted-foreground">
                  Pending Sales
                </Text>
                <Text className="mt-2 text-4xl font-bold text-secondary">
                  23
                </Text>
                <Text className="mt-1 text-sm text-muted-foreground">
                  In progress
                </Text>
              </View>
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10">
                <Text className="text-3xl">⏳</Text>
              </View>
            </View>
          </View>

          {/* Sales This Month */}
          <View className="rounded-2xl bg-card p-6 shadow-sm">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-sm font-medium text-muted-foreground">
                  Sales This Month
                </Text>
                <Text className="mt-2 text-4xl font-bold text-foreground">
                  56
                </Text>
                <Text className="mt-1 text-sm text-muted-foreground">
                  +8% from last month
                </Text>
              </View>
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-accent">
                <Text className="text-3xl">📈</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mt-10">
          <Text className="mb-4 text-xl font-bold text-foreground">
            Quick Actions
          </Text>
          <View className="gap-3">
            <TouchableOpacity className="flex-row items-center rounded-2xl bg-card p-5">
              <View className="mr-4 h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                <Text className="text-2xl">➕</Text>
              </View>
              <View>
                <Text className="text-lg font-semibold text-foreground">
                  Add New Vehicle
                </Text>
                <Text className="mt-1 text-sm text-muted-foreground">
                  Scan VIN or enter manually
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center rounded-2xl bg-card p-5">
              <View className="mr-4 h-14 w-14 items-center justify-center rounded-xl bg-secondary/10">
                <Text className="text-2xl">👤</Text>
              </View>
              <View>
                <Text className="text-lg font-semibold text-foreground">
                  Add New Customer
                </Text>
                <Text className="mt-1 text-sm text-muted-foreground">
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
