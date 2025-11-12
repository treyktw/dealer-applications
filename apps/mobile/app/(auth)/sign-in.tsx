import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useState } from 'react';
import { Link } from 'expo-router';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    // TODO: Implement sign-in logic with Clerk
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-background"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6">
          {/* Logo */}
          <View className="mb-12 items-center">
            <View className="h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-secondary">
              <Text className="text-5xl font-bold text-primary-foreground">
                DA
              </Text>
            </View>
            <Text className="mt-6 text-3xl font-bold text-foreground">
              Dealer Applications
            </Text>
            <Text className="mt-3 text-center text-lg text-muted-foreground">
              Sign in to manage your dealership
            </Text>
          </View>

          {/* Email input */}
          <View className="mb-5">
            <Text className="mb-2 text-sm font-semibold text-foreground">
              Email
            </Text>
            <TextInput
              className="rounded-xl border border-input bg-card px-5 py-4 text-base text-foreground"
              placeholder="Enter your email"
              placeholderTextColor="hsl(240, 5%, 64.9%)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          {/* Password input */}
          <View className="mb-8">
            <Text className="mb-2 text-sm font-semibold text-foreground">
              Password
            </Text>
            <TextInput
              className="rounded-xl border border-input bg-card px-5 py-4 text-base text-foreground"
              placeholder="Enter your password"
              placeholderTextColor="hsl(240, 5%, 64.9%)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
            />
          </View>

          {/* Sign in button */}
          <TouchableOpacity
            className="mb-4 rounded-xl bg-primary py-5 active:opacity-80"
            onPress={handleSignIn}
            disabled={loading || !email || !password}
          >
            <Text className="text-center text-base font-bold text-primary-foreground">
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Forgot password */}
          <TouchableOpacity className="mb-8">
            <Text className="text-center text-sm font-medium text-primary">
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* Sign up link */}
          <View className="flex-row justify-center">
            <Text className="text-base text-muted-foreground">
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text className="text-base font-bold text-primary">
                  Sign Up
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
