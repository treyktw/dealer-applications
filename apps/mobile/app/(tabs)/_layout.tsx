import { Tabs } from 'expo-router';
import { View } from 'react-native';

// Simple icon components (will replace with proper icons later)
const HomeIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 4 }} />
);

const PeopleIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 12 }} />
);

const CarIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 6 }} />
);

const SettingsIcon = ({ color }: { color: string }) => (
  <View style={{ width: 24, height: 24, backgroundColor: color, borderRadius: 2 }} />
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: 'hsl(240, 10%, 6.8%)',
        },
        headerTintColor: 'hsl(0, 0%, 98%)',
        tabBarStyle: {
          backgroundColor: 'hsl(240, 10%, 6.8%)',
          borderTopColor: 'hsl(240, 3.7%, 15.9%)',
        },
        tabBarActiveTintColor: 'hsl(191, 91%, 43%)',
        tabBarInactiveTintColor: 'hsl(240, 5%, 64.9%)',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color }) => <PeopleIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="vehicles"
        options={{
          title: 'Vehicles',
          tabBarIcon: ({ color }) => <CarIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
