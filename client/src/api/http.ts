import { z } from "zod";
import type { ConsumeRequest } from "@/types";
import type { ApiClient, ApiConfig } from "./client";
import { ApiError, NetworkError } from "./errors";

// Wire schemas follow the backend's controllers and selected repository fields.
const accountSchema = z.object({
  id: z.string(),
  name: z.string(),
  planId: z.string(),
  createdAt: z.string(),
});
const userSchema = accountSchema.extend({ accountId: z.string() });
const planSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    planType: z.enum(["account", "user"]),
    monthlyAllowance: z.number(),
    maxUnitsPerRequest: z.number(),
    ownerAccountId: z.string().nullable(),
    createdAt: z.string(),
  })
  .transform((plan) => ({ ...plan, isPublic: plan.ownerAccountId === null }));
const currentPlanSchema = z.object({
  id: z.string(),
  name: z.string(),
  monthlyAllowance: z.number(),
  maxUnitsPerRequest: z.number(),
});
const usageSchema = z.object({
  accountId: z.string(),
  userId: z.string().optional(),
  usedUnits: z.number(),
  remainingUnits: z.number().nullable(),
  currentPlan: currentPlanSchema,
  periodStart: z.string(),
});
const recordSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  userId: z.string(),
  requestId: z.string(),
  requestedUnits: z.number(),
  status: z.enum(["accepted", "rejected"]),
  rejectionReason: z
    .enum([
      "account_request_limit",
      "account_monthly_limit",
      "user_request_limit",
      "user_monthly_limit",
    ])
    .nullable(),
  createdAt: z.string(),
});
const decisionSchema = recordSchema.extend({ duplicate: z.boolean() });
const recordsSchema = z.object({
  records: recordSchema.array(),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
export type BackendUsage = z.infer<typeof usageSchema>;
export type BackendRecord = z.infer<typeof recordSchema>;
export type ConsumptionDecision = z.infer<typeof decisionSchema>;
export type BackendRecords = z.infer<typeof recordsSchema>;

const errorSchema = z.object({ error: z.string(), errors: z.unknown().optional() });

export type ManagementApi = Pick<
  ApiClient,
  | "listPublicPlans"
  | "createAccount"
  | "updateAccountPlan"
  | "listMyPlans"
  | "createPlan"
  | "updatePlan"
  | "listUsers"
  | "createUser"
  | "getUser"
  | "updateUserPlan"
> & {
  getAccountPlan(): Promise<z.infer<typeof currentPlanSchema>>;
  getAccountUsage(month?: string): Promise<BackendUsage>;
  getUserUsage(userId: string, month?: string): Promise<BackendUsage>;
  consume(input: ConsumeRequest): Promise<ConsumptionDecision>;
  listRecords(page: number, limit: number): Promise<BackendRecords>;
  getRecord(id: string): Promise<BackendRecord>;
};

/** Base URL is an origin/base path, without /api. Empty means same origin. */
export function normalizeBaseUrl(value: string): string {
  const base = value.trim().replace(/\/+$/, "");
  if (!base) return "";
  if (base.startsWith("/") && !base.startsWith("//") && !/[?#\\]/.test(base)) return base;
  try {
    const url = new URL(base);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
    return url.toString().replace(/\/+$/, "");
  } catch {
    throw new Error(
      "Use an HTTP(S) backend URL or a same-origin path, without credentials, query, or fragment.",
    );
  }
}

/** Configuration is captured per session so in-flight requests cannot change identity. */
export function createHttpApi(
  config: ApiConfig,
  fetcher: typeof fetch = globalThis.fetch,
  connectionSignal?: AbortSignal,
): ManagementApi {
  async function request<T>(
    path: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    method = "GET",
    body?: unknown,
    auth = true,
  ): Promise<T> {
    const headers = new Headers({ Accept: "application/json" });
    if (body !== undefined) headers.set("Content-Type", "application/json");
    if (auth && config.apiKey) headers.set("x-api-key", config.apiKey);
    let response: Response;
    try {
      response = await fetcher(`${normalizeBaseUrl(config.baseUrl)}/api${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        credentials: "omit",
        redirect: "error",
        signal: connectionSignal
          ? AbortSignal.any([connectionSignal, AbortSignal.timeout(15_000)])
          : AbortSignal.timeout(15_000),
      });
    } catch {
      if (connectionSignal?.aborted) throw new DOMException("Connection changed", "AbortError");
      // Never echo request headers, keys, URLs, or arbitrary transport exceptions.
      throw new NetworkError(
        "Could not reach the backend. Check the backend URL, proxy, and server availability.",
      );
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }
    if (!response.ok) {
      const parsed = errorSchema.safeParse(payload);
      throw new ApiError(
        response.status,
        parsed.success
          ? parsed.data
          : { error: `Backend request failed (HTTP ${response.status})` },
      );
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) throw new Error("The backend returned an unexpected response format.");
    return parsed.data;
  }
  const filter = (planType?: string) =>
    planType ? `?planType=${encodeURIComponent(planType)}` : "";
  return {
    listPublicPlans: (type) =>
      request(`/plans${filter(type)}`, planSchema.array(), "GET", undefined, false),
    createAccount: async (input) => {
      const { apiKey, ...account } = await request(
        "/accounts",
        accountSchema.extend({ apiKey: z.string() }),
        "POST",
        input,
        false,
      );
      return { account, apiKey };
    },
    updateAccountPlan: (planId) => request("/accounts/me/plan", accountSchema, "PATCH", { planId }),
    // The backend returns public AND owned plans. Callers must not append public plans again.
    listMyPlans: (type) => request(`/plans/me${filter(type)}`, planSchema.array()),
    createPlan: (input) => request("/plans", planSchema, "POST", input),
    updatePlan: (id, input) =>
      request(`/plans/${encodeURIComponent(id)}`, planSchema, "PATCH", input),
    listUsers: () => request("/users", userSchema.array()),
    createUser: (input) => request("/users", userSchema, "POST", input),
    getUser: (id) => request(`/users/${encodeURIComponent(id)}`, userSchema),
    updateUserPlan: (id, planId) =>
      request(`/users/${encodeURIComponent(id)}/plan`, userSchema, "PATCH", { planId }),
    getAccountUsage: (month) =>
      request(`/usage/account${month ? `?month=${encodeURIComponent(month)}` : ""}`, usageSchema),
    getUserUsage: (id, month) =>
      request(
        `/usage/users/${encodeURIComponent(id)}${month ? `?month=${encodeURIComponent(month)}` : ""}`,
        usageSchema,
      ),
    consume: (input) => request("/usage/consume", decisionSchema, "POST", input),
    listRecords: (page, limit) =>
      request(`/usage/records?page=${page}&limit=${limit}`, recordsSchema),
    getRecord: (id) => request(`/usage/records/${encodeURIComponent(id)}`, recordSchema),
    getAccountPlan: async () =>
      (await request("/usage/account", z.object({ currentPlan: currentPlanSchema }))).currentPlan,
  };
}
