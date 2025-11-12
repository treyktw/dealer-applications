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

export default function SignUpScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    // TODO: Implement sign-up logic with Clerk
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
        <View className="flex-1 justify-center px-6 py-8">
          {/* Logo */}
          <View className="mb-8 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-secondary">
              <Text className="text-4xl font-bold text-primary-foreground">
                DA
              </Text>
            </View>
            <Text className="mt-5 text-3xl font-bold text-foreground">
              Create Account
            </Text>
            <Text className="mt-2 text-center text-base text-muted-foreground">
              Join Dealer Applications today
            </Text>
          </View>

          {/* First Name */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-foreground">
              First Name
            </Text>
            <TextInput
              className="rounded-xl border border-input bg-card px-5 py-4 text-base text-foreground"
              placeholder="Enter your first name"
              placeholderTextColor="hsl(240, 5%, 64.9%)"
              value={firstName}
              onChangeText={setFirstName}
              autoComplete="given-name"
              editable={!loading}
            />
          </View>

          {/* Last Name */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-foreground">
              Last Name
            </Text>
            <TextInput
              className="rounded-xl border border-input bg-card px-5 py-4 text-base text-foreground"
              placeholder="Enter your last name"
              placeholderTextColor="hsl(240, 5%, 64.9%)"
              value={lastName}
              onChangeText={setLastName}
              autoComplete="family-name"
              editable={!loading}
            />
          </View>

          {/* Email */}
          <View className="mb-4">
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

          {/* Password */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-foreground">
              Password
            </Text>
            <TextInput
              className="rounded-xl border border-input bg-card px-5 py-4 text-base text-foreground"
              placeholder="Create a password"
              placeholderTextColor="hsl(240, 5%, 64.9%)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password-new"
              editable={!loading}
            />
          </View>

          {/* Sign up button */}
          <TouchableOpacity
            className="mb-6 rounded-xl bg-primary py-5 active:opacity-80"
            onPress={handleSignUp}
            disabled={loading || !firstName || !lastName || !email || !password}
          >
            <Text className="text-center text-base font-bold text-primary-foreground">
              {loading ? 'Creating account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          {/* Sign in link */}
          <View className="flex-row justify-center">
            <Text className="text-base text-muted-foreground">
              Already have an account?{' '}
            </Text>
            <Link href="/(auth)/sign-in" asChild>
              <TouchableOpacity>
                <Text className="text-base font-bold text-primary">
                  Sign In
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
