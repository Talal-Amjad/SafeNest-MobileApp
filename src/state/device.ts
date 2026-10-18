import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { deviceApi, isUnauthorized, type Policy } from "@/api";
import { KEYS, readJSON, remove, writeJSON, type DeviceState } from "@/storage/secure";

/**
 * Child-device lifecycle: link with a one-time code, check in, notice when a
 * parent removes the device.
 *
 * Phones don't enforce rules yet (tasks 8 and 9), so check-ins never claim a
 * policy was applied: the dashboard must not show "Rules up to date" for a
 * phone that isn't blocking anything. The reason goes in policy_error.
 */
export const ENFORCEMENT_UNAVAILABLE = "Website blocking isn't available in the SafeNest phone app yet.";

export const clientVersion = () => Constants.expoConfig?.version ?? "0.0.0";

export function platform(): "android" | "ios" {
  return Platform.OS === "ios" ? "ios" : "android";
}

export function defaultDeviceName(): string {
  return Device.deviceName || Device.modelName || (platform() === "ios" ? "iPhone" : "Android phone");
}

/** Stable per install; doubles as the enrollment Idempotency-Key so a retried link is safe. */
async function installId(): Promise<string> {
  const existing = await readJSON<string>(KEYS.installId);
  if (existing) return existing;
  const id = Crypto.randomUUID();
  await writeJSON(KEYS.installId, id);
  return id;
}

export const loadDevice = () => readJSON<DeviceState>(KEYS.device);

export async function linkDevice(code: string, deviceName: string): Promise<DeviceState> {
  const res = await deviceApi.completeEnrollment(
    { code, device_name: deviceName.trim() || defaultDeviceName(), platform: platform(), client_version: clientVersion() },
    await installId(),
  );
  const state: DeviceState = {
    deviceId: res.device_id,
    credential: res.credential,
    childId: res.child_id,
    childName: res.child_name,
    linkedAt: new Date().toISOString(),
  };
  await writeJSON(KEYS.device, state);
  return state;
}

export async function forgetDevice(): Promise<void> {
  await remove(KEYS.device);
}

export type CheckIn =
  | { kind: "ok"; policy: Policy; at: string }
  | { kind: "removed" }
  | { kind: "error"; error: unknown };

/** Fetch the current rules and send a heartbeat. A 401 means the parent removed this device. */
export async function checkIn(state: DeviceState): Promise<CheckIn> {
  try {
    const policy = await deviceApi.policy(state.deviceId, state.credential);
    await deviceApi.heartbeat(state.deviceId, state.credential, {
      client_version: clientVersion(),
      applied_policy_version: null,
      policy_error: ENFORCEMENT_UNAVAILABLE,
    });
    return { kind: "ok", policy, at: new Date().toISOString() };
  } catch (error) {
    if (isUnauthorized(error)) {
      await forgetDevice();
      return { kind: "removed" };
    }
    return { kind: "error", error };
  }
}
