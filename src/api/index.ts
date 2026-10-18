import { createClient } from "./client";
import { API_URL } from "./config";
import type {
  ActivityPage,
  Child,
  Device,
  Enrollment,
  EnrollmentCompleteIn,
  EnrollmentCompleteOut,
  EnrollmentCreated,
  EventIn,
  EventsOut,
  HeartbeatIn,
  HeartbeatOut,
  Me,
  Policy,
  Rule,
  RuleInput,
} from "./types";

export * from "./client";
export type * from "./types";

const request = createClient(API_URL);

/** Parent API: authenticated by the session cookie. */
export const parentApi = {
  login: (email: string, password: string) =>
    request<Me>("/auth/login", { method: "POST", body: { email, password } }),
  logout: () => request<unknown>("/auth/logout", { method: "POST" }),
  me: () => request<Me>("/auth/me"),

  children: () => request<Child[]>("/children"),
  devices: () => request<Device[]>("/devices"),
  revokeDevice: (id: string) => request<Device>(`/devices/${encodeURIComponent(id)}/revoke`, { method: "POST" }),

  rules: () => request<Rule[]>("/rules"),
  createRule: (input: RuleInput) => request<Rule>("/rules", { method: "POST", body: input }),
  deleteRule: (id: string) => request<void>(`/rules/${encodeURIComponent(id)}`, { method: "DELETE" }),

  activity: (cursor?: string, childId?: string) =>
    request<ActivityPage>("/activity-events", { query: { cursor, child_id: childId, limit: 30 } }),

  createEnrollment: (childId: string) =>
    request<EnrollmentCreated>("/device-enrollments", { method: "POST", body: { child_id: childId } }),
  enrollments: () => request<Enrollment[]>("/device-enrollments"),
  registerPushToken: (token: string, platform: "android" | "ios") =>
    request<void>("/push-tokens", { method: "PUT", body: { token, platform } }),
  removePushToken: (token: string) => request<void>("/push-tokens/remove", { method: "POST", body: { token } }),

  cancelEnrollment: (id: string) =>
    request<Enrollment>(`/device-enrollments/${encodeURIComponent(id)}`, { method: "DELETE" }),
};

/** Device API: authenticated by the per-device bearer credential. */
export const deviceApi = {
  completeEnrollment: (input: EnrollmentCompleteIn, idempotencyKey: string) =>
    request<EnrollmentCompleteOut>("/device-enrollments/complete", {
      method: "POST",
      body: input,
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  policy: (deviceId: string, credential: string) =>
    request<Policy>(`/devices/${encodeURIComponent(deviceId)}/policy`, { bearer: credential }),
  heartbeat: (deviceId: string, credential: string, body: HeartbeatIn) =>
    request<HeartbeatOut>(`/devices/${encodeURIComponent(deviceId)}/heartbeat`, {
      method: "POST",
      bearer: credential,
      body,
    }),
  events: (deviceId: string, credential: string, events: EventIn[]) =>
    request<EventsOut>(`/devices/${encodeURIComponent(deviceId)}/events`, {
      method: "POST",
      bearer: credential,
      body: { events },
    }),
};
