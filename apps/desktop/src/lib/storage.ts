// src/lib/secure-storage-simple.ts - Simple plugin-store without encryption
import { Store } from '@tauri-apps/plugin-store';

const STORE_FILE = '.dealer-session.dat';
const TOKEN_KEY = 'session_token';

let storeInstance: Store | null = null;

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_FILE);
  }
  return storeInstance;
}

export async function storeToken(token: string): Promise<void> {
  const store = await getStore();
  await store.set(TOKEN_KEY, token);
  await store.save();
}

export async function getStoredToken(): Promise<string | null> {
  const store = await getStore();
  const token = await store.get<string>(TOKEN_KEY);
  return token || null;
}

export async function removeToken(): Promise<void> {
  const store = await getStore();
  await store.delete(TOKEN_KEY);
  await store.save();
}