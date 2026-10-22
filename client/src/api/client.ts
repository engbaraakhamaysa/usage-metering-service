import type { Account, CreateAccountResponse, Plan, PlanType, User } from "@/types";

export interface ApiConfig {
  baseUrl: string;
  apiKey: string | null;
}

export interface CreatePlanInput {
  name: string;
  planType: PlanType;
  monthlyAllowance: number;
  maxUnitsPerRequest: number;
}

export type UpdatePlanInput = Partial<
  Pick<CreatePlanInput, "name" | "monthlyAllowance" | "maxUnitsPerRequest">
>;

/** UI-facing management operations implemented by the typed HTTP client. */
export interface ManagementMethods {
  // public
  listPublicPlans(planType?: PlanType): Promise<Plan[]>; // GET /api/plans
  createAccount(input: { name: string; planId: string }): Promise<CreateAccountResponse>; // POST /api/accounts
  // x-api-key
  updateAccountPlan(planId: string): Promise<Account>; // PATCH /api/accounts/me/plan
  listMyPlans(planType?: PlanType): Promise<Plan[]>; // GET /api/plans/me
  createPlan(input: CreatePlanInput): Promise<Plan>; // POST /api/plans
  updatePlan(id: string, input: UpdatePlanInput): Promise<Plan>; // PATCH /api/plans/:id
  listUsers(): Promise<User[]>; // GET /api/users
  createUser(input: { name: string; planId: string }): Promise<User>; // POST /api/users
  getUser(id: string): Promise<User>; // GET /api/users/:id
  updateUserPlan(id: string, planId: string): Promise<User>; // PATCH /api/users/:id/plan
}
