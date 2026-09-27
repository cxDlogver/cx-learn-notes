import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";

const keyName = "plan-checkin:native-smoke:database-key";

export interface NativeSmokeResult {
  sqlCipher: boolean;
  keychain: boolean;
  apnsToken: "available" | "permission-required" | "unavailable";
  photoPermission: "granted" | "undetermined" | "denied";
}

async function getDatabaseKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(keyName);
  if (key) return key;
  key = Array.from(Crypto.getRandomBytes(32), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  await SecureStore.setItemAsync(keyName, key, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  return key;
}

/** Manual development-build smoke. It never asks for system permissions without a user action. */
export async function runNativeCapabilitySmoke(): Promise<NativeSmokeResult> {
  if (Platform.OS !== "ios") throw new Error("This smoke is scoped to iOS.");

  const key = await getDatabaseKey();
  const keychain = (await SecureStore.getItemAsync(keyName)) === key;
  const database = await SQLite.openDatabaseAsync("native-smoke.db");
  let sqlCipher: boolean;
  try {
    await database.execAsync(`PRAGMA key = '${key}';`);
    const cipher = await database.getFirstAsync<{ cipher_version: string }>(
      "PRAGMA cipher_version",
    );
    sqlCipher = Boolean(cipher?.cipher_version);
    if (sqlCipher) {
      await database.execAsync(
        "CREATE TABLE IF NOT EXISTS smoke (id INTEGER PRIMARY KEY);",
      );
    }
  } finally {
    await database.closeAsync();
  }

  const notificationPermission = await Notifications.getPermissionsAsync();
  let apnsToken: NativeSmokeResult["apnsToken"] = "permission-required";
  if (notificationPermission.granted) {
    try {
      const token = await Notifications.getDevicePushTokenAsync();
      apnsToken = token.data ? "available" : "unavailable";
    } catch {
      apnsToken = "unavailable";
    }
  }

  const photoPermission = await ImagePicker.getMediaLibraryPermissionsAsync();
  return {
    sqlCipher,
    keychain,
    apnsToken,
    photoPermission: photoPermission.granted
      ? "granted"
      : photoPermission.canAskAgain
        ? "undetermined"
        : "denied",
  };
}

export async function requestNativeSmokePermissions(): Promise<void> {
  if (Platform.OS !== "ios") return;
  await Notifications.requestPermissionsAsync();
  await ImagePicker.requestMediaLibraryPermissionsAsync();
}
