import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const key = "plan-checkin.device-id.v1";
let inFlight: Promise<string> | null = null;

export async function deviceId(): Promise<string> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const existing = await SecureStore.getItemAsync(key);
    if (existing) return existing;
    const created = Crypto.randomUUID();
    await SecureStore.setItemAsync(key, created, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    return created;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
