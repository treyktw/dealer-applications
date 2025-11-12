import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter, Link } from 'expo-router';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSignInPress = async () => {
    if (!isLoaded) return;

    setLoading(true);
    setError('');

    try {
      const completeSignIn = await signIn.create({
        identifier: emailAddress,
        password,
      });

      await setActive({ session: completeSignIn.createdSessionId });
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ message: string }> };
      setError(error?.errors?.[0]?.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
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
          <View className="mb-8 items-center">
            <View className="size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary">
              <Text className="text-4xl font-bold text-primary-foreground">
                DA
              </Text>
            </View>
            <Text className="mt-4 text-2xl font-bold text-foreground">
              Dealer Applications
            </Text>
            <Text className="mt-2 text-muted-foreground">
              Sign in to your account
            </Text>
          </View>

          {/* Error message */}
          {error ? (
            <View className="mb-4 rounded-lg bg-destructive/10 p-4">
              <Text className="text-destructive">{error}</Text>
            </View>
          ) : null}

          {/* Email input */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-foreground">
              Email
            </Text>
            <TextInput
              className="rounded-lg border border-input bg-card px-4 py-3 text-foreground"
              placeholder="Enter your email"
              placeholderTextColor="rgb(161, 163, 171)"
              value={emailAddress}
              onChangeText={setEmailAddress}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
            />
          </View>

          {/* Password input */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-foreground">
              Password
            </Text>
            <TextInput
              className="rounded-lg border border-input bg-card px-4 py-3 text-foreground"
              placeholder="Enter your password"
              placeholderTextColor="rgb(161, 163, 171)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              editable={!loading}
            />
          </View>

          {/* Sign in button */}
          <TouchableOpacity
            className="rounded-lg bg-primary py-4 active:opacity-80"
            onPress={onSignInPress}
            disabled={loading || !emailAddress || !password}
          >
            <Text className="text-center font-semibold text-primary-foreground">
              {loading ? 'Signing in...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          {/* Sign up link */}
          <View className="mt-6 flex-row justify-center">
            <Text className="text-muted-foreground">
              Don't have an account?{' '}
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text className="font-semibold text-primary">Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
