import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex-api";
import { AppHeader } from "../../components/AppHeader";
import { DealershipSummaryWidget } from "../../components/DealershipSummaryWidget";
import { useRouter } from "expo-router";

export default function DashboardScreen() {
  const [showSearch, setShowSearch] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const router = useRouter();

  // Get current user
  const currentUser = useQuery(api.users.getCurrentUser);

  // Get vehicle stats
  const vehicleStats = useQuery(api.inventory.getStats);

  // Get client stats (will need dealershipId - for now using placeholder)
  const clientStats = useQuery(api.clients.getStats);

  // Loading state
  if (
    currentUser === undefined ||
    vehicleStats === undefined ||
    clientStats === undefined
  ) {
    return (
      <View className="flex-1 bg-background">
        <AppHeader />
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      </View>
    );
  }

  // Prepare data for summary
  const vehicles = vehicleStats?.totalVehicles ?? 0;
  const clients = clientStats?.activeClients ?? 0;
  const deals = vehicleStats?.recentSales ?? 0;
  const income = Math.round((vehicleStats?.totalValue ?? 0));
  const availableVehicles = vehicleStats?.availableVehicles ?? 0;
  const pendingVehicles = vehicleStats?.pendingVehicles ?? 0;

  // Navigation tabs
  const tabs = ["Overview", "Vehicles", "Customers", "Deals", "Analytics"];

  return (
    <View className="flex-1 bg-[#1d1e1f]">
      <AppHeader
        onSearchPress={() => setShowSearch(true)}
      />

      <ScrollView className="flex-1 bg-[#28282a] rounded-t-[32px]" showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className=""
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            gap: 4,
          }}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                setActiveTab(tab);
                if (tab === "Vehicles") router.push("/(tabs)/vehicles");
                else if (tab === "Customers") router.push("/(tabs)/customers");
              }}
              className={`px-6 py-4 h-16 rounded-full flex-1 justify-center items-center border ${
                activeTab === tab
                  ? "bg-card border-primary"
                  : "bg-transparent border-border/50"
              }`}
            >
              <Text
                className={`text-md font-medium ${
                  activeTab === tab ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View className="p-6">
          {/* Dealership Summary Widget */}
          <DealershipSummaryWidget
            vehicles={vehicles}
            clients={clients}
            deals={deals}
          />

          {/* Income Widget */}
          <View className="p-6 mb-6 rounded-2xl bg-[#2d2d2e] border-[#3f3f46] border-dashed border-2">
            <Text className="mb-6 text-xl font-bold text-foreground">
              Total Inventory Value
            </Text>
            <Text className="mb-1 text-4xl font-bold text-primary">
              ${income > 0 ? income.toLocaleString() : "0"}
            </Text>
            <Text className="mb-6 text-sm text-muted-foreground">
              Total inventory value
            </Text>

            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1 items-center py-3 rounded-xl border border-border/50 bg-[#1d1e1f] active:opacity-80">
                <Text className="text-sm font-medium text-foreground">
                  View Details
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 items-center py-3 rounded-xl border border-border/50 bg-[#1d1e1f] active:opacity-80">
                <Text className="text-sm font-medium text-foreground">
                  History
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Stats Cards */}
          <View className="gap-4">
            {/* Available Vehicles */}
            <TouchableOpacity
              className="p-6 rounded-2xl bg-[#2d2d2e] border-[#3f3f46] border-dashed border-2 active:opacity-80"
              onPress={() => router.push("/(tabs)/vehicles")}
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-muted-foreground">
                    Available Vehicles
                  </Text>
                  <Text className="mt-2 text-3xl font-bold text-primary">
                    {availableVehicles}
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    Ready for sale
                  </Text>
                </View>
                <View className="justify-center items-center w-16 h-16 rounded-2xl bg-primary/10">
                  <Text className="text-2xl">🚗</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Pending Sales */}
            <TouchableOpacity className="p-6 rounded-2xl bg-[#2d2d2e] border-[#3f3f46] border-dashed border-2 active:opacity-80">
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-muted-foreground">
                    Pending Sales
                  </Text>
                  <Text className="mt-2 text-3xl font-bold text-secondary">
                    {pendingVehicles}
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground">
                    In progress
                  </Text>
                </View>
                <View className="justify-center items-center w-16 h-16 rounded-2xl bg-secondary/10">
                  <Text className="text-2xl">⏳</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
