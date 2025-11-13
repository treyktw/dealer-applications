import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';

interface MenuModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MenuModal({ visible, onClose }: MenuModalProps) {
  const router = useRouter();
  const { signOut } = useAuth();

  const menuItems = [
    {
      label: 'Dashboard',
      icon: 'home',
      route: '/(tabs)/index',
    },
    {
      label: 'Vehicles',
      icon: 'car',
      route: '/(tabs)/vehicles',
    },
    {
      label: 'Customers',
      icon: 'people',
      route: '/(tabs)/customers',
    },
    {
      label: 'Settings',
      icon: 'settings',
      route: '/(tabs)/settings',
    },
  ];

  const handleNavigate = (route: string) => {
    router.push(route as any);
    onClose();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.menuContainer}>
          <View className="bg-[#2d2d2e] rounded-t-3xl border-t border-border/50">
            {/* Header */}
            <View className="flex-row justify-between items-center p-6 border-b border-border/50">
              <Text className="text-xl font-bold text-foreground">Menu</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#71717a" />
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <View className="p-4">
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.route}
                  className="flex-row items-center p-4 mb-2 rounded-xl bg-[#1d1e1f] active:opacity-80"
                  onPress={() => handleNavigate(item.route)}
                >
                  <Ionicons name={item.icon as any} size={24} color="#0aadd1" />
                  <Text className="ml-4 text-base font-medium text-foreground">
                    {item.label}
                  </Text>
                  <View className="flex-1" />
                  <Ionicons name="chevron-forward" size={20} color="#71717a" />
                </TouchableOpacity>
              ))}
            </View>

            {/* Sign Out Button */}
            <View className="p-4 border-t border-border/50">
              <TouchableOpacity
                className="flex-row items-center justify-center p-4 rounded-xl bg-destructive/10 active:opacity-80"
                onPress={handleSignOut}
              >
                <Ionicons name="log-out-outline" size={24} color="#ef4444" />
                <Text className="ml-2 text-base font-medium text-destructive">
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  menuContainer: {
    maxHeight: '80%',
  },
});

