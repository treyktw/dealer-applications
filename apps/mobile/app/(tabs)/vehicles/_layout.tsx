import { Stack } from 'expo-router';

export default function VehiclesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: 'rgb(20, 21, 27)',
        },
        headerTintColor: 'rgb(250, 250, 250)',
        contentStyle: { backgroundColor: 'rgb(11, 12, 16)' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Inventory',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Vehicle Details',
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Vehicle',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
