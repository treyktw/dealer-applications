import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

export default function SettingsScreen() {
  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6">
        {/* User profile */}
        <View className="mb-8 items-center">
          <View className="h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
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
          <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Account
          </Text>
          <View className="rounded-2xl bg-card overflow-hidden">
            <TouchableOpacity className="flex-row items-center justify-between border-b border-border p-5">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">👤</Text>
                <Text className="text-base font-medium text-foreground">
                  Edit Profile
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between p-5">
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
          <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Dealership
          </Text>
          <View className="rounded-2xl bg-card overflow-hidden">
            <TouchableOpacity className="flex-row items-center justify-between border-b border-border p-5">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">🏢</Text>
                <Text className="text-base font-medium text-foreground">
                  Dealership Info
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between border-b border-border p-5">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">👥</Text>
                <Text className="text-base font-medium text-foreground">
                  Team Members
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between p-5">
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
          <Text className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            App
          </Text>
          <View className="rounded-2xl bg-card overflow-hidden">
            <TouchableOpacity className="flex-row items-center justify-between border-b border-border p-5">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">🔔</Text>
                <Text className="text-base font-medium text-foreground">
                  Notifications
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between border-b border-border p-5">
              <View className="flex-row items-center">
                <Text className="mr-3 text-xl">🌙</Text>
                <Text className="text-base font-medium text-foreground">
                  Appearance
                </Text>
              </View>
              <Text className="text-xl text-muted-foreground">›</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between p-5">
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
        <TouchableOpacity className="mb-6 rounded-2xl bg-destructive/10 p-5 active:opacity-80">
          <View className="flex-row items-center justify-center">
            <Text className="mr-2 text-xl">🚪</Text>
            <Text className="text-base font-bold text-destructive">
              Sign Out
            </Text>
          </View>
        </TouchableOpacity>

        {/* Version info */}
        <Text className="text-center text-sm text-muted-foreground">
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
