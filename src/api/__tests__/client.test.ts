import { describe, expect, it, jest } from "@jest/globals";
import { ApiError, createClient, errorMessage, isUnauthorized, NetworkError, type Fetch } from "../client";
import { resolveApiUrl } from "../config";

function respond(status: number, body?: unknown) {
  return jest.fn<Fetch>(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("createClient", () => {
  it("sends JSON with cookies for parent requests", async () => {
    const fetchMock = respond(200, { ok: true });
    const request = createClient("https://api.example", fetchMock);
    await request("/auth/login", { method: "POST", body: { email: "a@b.c" } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example/api/v1/auth/login");
    expect(init?.credentials).toBe("include");
    expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect(init?.body).toBe('{"email":"a@b.c"}');
  });

  it("uses the bearer credential and no cookies for device requests", async () => {
    const fetchMock = respond(200, {});
    await createClient("https://api.example", fetchMock)("/devices/d1/policy", { bearer: "d1.secret" });
    const init = fetchMock.mock.calls[0][1];
    expect(init?.credentials).toBe("omit");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer d1.secret");
  });

  it("builds query strings and skips empty values", async () => {
    const fetchMock = respond(200, { items: [] });
    await createClient("https://api.example", fetchMock)("/activity-events", {
      query: { child_id: "c 1", cursor: undefined, limit: 30 },
    });
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.example/api/v1/activity-events?child_id=c%201&limit=30");
  });

  it("turns the error envelope into ApiError with the server's message", async () => {
    const request = createClient(
      "https://api.example",
      respond(400, { error: { code: "invalid_enrollment_code", message: "That code is invalid or has expired." } }),
    );
    const err = await request("/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("invalid_enrollment_code");
    expect(errorMessage(err)).toBe("That code is invalid or has expired.");
  });

  it("explains server errors and network failures", async () => {
    const server = await createClient("https://api.example", respond(503))("/x").catch((e: unknown) => e);
    expect(errorMessage(server)).toMatch(/having trouble/);

    const offline = jest.fn<Fetch>(async () => {
      throw new TypeError("Network request failed");
    });
    const net = await createClient("https://api.example", offline)("/x").catch((e: unknown) => e);
    expect(net).toBeInstanceOf(NetworkError);
    expect(errorMessage(net)).toMatch(/Can't reach SafeNest/);
  });

  it("recognises a rejected session", async () => {
    const err = await createClient(
      "https://api.example",
      respond(401, { error: { code: "unauthorized", message: "Sign in again." } }),
    )("/auth/me").catch((e: unknown) => e);
    expect(isUnauthorized(err)).toBe(true);
  });
});

describe("resolveApiUrl", () => {
  it("prefers the environment and trims trailing slashes", () => {
    expect(resolveApiUrl("http://192.168.1.6:8000/", "https://api.safenest.app", true)).toBe("http://192.168.1.6:8000");
    expect(resolveApiUrl(undefined, "https://api.safenest.app", false)).toBe("https://api.safenest.app");
  });

  it("refuses plain http in release builds", () => {
    expect(() => resolveApiUrl("http://192.168.1.6:8000", undefined, false)).toThrow(/https/);
    expect(() => resolveApiUrl("not a url", undefined, true)).toThrow(/Invalid/);
  });
});
