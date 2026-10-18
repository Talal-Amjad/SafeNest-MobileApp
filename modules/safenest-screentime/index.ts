import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

/**
 * iOS website filtering with Apple Screen Time. The native module is only
 * linked into builds that enable the Family Controls entitlement (see
 * app.plugin.js); elsewhere it is absent and `isSupported()` is false.
 */
type NativeScreenTime = {
  isAuthorized(): boolean;
  requestAuthorization(): Promise<boolean>;
  apply(blockedDomains: string[]): void;
  clear(): void;
  isActive(): boolean;
};

// Local modules are linked into every iOS build; only use this one when the
// build carries the entitlement (the config plugin sets extra.familyControls).
const enabled = Platform.OS === "ios" && Constants.expoConfig?.extra?.familyControls === true;
const native = enabled ? requireOptionalNativeModule<NativeScreenTime>("SafeNestScreenTime") : null;

export const screenTime = {
  isSupported: () => native !== null,
  isAuthorized: () => native?.isAuthorized() ?? false,
  requestAuthorization: async () => (native ? native.requestAuthorization() : false),
  apply: (blockedDomains: string[]) => native?.apply(blockedDomains),
  clear: () => native?.clear(),
  isActive: () => native?.isActive() ?? false,
};
