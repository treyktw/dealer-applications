import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { AppHeader } from '../../components/AppHeader';

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-background">
      <AppHeader 
        onSearchPress={() => {}}
      />
      <ScrollView className="flex-1 bg-background">
        <View className="p-6">
        {/* User profile */}
        <View className="items-center mb-8">
          <View className="justify-center items-center w-28 h-28 bg-gradient-to-br rounded-full from-primary to-secondary">
            <Text className="text-5xl font-bold text-primary-foreground">
              JD
            </Text>
          </View>
          <Text className="mt-5 text-3xl font-bold text-foreground">
            John Doe
          </Text>
          <Text className="mt-2 text-base text-muted-foreground">
            john@dealership.com
          </Text>
        </View>

        {/* Account section */}
        <View className="mb-6">
          <Text className="mb-3 text-xs font-bold tracking-wider uppercase text-muted-foreground">
            Account
          </Text>
          <View className="overflow-hidden rounded-2xl bg-card">
            <TouchableOpacity className="flex-row justify-between items-center p-5 border-b border-border">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">👤</Text>
                <Text className="text-base font-medium text-foreground">
                  Edit Profile
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row justify-between items-center p-5">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">🔒</Text>
                <Text className="text-base font-medium text-foreground">
                  Change Password
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dealership section */}
        <View className="mb-6">
          <Text className="mb-3 text-xs font-bold tracking-wider uppercase text-muted-foreground">
            Dealership
          </Text>
          <View className="overflow-hidden rounded-2xl bg-card">
            <TouchableOpacity className="flex-row justify-between items-center p-5 border-b border-border">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">🏢</Text>
                <Text className="text-base font-medium text-foreground">
                  Dealership Info
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row justify-between items-center p-5 border-b border-border">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">👥</Text>
                <Text className="text-base font-medium text-foreground">
                  Team Members
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row justify-between items-center p-5">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">💳</Text>
                <Text className="text-base font-medium text-foreground">
                  Subscription
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* App section */}
        <View className="mb-6">
          <Text className="mb-3 text-xs font-bold tracking-wider uppercase text-muted-foreground">
            App
          </Text>
          <View className="overflow-hidden rounded-2xl bg-card">
            <TouchableOpacity className="flex-row justify-between items-center p-5 border-b border-border">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">🔔</Text>
                <Text className="text-base font-medium text-foreground">
                  Notifications
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row justify-between items-center p-5 border-b border-border">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">🌙</Text>
                <Text className="text-base font-medium text-foreground">
                  Appearance
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row justify-between items-center p-5">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">❓</Text>
                <Text className="text-base font-medium text-foreground">
                  Help & Support
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign out button */}
        <TouchableOpacity className="p-5 mb-6 rounded-2xl bg-destructive/10 active:opacity-80">
          <View className="flex-row justify-center items-center">
            <Text className="mr-2 text-xl">🚪</Text>
            <Text className="text-base font-bold text-destructive">
              Sign Out
            </Text>
          </View>
        </TouchableOpacity>

        {/* Version info */}
        <Text className="text-sm text-center text-muted-foreground">
          Version 1.0.0
        </Text>
      </View>
      </ScrollView>
    </View>
  );
}
