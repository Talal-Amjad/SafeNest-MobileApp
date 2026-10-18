import type { Child, Device, DevicePlatform } from "@/api/types";
import type { Tone } from "@/components/ui";

/** Wording matches the web dashboard so parents see one vocabulary. */

export const PLATFORM_LABEL: Record<DevicePlatform, string> = {
  chrome_extension: "Chrome extension",
  windows: "Windows PC",
  macos: "Mac",
  android: "Android phone",
  ios: "iPhone / iPad",
};

export function connectionBadge(d: Device): { label: string; tone: Tone } {
  switch (d.connection) {
    case "online":
      return { label: "Online", tone: "ok" };
    case "offline":
      return { label: "Offline", tone: "warn" };
    case "revoked":
      return { label: "Removed", tone: "neutral" };
    default:
      return { label: "Waiting for first check-in", tone: "neutral" };
  }
}

/** "Up to date" only when the device confirmed the latest rules, never because we sent them. */
export function policyBadge(d: Device): { label: string; tone: Tone } | null {
  if (d.status === "revoked") return null;
  if (d.policy_state === "current") return { label: "Rules up to date", tone: "brand" };
  if (d.policy_state === "stale") return { label: "Rules not yet updated", tone: "warn" };
  return { label: "Rules not confirmed yet", tone: "neutral" };
}

export function needsAttention(d: Device): boolean {
  return d.status === "active" && (d.connection === "offline" || d.policy_state === "stale");
}

export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "never";
  const s = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return h === 1 ? "1 hour ago" : `${h} hours ago`;
  const days = Math.round(h / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export type ChildSummary = { child: Child; devices: Device[]; attention: number };

/** Children in display order with their active devices (removed ones hidden). */
export function summarize(children: Child[], devices: Device[]): ChildSummary[] {
  return [...children]
    .sort((a, b) => a.display_name.localeCompare(b.display_name))
    .map((child) => {
      const own = devices
        .filter((d) => d.child_id === child.id && d.status === "active")
        .sort((a, b) => a.name.localeCompare(b.name));
      return { child, devices: own, attention: own.filter(needsAttention).length };
    });
}
