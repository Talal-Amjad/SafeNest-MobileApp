import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { parentApi } from "@/api";
import { KEYS, readJSON, remove, writeJSON } from "@/storage/secure";

/**
 * Blocked-site alerts as push notifications on the parent's phone.
 *
 * The server sends a push alongside each alert email (same dedupe and
 * hourly cap) to every token registered for the account. Tokens come from
 * Expo's push service, which needs the EAS project ID, so push works in
 * EAS builds; in a plain local run it reports "unavailable".
 */
export type PushStatus = "enabled" | "denied" | "unavailable";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function enablePush(): Promise<PushStatus> {
  const id = projectId();
  if (Platform.OS === "web" || !id) return "unavailable";

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("alerts", {
      name: "Blocked-site alerts",
      // eslint-disable-next-line import/namespace -- re-exported enum the rule can't resolve (typechecks fine)
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== "granted") return "denied";

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  await parentApi.registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
  await writeJSON(KEYS.pushToken, token);
  return "enabled";
}

/** Called at sign-out so this phone stops receiving the account's alerts. */
export async function disablePush(): Promise<void> {
  const token = await readJSON<string>(KEYS.pushToken);
  if (!token) return;
  await parentApi.removePushToken(token).catch(() => undefined);
  await remove(KEYS.pushToken);
}

/** Where a tapped notification should take the parent. */
export function routeForNotification(data: unknown): "/(parent)/activity" | null {
  return typeof data === "object" && data !== null && (data as { screen?: string }).screen === "activity"
    ? "/(parent)/activity"
    : null;
}
