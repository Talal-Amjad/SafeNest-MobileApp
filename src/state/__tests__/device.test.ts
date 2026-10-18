import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockPolicy = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockHeartbeat = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const mockRemove = jest.fn<(k: string) => Promise<void>>(async () => undefined);

jest.mock("@/api", () => {
  const actual = jest.requireActual<typeof import("@/api/client")>("@/api/client");
  return { ...actual, deviceApi: { policy: (...a: unknown[]) => mockPolicy(...a), heartbeat: (...a: unknown[]) => mockHeartbeat(...a) } };
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
import { checkIn, ENFORCEMENT_UNAVAILABLE } from "../device";

const state = { deviceId: "d1", credential: "d1.secret", childId: "c1", childName: "Leo", linkedAt: "" };

describe("checkIn", () => {
  beforeEach(() => {
    mockPolicy.mockReset();
    mockHeartbeat.mockReset();
    mockRemove.mockClear();
  });

  it("never claims rules were applied while phones can't enforce them", async () => {
    mockPolicy.mockResolvedValue({ version: 4, rules: [] });
    mockHeartbeat.mockResolvedValue({ policy_version: 4 });

    const res = await checkIn(state);

    expect(res.kind).toBe("ok");
    expect(mockHeartbeat).toHaveBeenCalledWith("d1", "d1.secret", expect.objectContaining({
      applied_policy_version: null,
      policy_error: ENFORCEMENT_UNAVAILABLE,
    }));
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
