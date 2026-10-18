import * as SecureStore from "expo-secure-store";

/**
 * Small typed wrapper over expo-secure-store (iOS Keychain, Android
 * Keystore-backed storage). Used for the device credential and the chosen
 * role. Values are JSON; a corrupt value reads as missing.
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  // Readable after the first unlock, so background sync works after reboot.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

export async function readJSON<T>(key: string): Promise<T | null> {
  const raw = await SecureStore.getItemAsync(key, OPTIONS);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  await SecureStore.setItemAsync(key, JSON.stringify(value), OPTIONS);
}

export async function remove(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key, OPTIONS);
}

export const KEYS = {
  role: "safenest.role",
  device: "safenest.device",
  installId: "safenest.install_id",
  pushToken: "safenest.push_token",
} as const;

export type Role = "parent" | "child";

/** Linked-device state. The credential never leaves secure storage except in API calls. */
export type DeviceState = {
  deviceId: string;
  credential: string;
  childId: string;
  childName: string;
  linkedAt: string;
};
