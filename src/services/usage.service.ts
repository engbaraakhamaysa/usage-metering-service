import {
  createAccountUsage,
  createUserUsage,
  findAccountWithPlan,
  findUserWithPlan,
  findAccountUsage,
  findUserUsage,
  incrementUsage,
} from "../repositories/usage.repository.js";

// Get the first day of the current month
function getCurrentPeriodStart(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}-01`;
}

// Get account usage
export async function getAccountUsage(accountId: string) {
  const account = await findAccountWithPlan(accountId);

  if (!account) {
    return {
      success: false as const,
      status: 404,
      message: "Account not found",
    };
  }

  const periodStart = getCurrentPeriodStart();

  const accountUsage = await findAccountUsage(accountId, periodStart);

  const usedUnits = accountUsage?.usedUnits ?? 0;

  return {
    success: true as const,
    status: 200,
    data: {
      accountId,
      periodStart,
      usedUnits,
      monthlyAllowance: account.monthlyAllowance,
      remainingUnits: account.monthlyAllowance - usedUnits,
    },
  };
}

// Get user usage
export async function getUserUsage(userId: string) {
  const user = await findUserWithPlan(userId);

  if (!user) {
    return {
      success: false as const,
      status: 404,
      message: "User not found",
    };
  }

  const periodStart = getCurrentPeriodStart();

  const userUsage = await findUserUsage(user.accountId, userId, periodStart);

  const usedUnits = userUsage?.usedUnits ?? 0;

  return {
    success: true as const,
    status: 200,
    data: {
      userId,
      accountId: user.accountId,
      periodStart,
      usedUnits,
      monthlyAllowance: user.monthlyAllowance,
      remainingUnits: user.monthlyAllowance - usedUnits,
    },
  };
}

// Consume units for an account and its user
export async function consumeUsage(
  accountId: string,
  userId: string,
  units: number,
) {
  const account = await findAccountWithPlan(accountId);

  if (!account) {
    return {
      success: false as const,
      status: 404,
      message: "Account not found",
    };
  }

  const user = await findUserWithPlan(userId);

  if (!user) {
    return {
      success: false as const,
      status: 404,
      message: "User not found",
    };
  }

  if (user.accountId !== accountId) {
    return {
      success: false as const,
      status: 400,
      message: "User does not belong to this account",
    };
  }

  if (units > account.maxUnitsPerRequest || units > user.maxUnitsPerRequest) {
    return {
      success: false as const,
      status: 400,
      message: "Request exceeds the per-request limit",
    };
  }

  const periodStart = getCurrentPeriodStart();

  const accountUsage = await createAccountUsage(accountId, periodStart);
  const userUsage = await createUserUsage(accountId, userId, periodStart);

  if (!accountUsage || !userUsage) {
    return {
      success: false as const,
      status: 500,
      message: "Failed to initialize usage records",
    };
  }

  if (accountUsage.usedUnits + units > account.monthlyAllowance) {
    return {
      success: false as const,
      status: 403,
      message: "Account monthly allowance exceeded",
    };
  }

  if (userUsage.usedUnits + units > user.monthlyAllowance) {
    return {
      success: false as const,
      status: 403,
      message: "User monthly allowance exceeded",
    };
  }

  await incrementUsage(accountUsage.id, units);
  await incrementUsage(userUsage.id, units);

  return {
    success: true as const,
    status: 200,
    message: "Usage consumed successfully",
    data: {
      accountId,
      userId,
      units,
      periodStart,
      accountUsedUnits: accountUsage.usedUnits + units,
      accountRemainingUnits:
        account.monthlyAllowance - accountUsage.usedUnits - units,
      userUsedUnits: userUsage.usedUnits + units,
      userRemainingUnits: user.monthlyAllowance - userUsage.usedUnits - units,
    },
  };
}
