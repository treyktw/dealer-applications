import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  return (
    <ScrollView className="flex-1 bg-background">
      <View className="p-6">
        {/* User profile */}
        <View className="mb-6 items-center">
          <View className="size-24 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
            <Text className="text-4xl font-bold text-primary-foreground">
              {user?.firstName?.[0] || 'U'}
              {user?.lastName?.[0] || ''}
            </Text>
          </View>
          <Text className="mt-4 text-2xl font-bold text-foreground">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text className="mt-1 text-muted-foreground">
            {user?.primaryEmailAddress?.emailAddress}
          </Text>
        </View>

        {/* Account section */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Account
          </Text>
          <View className="rounded-xl bg-card">
            <TouchableOpacity className="flex-row items-center justify-between border-b border-border p-4">
              <View className="flex-row items-center">
                <Ionicons
                  name="person-outline"
                  size={24}
                  color="rgb(161, 163, 171)"
                />
                <Text className="ml-3 text-foreground">Edit Profile</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgb(161, 163, 171)"
              />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Ionicons
                  name="lock-closed-outline"
                  size={24}
                  color="rgb(161, 163, 171)"
                />
                <Text className="ml-3 text-foreground">Change Password</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgb(161, 163, 171)"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dealership section */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            Dealership
          </Text>
          <View className="rounded-xl bg-card">
            <TouchableOpacity className="flex-row items-center justify-between border-b border-border p-4">
              <View className="flex-row items-center">
                <Ionicons
                  name="business-outline"
                  size={24}
                  color="rgb(161, 163, 171)"
                />
                <Text className="ml-3 text-foreground">
                  Dealership Information
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgb(161, 163, 171)"
              />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between border-b border-border p-4">
              <View className="flex-row items-center">
                <Ionicons
                  name="people-outline"
                  size={24}
                  color="rgb(161, 163, 171)"
                />
                <Text className="ml-3 text-foreground">Team Members</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgb(161, 163, 171)"
              />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Ionicons
                  name="card-outline"
                  size={24}
                  color="rgb(161, 163, 171)"
                />
                <Text className="ml-3 text-foreground">Subscription</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgb(161, 163, 171)"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* App section */}
        <View className="mb-6">
          <Text className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
            App
          </Text>
          <View className="rounded-xl bg-card">
            <TouchableOpacity className="flex-row items-center justify-between border-b border-border p-4">
              <View className="flex-row items-center">
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color="rgb(161, 163, 171)"
                />
                <Text className="ml-3 text-foreground">Notifications</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgb(161, 163, 171)"
              />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between border-b border-border p-4">
              <View className="flex-row items-center">
                <Ionicons
                  name="moon-outline"
                  size={24}
                  color="rgb(161, 163, 171)"
                />
                <Text className="ml-3 text-foreground">Appearance</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgb(161, 163, 171)"
              />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center justify-between p-4">
              <View className="flex-row items-center">
                <Ionicons
                  name="help-circle-outline"
                  size={24}
                  color="rgb(161, 163, 171)"
                />
                <Text className="ml-3 text-foreground">Help & Support</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color="rgb(161, 163, 171)"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign out button */}
        <TouchableOpacity
          className="rounded-xl bg-destructive/10 p-4 active:opacity-80"
          onPress={handleSignOut}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons name="log-out-outline" size={24} color="rgb(239, 68, 68)" />
            <Text className="ml-2 font-semibold text-destructive">Sign Out</Text>
          </View>
        </TouchableOpacity>

        {/* Version info */}
        <Text className="mt-6 text-center text-xs text-muted-foreground">
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}
