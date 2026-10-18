/**
 * Friendly aliases over the OpenAPI types generated from the SafeNest API
 * (schema.d.ts is copied from apps/web/src/lib/api in the SafeNest repo;
 * refresh it whenever the backend schemas change).
 */
import type { components } from "./schema";

type S = components["schemas"];

export type Me = S["MeOut"];
export type Child = S["ChildOut"];
export type Device = S["DeviceOut"];
export type DevicePlatform = S["DevicePlatform"];
export type Enrollment = S["EnrollmentOut"];
export type EnrollmentCreated = S["EnrollmentCreatedOut"];
export type Rule = S["RuleOut"];
export type RuleInput = S["RuleIn"];
export type ActivityEvent = S["ActivityEventOut"];
export type ActivityPage = S["ActivityPage"];

export type EnrollmentCompleteIn = S["EnrollmentCompleteIn"];
export type EnrollmentCompleteOut = S["EnrollmentCompleteOut"];
export type Policy = S["PolicyOut"];
export type HeartbeatIn = S["HeartbeatIn"];
export type HeartbeatOut = S["HeartbeatOut"];
export type EventIn = S["EventIn"];
export type EventsOut = S["EventsOut"];

export type RuleAction = Rule["action"];
export type RuleKind = Rule["kind"];
