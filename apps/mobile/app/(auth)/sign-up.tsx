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
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter, Link } from 'expo-router';

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    setLoading(true);
    setError('');

    try {
      await signUp.create({
        emailAddress,
        password,
        firstName,
        lastName,
      });

      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ message: string }> };
      setError(error?.errors?.[0]?.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyPress = async () => {
    if (!isLoaded) return;

    setLoading(true);
    setError('');

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      await setActive({ session: completeSignUp.createdSessionId });
      router.replace('/(tabs)');
    } catch (err: unknown) {
      const error = err as { errors?: Array<{ message: string }> };
      setError(error?.errors?.[0]?.message || 'Failed to verify');
    } finally {
      setLoading(false);
    }
  };

  if (pendingVerification) {
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
            <View className="mb-8">
              <Text className="text-2xl font-bold text-foreground">
                Verify your email
              </Text>
              <Text className="mt-2 text-muted-foreground">
                Enter the verification code sent to {emailAddress}
              </Text>
            </View>

            {error ? (
              <View className="mb-4 rounded-lg bg-destructive/10 p-4">
                <Text className="text-destructive">{error}</Text>
              </View>
            ) : null}

            <View className="mb-6">
              <Text className="mb-2 text-sm font-medium text-foreground">
                Verification Code
              </Text>
              <TextInput
                className="rounded-lg border border-input bg-card px-4 py-3 text-foreground"
                placeholder="Enter 6-digit code"
                placeholderTextColor="rgb(161, 163, 171)"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              className="rounded-lg bg-primary py-4 active:opacity-80"
              onPress={onVerifyPress}
              disabled={loading || code.length !== 6}
            >
              <Text className="text-center font-semibold text-primary-foreground">
                {loading ? 'Verifying...' : 'Verify Email'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

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
          <View className="mb-8 items-center">
            <View className="size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary">
              <Text className="text-4xl font-bold text-primary-foreground">
                DA
              </Text>
            </View>
            <Text className="mt-4 text-2xl font-bold text-foreground">
              Create an account
            </Text>
            <Text className="mt-2 text-muted-foreground">
              Get started with Dealer Applications
            </Text>
          </View>

          {error ? (
            <View className="mb-4 rounded-lg bg-destructive/10 p-4">
              <Text className="text-destructive">{error}</Text>
            </View>
          ) : null}

          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-foreground">
              First Name
            </Text>
            <TextInput
              className="rounded-lg border border-input bg-card px-4 py-3 text-foreground"
              placeholder="Enter your first name"
              placeholderTextColor="rgb(161, 163, 171)"
              value={firstName}
              onChangeText={setFirstName}
              autoComplete="given-name"
              editable={!loading}
            />
          </View>

          <View className="mb-4">
            <Text className="mb-2 text-sm font-medium text-foreground">
              Last Name
            </Text>
            <TextInput
              className="rounded-lg border border-input bg-card px-4 py-3 text-foreground"
              placeholder="Enter your last name"
              placeholderTextColor="rgb(161, 163, 171)"
              value={lastName}
              onChangeText={setLastName}
              autoComplete="family-name"
              editable={!loading}
            />
          </View>

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

          <View className="mb-6">
            <Text className="mb-2 text-sm font-medium text-foreground">
              Password
            </Text>
            <TextInput
              className="rounded-lg border border-input bg-card px-4 py-3 text-foreground"
              placeholder="Create a password"
              placeholderTextColor="rgb(161, 163, 171)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            className="rounded-lg bg-primary py-4 active:opacity-80"
            onPress={onSignUpPress}
            disabled={
              loading || !emailAddress || !password || !firstName || !lastName
            }
          >
            <Text className="text-center font-semibold text-primary-foreground">
              {loading ? 'Creating account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <View className="mt-6 flex-row justify-center">
            <Text className="text-muted-foreground">
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <Text className="font-semibold text-primary">Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
