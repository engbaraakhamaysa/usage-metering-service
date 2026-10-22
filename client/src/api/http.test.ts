import { describe, expect, it, vi } from "vitest";
import { ApiError, NetworkError, describeError } from "./errors";
import { createHttpApi, normalizeBaseUrl } from "./http";

const plan = {
  id: "plan",
  name: "Starter",
  planType: "account",
  monthlyAllowance: 1000,
  maxUnitsPerRequest: 100,
  ownerAccountId: null,
  createdAt: "2026-10-22T00:00:00Z",
};
const account = { id: "account", name: "Acme", planId: "plan", createdAt: plan.createdAt };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function setup(baseUrl = "", apiKey: string | null = "test-key") {
  const fetcher = vi.fn<typeof fetch>();
  return { fetcher, api: createHttpApi({ baseUrl, apiKey }, fetcher) };
}

describe("HTTP management client", () => {
  it("maps public plans and omits authentication on public requests", async () => {
    const { api, fetcher } = setup("http://localhost:3000/");
    fetcher.mockResolvedValue(json([plan]));
    expect(await api.listPublicPlans("account")).toEqual([{ ...plan, isPublic: true }]);
    const [url, options] = fetcher.mock.calls[0]!;
    expect(url).toBe("http://localhost:3000/api/plans?planType=account");
    expect(new Headers(options?.headers).has("x-api-key")).toBe(false);
    expect(options).toMatchObject({ credentials: "omit", redirect: "error" });
  });
  it("adapts the flat account creation response without changing the request fields", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValue(json({ ...account, apiKey: "test-key" }, 201));
    expect(await api.createAccount({ name: "Acme", planId: "plan" })).toEqual({
      account,
      apiKey: "test-key",
    });
    expect(fetcher.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ name: "Acme", planId: "plan" }),
    });
  });
  it("uses the authenticated backend endpoints and maps owned visibility", async () => {
    const { api, fetcher } = setup("/backend");
    const owned = { ...plan, ownerAccountId: "account" };
    fetcher.mockResolvedValueOnce(json([plan, owned]));
    const plans = await api.listMyPlans("account");
    expect(plans.map((p) => p.isPublic)).toEqual([true, false]);
    expect(fetcher.mock.calls[0]?.[0]).toBe("/backend/api/plans/me?planType=account");
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("x-api-key")).toBe("test-key");
    fetcher.mockResolvedValueOnce(json(account));
    await api.updateAccountPlan("other");
    expect(fetcher.mock.calls[1]?.slice(0, 1)).toEqual(["/backend/api/accounts/me/plan"]);
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      method: "PATCH",
      body: '{"planId":"other"}',
    });
    fetcher.mockResolvedValueOnce(json(owned, 201));
    await api.createPlan({
      name: "Private",
      planType: "user",
      monthlyAllowance: 100,
      maxUnitsPerRequest: 10,
    });
    expect(fetcher.mock.calls[2]?.[0]).toBe("/backend/api/plans");
    fetcher.mockResolvedValueOnce(json(owned));
    await api.updatePlan("plan", { name: "Renamed" });
    expect(fetcher.mock.calls[3]?.[1]).toMatchObject({
      method: "PATCH",
      body: '{"name":"Renamed"}',
    });
  });
  it("supports user listing, creation, details, and plan changes", async () => {
    const { api, fetcher } = setup();
    const user = { ...account, accountId: "owner" };
    fetcher
      .mockResolvedValueOnce(json([user]))
      .mockResolvedValueOnce(json(user, 201))
      .mockResolvedValueOnce(json(user))
      .mockResolvedValueOnce(json(user));
    expect(await api.listUsers()).toEqual([user]);
    expect(await api.createUser({ name: "Acme", planId: "plan" })).toEqual(user);
    expect(await api.getUser("user/id")).toEqual(user);
    await api.updateUserPlan("user/id", "next");
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
      "/api/users",
      "/api/users",
      "/api/users/user%2Fid",
      "/api/users/user%2Fid/plan",
    ]);
    expect(fetcher.mock.calls[3]?.[1]).toMatchObject({
      method: "PATCH",
      body: '{"planId":"next"}',
    });
  });
  it.each([400, 401, 404, 409, 500])(
    "preserves HTTP %s and backend error details",
    async (status) => {
      const { api, fetcher } = setup();
      fetcher.mockResolvedValue(
        json(
          {
            error: "Validation failed",
            errors: [{ path: ["name"], message: "Account name is required" }],
          },
          status,
        ),
      );
      try {
        await api.listUsers();
        throw new Error("Expected rejection");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ status });
        expect(describeError(error).detail).toContain("name: Account name is required");
      }
    },
  );
  it("reports transport errors and malformed responses without mock fallback or sensitive exception text", async () => {
    const { api, fetcher } = setup();
    fetcher.mockRejectedValueOnce(new Error("sensitive transport detail"));
    await expect(api.listUsers()).rejects.toBeInstanceOf(NetworkError);
    fetcher.mockResolvedValueOnce(new Response("proxy error", { status: 502 }));
    await expect(api.listUsers()).rejects.toMatchObject({
      status: 502,
      message: "Backend request failed (HTTP 502)",
    });
    fetcher.mockResolvedValueOnce(json({ wrong: true }));
    await expect(api.listUsers()).rejects.toThrow("unexpected response format");
  });
  it("reads the account's current plan through the actual usage response", async () => {
    const { api, fetcher } = setup();
    fetcher.mockResolvedValue(
      json({
        accountId: "account",
        currentPlan: plan,
        usedUnits: 0,
        remainingUnits: 1000,
        periodStart: "2026-10-01",
      }),
    );
    expect(await api.getAccountPlan()).toMatchObject({ id: "plan", name: "Starter" });
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/usage/account");
  });
  it("validates backend URLs", () => {
    expect(normalizeBaseUrl(" https://example.com/backend/ ")).toBe("https://example.com/backend");
    for (const value of [
      "//example.com",
      "https://user:password@example.com",
      "javascript:alert(1)",
      "https://example.com?key=value",
    ])
      expect(() => normalizeBaseUrl(value)).toThrow();
  });
});
