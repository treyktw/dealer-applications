import { View, Text, TouchableOpacity, TextInput, Image, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { useSignIn } from '@clerk/clerk-expo';
import { AuthButton } from '../../components/auth-buttons';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();

  const handleSendCode = async () => {
    if (!isLoaded || !email) return;

    setLoading(true);
    setError('');

    try {
      const signInAttempt = await signIn.create({
        identifier: email,
        strategy: 'email_code',
      });

      // Clerk will send the code via email automatically
      setCodeSent(true);
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!isLoaded || !code) return;

    setLoading(true);
    setError('');

    try {
      const signInAttempt = await signIn.attemptFirstFactor({
        strategy: 'email_code',
        code,
      });

      if (signInAttempt.status === 'complete') {
        await setActive({ session: signInAttempt.createdSessionId });
        // Redirect to main app - router will handle this based on auth state
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCode('');
    setCodeSent(false);
    await handleSendCode();
  };

  return (
    <View className="flex-1">
      {/* Background Image */}
      <Image
        source={require('../../assets/appbg2.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      {/* Dark Overlay */}
      <View style={styles.overlay} />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Content */}
          <View className="flex-1 justify-center px-6 mt-10">
            {/* Back Button */}
            <TouchableOpacity
              className="absolute left-6 top-12 z-10"
              onPress={() => router.back()}
            >
              <Text className="text-2xl text-foreground">←</Text>
            </TouchableOpacity>

            {/* Logo */}
            <View className="items-center mb-12">
              <View className="justify-center items-center w-28 h-24 bg-gradient-to-br rounded-3xl from-primary to-secondary">
                <Text className="text-5xl font-bold text-primary-foreground">
                  UAB
                </Text>
              </View>
              <Text className="mt-6 text-3xl font-bold text-foreground">
                Welcome Back 👋
              </Text>
              <Text className="mt-3 text-lg text-center text-primary-foreground">
                {codeSent ? 'Enter the code sent to your email' : 'Sign in to manage your dealership'}
              </Text>
            </View>

            {/* Error Message */}
            {error ? (
              <View className="px-4 py-3 mb-4 rounded-xl border bg-destructive/20 border-destructive">
                <Text className="text-sm text-center text-destructive">{error}</Text>
              </View>
            ) : null}

            {!codeSent ? (
              <>
                {/* Email Input */}
                <View className="mb-6">
                  <Text className="mb-2 text-sm font-semibold text-foreground">
                    Email
                  </Text>
                  <TextInput
                    className="px-5 py-4 text-base rounded-xl border border-input bg-card text-foreground"
                    placeholder="Enter your email"
                    placeholderTextColor="hsl(240, 5%, 64.9%)"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setError('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    editable={!loading}
                  />
                </View>

                {/* Remember Me Checkbox */}
                <TouchableOpacity
                  className="flex-row items-center mb-6"
                  onPress={() => setRememberMe(!rememberMe)}
                  disabled={loading}
                >
                  <View
                    className={`w-5 h-5 rounded border-2 items-center justify-center mr-3 ${
                      rememberMe
                        ? 'bg-primary border-primary'
                        : 'bg-transparent border-input'
                    }`}
                  >
                    {rememberMe && (
                      <Text className="text-xs text-primary-foreground">✓</Text>
                    )}
                  </View>
                  <Text className="text-sm text-foreground">Remember me</Text>
                </TouchableOpacity>

                {/* Send Code Button */}
                <View className="mb-6">
                  <AuthButton
                    variant="primary"
                    size="md"
                    onPress={handleSendCode}
                    loading={loading}
                    disabled={!email || loading}
                    className="w-full"
                  >
                    Send Code
                  </AuthButton>
                </View>
              </>
            ) : (
              <>
                {/* Code Input */}
                <View className="mb-6">
                  <Text className="mb-2 text-sm font-semibold text-foreground">
                    Verification Code
                  </Text>
                  <TextInput
                    className="px-5 py-4 text-2xl tracking-widest text-center rounded-xl border border-input bg-card text-foreground"
                    placeholder="000000"
                    placeholderTextColor="hsl(240, 5%, 64.9%)"
                    value={code}
                    onChangeText={(text) => {
                      setCode(text.replace(/[^0-9]/g, '').slice(0, 6));
                      setError('');
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                    autoFocus
                  />
                  <Text className="mt-2 text-xs text-center text-muted-foreground">
                    Code sent to {email}
                  </Text>
                </View>

                {/* Verify Code Button */}
                <View className="mb-4">
                  <AuthButton
                    variant="primary"
                    size="md"
                    onPress={handleVerifyCode}
                    loading={loading}
                    disabled={code.length !== 6 || loading}
                    className="w-full"
                  >
                    Verify Code
                  </AuthButton>
                </View>

                {/* Resend Code */}
                <TouchableOpacity
                  className="mb-6"
                  onPress={handleResendCode}
                  disabled={loading}
                >
                  <Text className="text-sm font-medium text-center text-primary">
                    Didn't receive code? Resend
                  </Text>
                </TouchableOpacity>

                {/* Change Email */}
                <TouchableOpacity
                  className="mb-6"
                  onPress={() => {
                    setCodeSent(false);
                    setCode('');
                    setError('');
                  }}
                  disabled={loading}
                >
                  <Text className="text-sm font-medium text-center text-muted-foreground">
                    Use a different email
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* Sign up link */}
            <View className="flex-row justify-center">
              <Text className="text-base text-muted-foreground">
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://universalautobrokers.net')}
              >
                <Text className="text-base font-bold text-primary">Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Adjust opacity here (0.0 - 1.0)
  },
});
