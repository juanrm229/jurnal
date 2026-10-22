/**
 * Penyimpanan di perangkat.
 * - secure: kunci identitas & token sesi (Keychain / Keystore). Di web jatuh ke
 *   localStorage — aplikasi memberi tahu bahwa versi web kurang aman.
 * - kv: cache biasa (antrean offline, preferensi tampilan).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const webStore = {
  get: (k: string) => {
    try {
      return globalThis.localStorage?.getItem(k) ?? null;
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      globalThis.localStorage?.setItem(k, v);
    } catch {}
  },
  del: (k: string) => {
    try {
      globalThis.localStorage?.removeItem(k);
    } catch {}
  },
};

export const secure = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return webStore.get(`sehari.secure.${key}`);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return webStore.set(`sehari.secure.${key}`, value);
    await SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY });
  },
  async del(key: string): Promise<void> {
    if (Platform.OS === 'web') return webStore.del(`sehari.secure.${key}`);
    await SecureStore.deleteItemAsync(key);
  },
};

export const kv = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(`sehari.${key}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async set(key: string, value: unknown): Promise<void> {
    await AsyncStorage.setItem(`sehari.${key}`, JSON.stringify(value));
  },
  async del(key: string): Promise<void> {
    await AsyncStorage.removeItem(`sehari.${key}`);
  },
  async clear(): Promise<void> {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith('sehari.'));
    await AsyncStorage.multiRemove(keys);
  },
};
