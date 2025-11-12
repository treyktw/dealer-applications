import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to sign-in by default
  // Later this will check auth state and redirect accordingly
  return <Redirect href="/(auth)/sign-in" />;
}
