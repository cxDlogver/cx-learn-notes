import * as SecureStore from "expo-secure-store";
import type { RefreshTokenStore } from "../data/session";

const refreshKey = "plan-checkin.refresh-token.v1";

export const secureSessionStore: RefreshTokenStore = {
  read: () => SecureStore.getItemAsync(refreshKey),
  write: (value) =>
    SecureStore.setItemAsync(refreshKey, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  clear: () => SecureStore.deleteItemAsync(refreshKey),
};

export class MemorySessionStore implements RefreshTokenStore {
  private token: string | null = null;
  async read(): Promise<string | null> {
    return this.token;
  }
  async write(value: string): Promise<void> {
    this.token = value;
  }
  async clear(): Promise<void> {
    this.token = null;
  }
}
