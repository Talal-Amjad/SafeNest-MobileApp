/**
 * Typed fetch wrapper for the SafeNest API.
 *
 * Parent requests rely on the session cookie, which the OS networking stack
 * stores and sends (NSHTTPCookieStorage on iOS, the OkHttp cookie jar on
 * Android). Device requests pass a bearer credential instead.
 */

export type ApiErrorBody = {
  error: { code: string; message: string; request_id?: string | null; details?: unknown };
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId?: string | null;
  readonly details?: unknown;

  constructor(status: number, body: ApiErrorBody["error"]) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.requestId = body.request_id;
    this.details = body.details;
  }
}

/** The request never got an HTTP response (offline, DNS, timeout). */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Can't reach SafeNest. Check your connection and try again.");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Device credential ("<device_id>.<secret>"); omit for parent requests. */
  bearer?: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | undefined>;
  timeoutMs?: number;
};

export type Fetch = (input: string, init?: RequestInit) => Promise<Response>;

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as ApiErrorBody).error?.code === "string"
  );
}

export function createClient(baseUrl: string, fetchImpl: Fetch = fetch) {
  return async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const { method = "GET", body, bearer, headers, query, timeoutMs = 20_000 } = opts;
    const qs = query
      ? Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";
    const url = `${baseUrl}/api/v1${path}${qs ? `?${qs}` : ""}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method,
        credentials: bearer ? "omit" : "include",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
          ...headers,
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      throw new NetworkError(err);
    } finally {
      clearTimeout(timer);
    }

    const payload: unknown =
      res.status === 204 || res.status === 304 ? undefined : await res.json().catch(() => undefined);
    if (res.ok || res.status === 304) return payload as T;
    if (isErrorBody(payload)) throw new ApiError(res.status, payload.error);
    throw new ApiError(res.status, {
      code: res.status >= 500 ? "server_error" : "http_error",
      message:
        res.status >= 500
          ? "SafeNest is having trouble right now. Please try again in a moment."
          : `Request failed (${res.status}).`,
    });
  };
}

/** A message a parent can act on, for any thrown value. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) {
    if (error.code === "validation_error") return "Please check what you entered and try again.";
    return error.message;
  }
  if (error instanceof NetworkError) return error.message;
  return fallback;
}

export const isUnauthorized = (e: unknown) => e instanceof ApiError && e.status === 401;
