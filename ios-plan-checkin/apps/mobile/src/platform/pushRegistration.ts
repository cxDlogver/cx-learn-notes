import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import type { AppRepository } from "../data/repository";
import type { SessionManager } from "../data/session";
import { deviceId } from "./deviceId";

/** Register the native APNs token only after the user has enabled iOS notifications. */
export async function syncPushRegistration(
  repository: AppRepository,
  session: SessionManager,
): Promise<void> {
  if (Platform.OS !== "ios" || session.getSnapshot().phase !== "authenticated")
    return;
  const permissions = await Notifications.getPermissionsAsync();
  const id = await deviceId();
  const native = permissions.granted
    ? await Notifications.getDevicePushTokenAsync()
    : null;
  if (session.getSnapshot().phase !== "authenticated") return;
  const token = native && typeof native.data === "string" ? native.data : null;
  await repository.registerPushToken({
    deviceId: id,
    platform: "ios",
    enabled: Boolean(token),
    token,
  });
}
