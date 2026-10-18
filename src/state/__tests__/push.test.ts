import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockApi = {
  registerPushToken: jest.fn<(t: string, p: string) => Promise<void>>(async () => undefined),
  removePushToken: jest.fn<(t: string) => Promise<void>>(async () => undefined),
};
const mockStore = new Map<string, unknown>();
const mockPermission = { status: "granted" };

jest.mock("expo-constants", () => ({ expoConfig: { extra: { eas: { projectId: "proj-1" } } } }));
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3 },
  getPermissionsAsync: jest.fn(async () => ({ status: mockPermission.status })),
  requestPermissionsAsync: jest.fn(async () => ({ status: mockPermission.status })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: "ExponentPushToken[abc123abc123]" })),
}));
jest.mock("@/api", () => ({
  parentApi: {
    registerPushToken: (t: string, p: string) => mockApi.registerPushToken(t, p),
    removePushToken: (t: string) => mockApi.removePushToken(t),
  },
}));
jest.mock("@/storage/secure", () => ({
  KEYS: { pushToken: "safenest.push_token" },
  readJSON: async (k: string) => mockStore.get(k) ?? null,
  writeJSON: async (k: string, v: unknown) => void mockStore.set(k, v),
  remove: async (k: string) => void mockStore.delete(k),
}));

// eslint-disable-next-line import/first
import { disablePush, enablePush, routeForNotification } from "../push";

describe("push", () => {
  beforeEach(() => {
    mockApi.registerPushToken.mockClear();
    mockApi.removePushToken.mockClear();
    mockStore.clear();
    mockPermission.status = "granted";
  });

  it("registers the Expo token with SafeNest when allowed", async () => {
    expect(await enablePush()).toBe("enabled");
    expect(mockApi.registerPushToken).toHaveBeenCalledWith("ExponentPushToken[abc123abc123]", "ios");
    expect(mockStore.get("safenest.push_token")).toBe("ExponentPushToken[abc123abc123]");
  });

  it("does nothing when the parent declines notifications", async () => {
    mockPermission.status = "denied";
    expect(await enablePush()).toBe("denied");
    expect(mockApi.registerPushToken).not.toHaveBeenCalled();
  });

  it("removes this phone's token at sign-out", async () => {
    await enablePush();
    await disablePush();
    expect(mockApi.removePushToken).toHaveBeenCalledWith("ExponentPushToken[abc123abc123]");
    expect(mockStore.has("safenest.push_token")).toBe(false);
  });

  it("routes alert taps to the Activity tab", () => {
    expect(routeForNotification({ screen: "activity", event_id: "e1" })).toBe("/(parent)/activity");
    expect(routeForNotification({})).toBeNull();
    expect(routeForNotification(null)).toBeNull();
  });
});
