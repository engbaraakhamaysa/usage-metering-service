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

export interface Usage {
  usedUnits: number;
  /** null for historical months */
  remainingUnits: number | null;
  currentPlan: Plan;
  periodStart: string;
}

export type RejectionReason =
  "account_request_limit" | "account_monthly_limit" | "user_request_limit" | "user_monthly_limit";

export interface ConsumeRequest {
  userId: string;
  requestId: string;
  requestedUnits: number;
}

export interface ConsumeResult {
  accepted: boolean;
  rejectionReason: RejectionReason | null;
  duplicate: boolean;
}

export type RecordStatus = "accepted" | "rejected";

export interface UsageRecord {
  id: string;
  requestId: string;
  userId: string;
  requestedUnits: number;
  status: RecordStatus;
  rejectionReason: RejectionReason | null;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorBody {
  error: string;
  errors?: unknown;
}
