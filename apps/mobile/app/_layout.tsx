import '../global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { ClerkProvider, ClerkLoaded, useAuth } from '@clerk/clerk-expo';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { convex } from '@/lib/convex';
import { tokenCache } from '@/lib/clerk';

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error(
    'Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY environment variable.\n' +
      'Add it to your .env file or set it in your environment.'
  );
}

/**
 * Auth guard - redirects to sign-in if not authenticated
 */
function InitialLayout() {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      // Redirect to sign-in if not authenticated
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn && inAuthGroup) {
      // Redirect to app if authenticated
      router.replace('/(tabs)');
    }
  }, [isLoaded, isSignedIn, segments]);

  return <Slot />;
}

/**
 * Root layout with all providers
 */
export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar style="light" />
            <InitialLayout />
          </GestureHandlerRootView>
        </ConvexProviderWithClerk>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
