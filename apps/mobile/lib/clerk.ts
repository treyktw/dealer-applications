import * as SecureStore from 'expo-secure-store';

/**
 * Clerk token cache using Expo SecureStore
 * This securely stores authentication tokens on the device
 */
export const tokenCache = {
  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  async saveToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error('Error saving token:', error);
    }
  },

  async removeToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error('Error removing token:', error);
    }
  },
};
