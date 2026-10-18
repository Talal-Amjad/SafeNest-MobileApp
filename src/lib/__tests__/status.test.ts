import { describe, expect, it } from "@jest/globals";
import type { Child, Device } from "@/api/types";
import { connectionBadge, needsAttention, policyBadge, summarize, timeAgo } from "../status";

function device(over: Partial<Device>): Device {
  return {
    id: "d1",
    child_id: "c1",
    name: "Tablet",
    platform: "android",
    status: "active",
    connection: "online",
    policy_state: "current",
    applied_policy_version: 3,
    current_policy_version: 3,
    client_version: "0.1.0",
    created_at: "2026-10-01T00:00:00Z",
    last_policy_sync_at: null,
    last_seen_at: "2026-10-18T10:00:00Z",
    revoked_at: null,
    ...over,
  } as Device;
}

function child(id: string, name: string): Child {
  return { id, display_name: name, avatar_color: "teal", birth_year: null, created_at: "2026-10-01T00:00:00Z" } as Child;
}

describe("device status", () => {
  it("says up to date only when the device confirmed the latest rules", () => {
    expect(policyBadge(device({}))?.label).toBe("Rules up to date");
    expect(policyBadge(device({ policy_state: "stale" }))).toEqual({ label: "Rules not yet updated", tone: "warn" });
    expect(policyBadge(device({ policy_state: "unknown" }))?.label).toBe("Rules not confirmed yet");
    expect(policyBadge(device({ status: "revoked" }))).toBeNull();
  });

  it("labels connection states", () => {
    expect(connectionBadge(device({ connection: "offline" }))).toEqual({ label: "Offline", tone: "warn" });
    expect(connectionBadge(device({ connection: "never_seen" })).label).toBe("Waiting for first check-in");
  });

  it("flags offline or stale active devices", () => {
    expect(needsAttention(device({ connection: "offline" }))).toBe(true);
    expect(needsAttention(device({ policy_state: "stale" }))).toBe(true);
    expect(needsAttention(device({}))).toBe(false);
    expect(needsAttention(device({ status: "revoked", connection: "offline" }))).toBe(false);
  });
});

describe("summarize", () => {
  it("groups active devices under each child, sorted, and counts problems", () => {
    const out = summarize(
      [child("c2", "Leo"), child("c1", "Ava")],
      [
        device({ id: "a", child_id: "c1", name: "Phone", connection: "offline" }),
        device({ id: "b", child_id: "c1", name: "Laptop" }),
        device({ id: "c", child_id: "c2", status: "revoked" }),
      ],
    );
    expect(out.map((s) => s.child.display_name)).toEqual(["Ava", "Leo"]);
    expect(out[0].devices.map((d) => d.name)).toEqual(["Laptop", "Phone"]);
    expect(out[0].attention).toBe(1);
    expect(out[1].devices).toHaveLength(0);
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  it("describes elapsed time", () => {
    expect(timeAgo(null, now)).toBe("never");
    expect(timeAgo("2026-10-18T11:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-10-18T11:45:00Z", now)).toBe("15 min ago");
    expect(timeAgo("2026-10-18T09:00:00Z", now)).toBe("3 hours ago");
    expect(timeAgo("2026-10-17T10:00:00Z", now)).toBe("yesterday");
  });
});
