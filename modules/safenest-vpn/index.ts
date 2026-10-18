import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

/**
 * Android website filtering through a local VPN that only carries DNS.
 *
 * The native module exists in Android development/release builds only; in
 * Expo Go, on iOS and on the web it is absent, and `isSupported()` is false.
 */
type BlockedLookup = { domain: string; ruleId: string; at: number };

type NativeVpn = {
  /** True when Android already granted VPN consent to this app. */
  isPrepared(): boolean;
  /** Shows the system consent dialog; resolves to whether it was granted. */
  prepare(): Promise<boolean>;
  /** Starts (or updates) filtering with rules as JSON [{id, value, action}]. */
  start(rulesJson: string, upstreams: string[]): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  /** Blocked lookups since the last call (for reporting to the parent). */
  drainBlocked(): BlockedLookup[];
};

const native = Platform.OS === "android" ? requireOptionalNativeModule<NativeVpn>("SafeNestVpn") : null;

export const vpn = {
  isSupported: () => native !== null,
  isPrepared: () => native?.isPrepared() ?? false,
  prepare: async () => (native ? native.prepare() : false),
  start: async (rules: { id: string; value: string; action: string }[], upstreams = ["1.1.1.1", "9.9.9.9"]) => {
    if (!native) throw new Error("Website filtering isn't available in this build.");
    await native.start(JSON.stringify(rules), upstreams);
  },
  stop: async () => native?.stop(),
  isRunning: () => native?.isRunning() ?? false,
  drainBlocked: (): BlockedLookup[] => native?.drainBlocked() ?? [],
};

export type { BlockedLookup };
