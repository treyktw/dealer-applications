import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { MenuModal } from './MenuModal';

interface AppHeaderProps {
  onSearchPress?: () => void;
}

export function AppHeader({ onSearchPress }: AppHeaderProps) {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleHomePress = () => {
    router.push('/(tabs)');
  };

  return (
    <>
      <View className="flex-row justify-between items-center px-6 py-4 mt-16 bg-[#1d1e1f] ">
        {/* App Name - Clickable to go home */}
        <TouchableOpacity
          onPress={handleHomePress}
          activeOpacity={0.7}
        >
          <Text className="text-2xl font-bold text-foreground">UAB</Text>
        </TouchableOpacity>

        {/* Right Actions */}
        <View className="flex-row gap-4 items-center">
          {/* Search Button */}
          <TouchableOpacity
            onPress={onSearchPress}
            className="p-2 rounded-2xl bg-primary/10"
            activeOpacity={0.7}
          >
            <Ionicons name="search" size={24} color="#0aadd1" />
          </TouchableOpacity>

          {/* Menu Button */}
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            className="p-2 rounded-2xl bg-primary/10"
            activeOpacity={0.7}
          >
            <Ionicons name="menu" size={24} color="#0aadd1" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Modal */}
      <MenuModal visible={menuVisible} onClose={() => setMenuVisible(false)} />
    </>
  );
}

