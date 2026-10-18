import * as Crypto from "expo-crypto";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { deviceApi, isUnauthorized, type Policy } from "@/api";
import { KEYS, readJSON, remove, writeJSON, type DeviceState } from "@/storage/secure";
import { domainRules, filter } from "@/lib/filter";

/**
 * Child-device lifecycle: link with a one-time code, check in, notice when a
 * parent removes the device.
 *
 * Check-ins claim a policy version only while the platform filter runs
 * (src/lib/filter.ts). Otherwise (filter off, unsupported build) the dashboard must not show "Rules up
 * to date", so applied_policy_version stays null and policy_error says why.
 */
export const ENFORCEMENT_UNAVAILABLE = "Website blocking isn't available on this phone yet.";

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

export const FILTER_OFF = "Website blocking is turned off on this phone.";

/**
 * Fetch the current rules, refresh the Android filter if it runs, report
 * blocked lookups and send a heartbeat. The heartbeat claims a policy
 * version only while the filter is actually enforcing it. A 401 means the
 * parent removed this device.
 */
export async function checkIn(state: DeviceState): Promise<CheckIn> {
  try {
    const policy = await deviceApi.policy(state.deviceId, state.credential);
    const enforcing = filter.isRunning();
    if (enforcing) await filter.start(domainRules(policy));

    const blocked = filter.drainBlocked();
    if (blocked.length > 0) {
      await deviceApi.events(
        state.deviceId,
        state.credential,
        blocked.slice(0, 100).map((b) => ({
          event_id: Crypto.randomUUID(),
          type: "navigation_blocked" as const,
          domain: b.domain,
          rule_id: b.ruleId || null,
          occurred_at: new Date(b.at).toISOString(),
        })),
      );
    }

    await deviceApi.heartbeat(state.deviceId, state.credential, {
      client_version: clientVersion(),
      applied_policy_version: enforcing ? policy.version : null,
      policy_error: enforcing ? null : filter.isSupported() ? FILTER_OFF : ENFORCEMENT_UNAVAILABLE,
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
