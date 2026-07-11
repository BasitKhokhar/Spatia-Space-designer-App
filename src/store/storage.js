import { MMKV } from 'react-native-mmkv';

// Single MMKV instance for the whole app. Fast, synchronous, encrypted-capable.
export const storage = new MMKV({ id: 'homeplanner' });

// Adapter so Zustand's persist middleware can use MMKV as its backend.
export const zustandMMKVStorage = {
  getItem: (name) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  setItem: (name, value) => {
    storage.set(name, value);
  },
  removeItem: (name) => {
    storage.delete(name);
  },
};

// Wipe everything (used by logout / delete-account flows).
export function clearAllStorage() {
  storage.clearAll();
}
