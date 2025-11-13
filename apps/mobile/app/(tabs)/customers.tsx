import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useState } from 'react';
import { AppHeader } from '../../components/AppHeader';

export default function CustomersScreen() {
  const [search, setSearch] = useState('');

  // Mock data for demonstration
  const customers = [
    { id: '1', name: 'John Smith', email: 'john@example.com', status: 'CUSTOMER' },
    { id: '2', name: 'Sarah Johnson', email: 'sarah@example.com', status: 'LEAD' },
    { id: '3', name: 'Mike Davis', email: 'mike@example.com', status: 'CUSTOMER' },
    { id: '4', name: 'Emily Brown', email: 'emily@example.com', status: 'LEAD' },
  ];

  return (
    <View className="flex-1 bg-background">
      <AppHeader 
        onSearchPress={() => {}}
      />
      {/* Search bar */}
      <View className="p-4 border-b border-border bg-card">
        <View className="flex-row items-center px-4 rounded-xl border border-input bg-background">
          <Text className="text-lg text-muted-foreground">🔍</Text>
          <TextInput
            className="flex-1 py-3 pl-3 text-base text-foreground"
            placeholder="Search customers..."
            placeholderTextColor="hsl(240, 5%, 64.9%)"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Customers list */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="gap-3">
          {customers.map((customer) => (
            <TouchableOpacity
              key={customer.id}
              className="p-5 rounded-2xl shadow-sm bg-card active:opacity-80"
            >
              <View className="flex-row justify-between items-center">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-foreground">
                    {customer.name}
                  </Text>
                  <Text className="mt-1 text-sm text-muted-foreground">
                    {customer.email}
                  </Text>
                  <View className="flex-row items-center mt-3">
                    <View
                      className={`rounded-full px-3 py-1 ${
                        customer.status === 'CUSTOMER'
                          ? 'bg-primary/10'
                          : 'bg-secondary/10'
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          customer.status === 'CUSTOMER'
                            ? 'text-primary'
                            : 'text-secondary'
                        }`}
                      >
                        {customer.status}
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
      <TouchableOpacity className="absolute right-6 bottom-6 justify-center items-center w-16 h-16 rounded-full shadow-lg bg-primary active:opacity-80">
        <Text className="text-3xl text-primary-foreground">+</Text>
      </TouchableOpacity>
    </View>
  );
}
