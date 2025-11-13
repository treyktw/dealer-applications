import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { AuthButton } from '../../components/auth-buttons';

export default function SignUpScreen() {
  const router = useRouter();

  const handleSignUp = () => {
    Linking.openURL('https://universalautobrokers.net');
  };

  return (
    <ImageBackground
      source={require('../../assets/appbg2.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <View className="flex-1 justify-center px-6">
        {/* Back Button */}
        <TouchableOpacity
          className="absolute left-6 top-12 z-10"
          onPress={() => router.back()}
        >
          <Text className="text-2xl text-foreground">←</Text>
        </TouchableOpacity>

        {/* Logo */}
        <View className="items-center mb-12">
          <View className="justify-center items-center w-24 h-24 bg-gradient-to-br rounded-3xl from-primary to-secondary">
            <Text className="text-5xl font-bold text-primary-foreground">
              DA
            </Text>
          </View>
          <Text className="mt-6 text-3xl font-bold text-foreground">
            Sign up
          </Text>
          <Text className="mt-3 text-lg text-center text-muted-foreground">
            Create your account on our web platform
          </Text>
        </View>

        {/* Sign Up Button */}
        <View className="mb-6">
          <AuthButton
            variant="primary"
            size="md"
            onPress={handleSignUp}
            className="w-full"
          >
            Sign up on Web
          </AuthButton>
        </View>

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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
