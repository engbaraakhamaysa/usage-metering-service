import { z } from "zod";
import type { ApiErrorBody } from "@/types";

/** Server responded with a non-2xx status and an { error } body. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;
  constructor(status: number, body: ApiErrorBody) {
    super(body.error);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

/** Request never got a response (offline, DNS, CORS, timeout...). */
export class NetworkError extends Error {
  constructor(message = "Network request failed") {
    super(message);
    this.name = "NetworkError";
  }
}

export function describeError(err: unknown): { title: string; detail: string } {
  if (err instanceof ApiError) {
    const titles: Record<number, string> = {
      400: "Validation error (HTTP 400)",
      401: "Unauthorized (HTTP 401)",
      403: "Forbidden (HTTP 403)",
      404: "Not found (HTTP 404)",
      409: "Conflict (HTTP 409)",
    };
    const issues = z
      .array(z.object({ path: z.array(z.union([z.string(), z.number()])), message: z.string() }))
      .safeParse(err.body.errors);
    const details = issues.success
      ? issues.data.map((issue) => `${issue.path.join(".") || "Request"}: ${issue.message}`)
      : [];
    return {
      title: titles[err.status] ?? `Server error (HTTP ${err.status})`,
      detail: [err.body.error, ...details].join(" · "),
    };
  }
  if (err instanceof NetworkError) return { title: "Network failure", detail: err.message };
  if (err instanceof Error) return { title: "Unexpected error", detail: err.message };
  return { title: "Unexpected error", detail: String(err) };
}
