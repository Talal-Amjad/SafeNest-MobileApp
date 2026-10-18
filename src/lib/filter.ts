import { Platform } from "react-native";
import type { Policy } from "@/api/types";
import { screenTime } from "../../modules/safenest-screentime";
import { vpn, type BlockedLookup } from "../../modules/safenest-vpn";
import { compile, decide } from "./policy";

/**
 * One interface over the platform website filters:
 *  - Android: local DNS-only VPN (modules/safenest-vpn);
 *  - iOS: Screen Time ManagedSettings (modules/safenest-screentime), only in
 *    builds with Apple's Family Controls entitlement.
 * Where neither exists (Expo Go, web, iOS without the entitlement),
 * isSupported() is false and nothing claims to enforce.
 */
export type DomainRule = { id: string; value: string; action: string };

export function domainRules(policy: Policy): DomainRule[] {
  return policy.rules.filter((r) => r.kind === "domain").map((r) => ({ id: r.id, value: r.value, action: r.action }));
}

/**
 * Screen Time can only block domains (with their subdomains). A blocked
 * domain is sent unless an allow rule at the same level overrides it;
 * allow rules nested inside a blocked domain can't be expressed on iOS.
 */
export function blockedDomainsForScreenTime(rules: DomainRule[]): string[] {
  const policy = compile(rules.map((r) => ({ ...r, kind: "domain" })) as Policy["rules"]);
  return [...policy.keys()].filter((d) => decide(policy, d).action === "block").sort();
}

export const filter = {
  isSupported: () => (Platform.OS === "ios" ? screenTime.isSupported() : vpn.isSupported()),
  isRunning: () => (Platform.OS === "ios" ? screenTime.isActive() : vpn.isRunning()),
  /** Asks the OS for permission (VPN consent on Android, Screen Time approval on iOS). */
  prepare: async () => (Platform.OS === "ios" ? screenTime.requestAuthorization() : vpn.prepare()),
  start: async (rules: DomainRule[]) => {
    if (Platform.OS === "ios") screenTime.apply(blockedDomainsForScreenTime(rules));
    else await vpn.start(rules);
  },
  stop: async () => {
    if (Platform.OS === "ios") screenTime.clear();
    else await vpn.stop();
  },
  /** iOS doesn't report individual blocked visits, so this is Android-only. */
  drainBlocked: (): BlockedLookup[] => (Platform.OS === "ios" ? [] : vpn.drainBlocked()),
};
