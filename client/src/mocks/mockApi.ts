import type { ApiClient, ApiConfig } from "@/api/client";
import { ApiError, NetworkError } from "@/api/errors";
import type {
  Account,
  ConsumeResult,
  Plan,
  PlanType,
  RejectionReason,
  UsageRecord,
  User,
} from "@/types";
import { currentMonth, generateUuid } from "@/utils";

interface StoredRecord extends UsageRecord {
  accountId: string;
  seq: number;
  result: ConsumeResult;
}

const plans: Plan[] = [
  {
    id: "plan_acc_starter",
    name: "Starter",
    planType: "account",
    monthlyAllowance: 1000,
    maxUnitsPerRequest: 100,
    ownerAccountId: null,
    isPublic: true,
  },
  {
    id: "plan_acc_business",
    name: "Business",
    planType: "account",
    monthlyAllowance: 10000,
    maxUnitsPerRequest: 500,
    ownerAccountId: null,
    isPublic: true,
  },
  {
    id: "plan_usr_basic",
    name: "Basic user",
    planType: "user",
    monthlyAllowance: 200,
    maxUnitsPerRequest: 50,
    ownerAccountId: null,
    isPublic: true,
  },
  {
    id: "plan_usr_pro",
    name: "Pro user",
    planType: "user",
    monthlyAllowance: 1000,
    maxUnitsPerRequest: 200,
    ownerAccountId: null,
    isPublic: true,
  },
];
const accounts: Account[] = [];
const keys = new Map<string, string>(); // apiKey -> accountId
const users: (User & { accountId: string })[] = [];
const records: StoredRecord[] = [];
let seq = 0;

export const mockControls = { simulateNetworkFailure: false };

const delay = () => new Promise((r) => setTimeout(r, 250 + Math.random() * 250));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const isPosInt = (n: unknown) => typeof n === "number" && Number.isInteger(n) && n > 0;

function validation(error: string, errors?: unknown): never {
  throw new ApiError(400, { error, errors });
}

function monthOf(iso: string) {
  return iso.slice(0, 7);
}

export function createMockApi(getConfig: () => ApiConfig): ApiClient {
  async function call<T>(auth: boolean, fn: (accountId: string) => T): Promise<T> {
    await delay();
    if (mockControls.simulateNetworkFailure)
      throw new NetworkError("Simulated network failure (demo)");
    let accountId = "";
    if (auth) {
      const key = getConfig().apiKey;
      const id = key ? keys.get(key) : undefined;
      if (!id) throw new ApiError(401, { error: "Unauthorized" });
      accountId = id;
    }
    return clone(fn(accountId));
  }

  const accessiblePlan = (accountId: string, planId: string, planType: PlanType) => {
    const p = plans.find((x) => x.id === planId && (x.isPublic || x.ownerAccountId === accountId));
    if (!p) throw new ApiError(404, { error: "Plan not found" });
    if (p.planType !== planType) validation(`Plan must be of type ${planType}`);
    return p;
  };
  const getAccount = (id: string) => accounts.find((a) => a.id === id)!;
  const findUser = (accountId: string, id: string) => {
    const u = users.find((x) => x.id === id && x.accountId === accountId);
    if (!u) throw new ApiError(404, { error: "User not found" });
    return u;
  };
  const used = (accountId: string, month: string, userId?: string) =>
    records
      .filter(
        (r) =>
          r.accountId === accountId &&
          r.status === "accepted" &&
          monthOf(r.createdAt) === month &&
          (!userId || r.userId === userId),
      )
      .reduce((s, r) => s + r.requestedUnits, 0);
  const stripUser = ({ accountId: _a, ...u }: User & { accountId: string }): User => u;

  return {
    listPublicPlans: (planType) =>
      call(false, () => plans.filter((p) => p.isPublic && (!planType || p.planType === planType))),
    createAccount: ({ name, planId }) =>
      call(false, () => {
        if (!name.trim()) validation("Validation failed", { name: "Required" });
        const p = plans.find((x) => x.id === planId && x.isPublic && x.planType === "account");
        if (!p) validation("Validation failed", { planId: "Must be a public account plan" });
        const account: Account = {
          id: generateUuid(),
          name: name.trim(),
          planId,
          createdAt: new Date().toISOString(),
        };
        const apiKey = `um_${generateUuid().replace(/-/g, "")}`;
        accounts.push(account);
        keys.set(apiKey, account.id);
        return { account, apiKey };
      }),
    updateAccountPlan: (planId) =>
      call(true, (accId) => {
        accessiblePlan(accId, planId, "account");
        const a = getAccount(accId);
        a.planId = planId;
        return a;
      }),
    listMyPlans: (planType) =>
      call(true, (accId) =>
        plans.filter((p) => p.ownerAccountId === accId && (!planType || p.planType === planType)),
      ),
    createPlan: (input) =>
      call(true, (accId) => {
        if (!input.name.trim()) validation("Validation failed", { name: "Required" });
        if (!isPosInt(input.monthlyAllowance) || !isPosInt(input.maxUnitsPerRequest))
          validation("Limits must be positive integers");
        const p: Plan = {
          id: generateUuid(),
          ...input,
          name: input.name.trim(),
          ownerAccountId: accId,
          isPublic: false,
        };
        plans.push(p);
        return p;
      }),
    updatePlan: (id, input) =>
      call(true, (accId) => {
        const p = plans.find((x) => x.id === id && x.ownerAccountId === accId);
        if (!p) throw new ApiError(404, { error: "Plan not found" });
        if (input.name !== undefined && !input.name.trim())
          validation("Validation failed", { name: "Required" });
        for (const k of ["monthlyAllowance", "maxUnitsPerRequest"] as const)
          if (input[k] !== undefined && !isPosInt(input[k]))
            validation("Limits must be positive integers");
        Object.assign(p, input);
        return p;
      }),
    listUsers: () =>
      call(true, (accId) => users.filter((u) => u.accountId === accId).map(stripUser)),
    createUser: ({ name, planId }) =>
      call(true, (accId) => {
        if (!name.trim()) validation("Validation failed", { name: "Required" });
        accessiblePlan(accId, planId, "user");
        const u = {
          id: generateUuid(),
          name: name.trim(),
          planId,
          createdAt: new Date().toISOString(),
          accountId: accId,
        };
        users.push(u);
        return stripUser(u);
      }),
    getUser: (id) => call(true, (accId) => stripUser(findUser(accId, id))),
    updateUserPlan: (id, planId) =>
      call(true, (accId) => {
        const u = findUser(accId, id);
        accessiblePlan(accId, planId, "user");
        u.planId = planId;
        return stripUser(u);
      }),
    consume: ({ userId, requestId, requestedUnits }) =>
      call(true, (accId) => {
        if (!isPosInt(requestedUnits))
          validation("Validation failed", { requestedUnits: "Must be a positive integer" });
        if (!requestId) validation("Validation failed", { requestId: "Required" });
        const existing = records.find((r) => r.accountId === accId && r.requestId === requestId);
        if (existing) {
          if (existing.userId !== userId || existing.requestedUnits !== requestedUnits)
            throw new ApiError(409, { error: "Conflict" });
          return { ...existing.result, duplicate: true };
        }
        const u = findUser(accId, userId);
        const accPlan = plans.find((p) => p.id === getAccount(accId).planId)!;
        const usrPlan = plans.find((p) => p.id === u.planId)!;
        const m = currentMonth();
        let reason: RejectionReason | null = null;
        if (requestedUnits > accPlan.maxUnitsPerRequest) reason = "account_request_limit";
        else if (requestedUnits > usrPlan.maxUnitsPerRequest) reason = "user_request_limit";
        else if (used(accId, m) + requestedUnits > accPlan.monthlyAllowance)
          reason = "account_monthly_limit";
        else if (used(accId, m, userId) + requestedUnits > usrPlan.monthlyAllowance)
          reason = "user_monthly_limit";
        const result: ConsumeResult = {
          accepted: reason === null,
          rejectionReason: reason,
          duplicate: false,
        };
        records.push({
          id: generateUuid(),
          requestId,
          userId,
          requestedUnits,
          accountId: accId,
          seq: ++seq,
          result,
          status: reason ? "rejected" : "accepted",
          rejectionReason: reason,
          createdAt: new Date().toISOString(),
        });
        return result;
      }),
  };
}
