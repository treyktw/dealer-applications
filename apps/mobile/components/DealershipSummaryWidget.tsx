import { View, Text, StyleSheet } from "react-native";
import { PieChart } from "react-native-gifted-charts";

interface DealershipSummaryWidgetProps {
  vehicles: number;
  clients: number;
  deals: number;
}

export function DealershipSummaryWidget({
  vehicles,
  clients,
  deals,
}: DealershipSummaryWidgetProps) {
  // Calculate total for percentages
  const total = vehicles + clients + deals;
  
  // Calculate percentages based on total
  const vehiclePercent = total > 0 ? Math.round((vehicles / total) * 100) : 0;
  const clientPercent = total > 0 ? Math.round((clients / total) * 100) : 0;
  const dealPercent = total > 0 ? Math.round((deals / total) * 100) : 0;

  return (
    <View className="p-6 mb-6 rounded-2xl bg-[#2d2d2e] border-[#3f3f46] border-dashed border-2">
      <Text className="mb-6 text-xl font-bold text-foreground">
        Dealership Summary
      </Text>

      <View className="flex-row justify-between items-center">
        {/* Left Side - Text with Bars */}
        <View className="flex-1 gap-4">
          {/* Vehicles */}
          <View className="flex-row gap-3 items-center">
            <View
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: "#f97316" }}
            />
            <View className="flex-1">
              <Text className="text-base font-medium text-foreground">
                {vehiclePercent}% Vehicles
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                {vehicles} total
              </Text>
            </View>
          </View>

          {/* Clients */}
          <View className="flex-row gap-3 items-center">
            <View
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: "#3b82f6" }}
            />
            <View className="flex-1">
              <Text className="text-base font-medium text-foreground">
                {clientPercent}% Clients
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                {clients} active
              </Text>
            </View>
          </View>

          {/* Deals */}
          <View className="flex-row gap-3 items-center">
            <View
              className="w-1 h-8 rounded-full"
              style={{ backgroundColor: "#10b981" }}
            />
            <View className="flex-1">
              <Text className="text-base font-medium text-foreground">
                {dealPercent}% Deals
              </Text>
              <Text className="text-xs text-muted-foreground mt-0.5">
                {deals} this month
              </Text>
            </View>
          </View>
        </View>

        {/* Right Side - Concentric Circular Progress */}
        <View
          className="justify-center items-center"
          style={{ width: 120, height: 120 }}
        >
          {/* Outer ring - Vehicles */}
          <View style={styles.ringContainer}>
            <PieChart
              data={[
                { value: vehiclePercent, color: "#f97316" },
                { value: 100 - vehiclePercent, color: "#27272a" },
              ]}
              donut
              radius={55}
              innerRadius={45}
              innerCircleColor="#18181b"
            />
          </View>

          {/* Middle ring - Clients */}
          <View style={[styles.ringContainer, { position: "absolute" }]}>
            <PieChart
              data={[
                { value: clientPercent, color: "#3b82f6" },
                { value: 100 - clientPercent, color: "#27272a" },
              ]}
              donut
              radius={42}
              innerRadius={32}
              innerCircleColor="#18181b"
            />
          </View>

          {/* Inner ring - Deals */}
          <View style={[styles.ringContainer, { position: "absolute" }]}>
            <PieChart
              data={[
                { value: dealPercent, color: "#10b981" },
                { value: 100 - dealPercent, color: "#27272a" },
              ]}
              donut
              radius={29}
              innerRadius={19}
              innerCircleColor="#18181b"
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ringContainer: {
    width: 120,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
});

