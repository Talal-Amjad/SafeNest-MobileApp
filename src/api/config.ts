import Constants from "expo-constants";

/**
 * Base URL of the SafeNest API (without /api/v1).
 *
 * EXPO_PUBLIC_API_URL wins (local stacks: http://192.168.1.6:8000), then
 * app.json's expo.extra.apiUrl. Plain http is accepted only in development
 * builds: credentials must never cross a network unencrypted in a release.
 */
export function resolveApiUrl(
  env: string | undefined,
  configured: string | undefined,
  isDev: boolean,
): string {
  const raw = (env || configured || "https://api.safenest.app").trim().replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid SafeNest API URL: ${raw}`);
  }
  if (url.protocol !== "https:" && !(isDev && url.protocol === "http:")) {
    throw new Error(`The SafeNest API must use https in release builds: ${raw}`);
  }
  return raw;
}

export const API_URL = resolveApiUrl(
  process.env.EXPO_PUBLIC_API_URL,
  Constants.expoConfig?.extra?.apiUrl as string | undefined,
  __DEV__,
);
