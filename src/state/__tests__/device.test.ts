import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockPolicy = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockHeartbeat = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockRemove = jest.fn<(k: string) => Promise<void>>(async () => undefined);
const mockEvents = jest.fn<(...a: unknown[]) => Promise<unknown>>(async () => ({ accepted: 1 }));
const mockVpn = { running: false, start: jest.fn(async (_rules: unknown) => undefined), blocked: [] as unknown[] };

jest.mock("@/lib/filter", () => ({
  domainRules: jest.requireActual<typeof import("@/lib/filter")>("@/lib/filter").domainRules,
  filter: {
    isSupported: () => true,
    isRunning: () => mockVpn.running,
    start: (...a: unknown[]) => (mockVpn.start as (...x: unknown[]) => Promise<void>)(...a),
    drainBlocked: () => mockVpn.blocked.splice(0),
  },
}));

jest.mock("@/api", () => {
  const actual = jest.requireActual<typeof import("@/api/client")>("@/api/client");
  return { ...actual, deviceApi: {
      policy: (...a: unknown[]) => mockPolicy(...a),
      heartbeat: (...a: unknown[]) => mockHeartbeat(...a),
      events: (...a: unknown[]) => mockEvents(...a),
    } };
});
jest.mock("@/storage/secure", () => ({
  KEYS: { device: "safenest.device", installId: "safenest.install_id" },
  readJSON: jest.fn(async () => null),
  writeJSON: jest.fn(async () => undefined),
  remove: (k: string) => mockRemove(k),
}));

// Imported after the mocks are registered.
// eslint-disable-next-line import/first
import { ApiError } from "@/api/client";
// eslint-disable-next-line import/first
import { checkIn, FILTER_OFF } from "../device";

const state = { deviceId: "d1", credential: "d1.secret", childId: "c1", childName: "Leo", linkedAt: "" };

describe("checkIn", () => {
  beforeEach(() => {
    mockPolicy.mockReset();
    mockHeartbeat.mockReset();
    mockRemove.mockClear();
    mockEvents.mockClear();
    mockVpn.running = false;
    mockVpn.blocked = [];
  });

  it("never claims rules were applied while the filter is off", async () => {
    mockPolicy.mockResolvedValue({ version: 4, rules: [] });
    mockHeartbeat.mockResolvedValue({ policy_version: 4 });

    const res = await checkIn(state);

    expect(res.kind).toBe("ok");
    expect(mockHeartbeat).toHaveBeenCalledWith("d1", "d1.secret", expect.objectContaining({
      applied_policy_version: null,
      policy_error: FILTER_OFF,
    }));
    expect(mockEvents).not.toHaveBeenCalled();
  });

  it("reports the enforced version and blocked lookups while filtering", async () => {
    mockVpn.running = true;
    mockVpn.blocked = [{ domain: "tiktok.com", ruleId: "r1", at: Date.parse("2026-10-18T12:00:00Z") }];
    mockPolicy.mockResolvedValue({ version: 5, rules: [{ id: "r1", kind: "domain", value: "tiktok.com", action: "block" }] });
    mockHeartbeat.mockResolvedValue({ policy_version: 5 });

    expect((await checkIn(state)).kind).toBe("ok");
    expect(mockVpn.start).toHaveBeenCalledWith([{ id: "r1", value: "tiktok.com", action: "block" }]);
    const [, , events] = mockEvents.mock.calls[0] as [string, string, { domain: string; rule_id: string; occurred_at: string }[]];
    expect(events[0]).toMatchObject({ domain: "tiktok.com", rule_id: "r1", occurred_at: "2026-10-18T12:00:00.000Z" });
    expect(mockHeartbeat).toHaveBeenCalledWith("d1", "d1.secret", expect.objectContaining({ applied_policy_version: 5, policy_error: null }));
  });

  it("forgets the credential when the parent removed the device", async () => {
    mockPolicy.mockRejectedValue(new ApiError(401, { code: "unauthorized", message: "removed" }));
    expect((await checkIn(state)).kind).toBe("removed");
    expect(mockRemove).toHaveBeenCalledWith("safenest.device");
  });

  it("keeps the link on network or server errors", async () => {
    mockPolicy.mockRejectedValue(new ApiError(503, { code: "server_error", message: "down" }));
    expect((await checkIn(state)).kind).toBe("error");
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
