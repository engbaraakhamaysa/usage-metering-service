export type PlanType = "account" | "user";

export interface Plan {
  id: string;
  name: string;
  planType: PlanType;
  monthlyAllowance: number;
  maxUnitsPerRequest: number;
  /** null for public plans; owning account id for private plans */
  ownerAccountId: string | null;
  isPublic: boolean;
}

export interface Account {
  id: string;
  name: string;
  planId: string;
  createdAt: string;
}

export interface CreateAccountResponse {
  account: Account;
  apiKey: string;
}

export interface User {
  id: string;
  name: string;
  planId: string;
  createdAt: string;
}

export type RejectionReason =
  "account_request_limit" | "account_monthly_limit" | "user_request_limit" | "user_monthly_limit";

export interface ConsumeRequest {
  userId: string;
  requestId: string;
  requestedUnits: number;
}

export interface ApiErrorBody {
  error: string;
  errors?: unknown;
}
