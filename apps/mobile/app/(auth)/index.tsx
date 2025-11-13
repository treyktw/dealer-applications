import { View, Text, Image, StyleSheet } from "react-native";
import { Linking } from "react-native";
import { AuthButton } from "../../components/auth-buttons";

export default function AuthWelcomeScreen() {
  const handleSignUp = () => {
    Linking.openURL("https://universalautobrokers.net");
  };

  return (
    <View className="flex-1">
      {/* Background Image */}
      <Image
        source={require("../../assets/appbg.jpg")}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      {/* Dark Overlay */}
      <View style={styles.overlay} />
      <View className="justify-center items-center mt-24 h-24 rounded-3xl w-26">
        <Text className="text-5xl font-bold text-primary-foreground">UAB</Text>
      </View>
      {/* Content */}
      <View className="flex-1 justify-end px-6">
        {/* Logo */}
        <View className="items-center mb-10">
          <Text className="mt-6 text-3xl font-bold text-foreground">
            Dealer Applications
          </Text>
          <Text className="mt-3 text-lg text-center text-primary-foreground">
            Welcome to your dealership management
          </Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-4 justify-center items-center mb-10">
          {/* Sign In Button */}
          <AuthButton href="/(auth)/sign-in" variant="primary" size="md">
            Log in
          </AuthButton>

          {/* Sign Up Button */}
          <AuthButton variant="primary" size="md" onPress={handleSignUp}>
            Sign up
          </AuthButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)", // Adjust opacity here (0.0 - 1.0)
  },
});
