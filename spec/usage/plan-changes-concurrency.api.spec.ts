import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import request from "supertest";

import app from "../../src/app.js";
import { db } from "../../src/db/connection.js";
import { accounts } from "../../src/db/schema/accounts.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
  getPublicPlan,
} from "../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify an operation waits for the account lock
///////////////////////////////////////////////////////
async function runWhileAccountLocked(
  accountId: string,
  startRequest: () => Promise<request.Response>,
): Promise<request.Response> {
  let releaseLock = () => {};
  let lockTask: Promise<void> | undefined;
  let pendingRequest: Promise<request.Response> | undefined;

  try {
    const release = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    let reportLocked!: (pid: number) => void;
    let reportFailure!: (error: unknown) => void;

    const locked = new Promise<number>((resolve, reject) => {
      reportLocked = resolve;
      reportFailure = reject;
    });

    lockTask = db.transaction(async (tx) => {
      await tx
        .select({ id: accounts.id })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .for("update");

      const result = await tx.execute(sql`
        SELECT pg_backend_pid() AS pid
      `);

      reportLocked(Number(result[0].pid));

      await release;
    });

    // Report transaction failure without leaving an unhandled rejection.
    void lockTask.catch(reportFailure);

    const blockerPid = await locked;

    let requestFinished = false;

    pendingRequest = startRequest();

    void pendingRequest.then(
      () => {
        requestFinished = true;
      },
      () => {
        requestFinished = true;
      },
    );

    const deadline = performance.now() + 2_000;
    let waitingForLock = false;

    while (performance.now() < deadline) {
      if (requestFinished) {
        throw new Error("The update finished before the lock was released");
      }

      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT 1
          FROM pg_stat_activity
          WHERE ${blockerPid}::integer = ANY (
            pg_blocking_pids(pid)
          )
        ) AS waiting
      `);

      if (result[0]?.waiting === true) {
        waitingForLock = true;
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 20));
    }

    if (!waitingForLock) {
      throw new Error("The update did not wait for the account lock");
    }

    expect(requestFinished).toBeFalse();

    releaseLock();
    await lockTask;

    return await pendingRequest;
  } finally {
    releaseLock();

    await Promise.allSettled([
      lockTask ?? Promise.resolve(),
      pendingRequest ?? Promise.resolve(),
    ]);
  }
}

///////////////////////////////////////////////////////
// Coordinate plan updates with the consumption account lock
///////////////////////////////////////////////////////
describe("Plan changes and account locking", () => {
  it("waits before switching a user's plan and then applies the new limits", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);
      const premium = await getPublicPlan("Premium", "user");

      const initial = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 10,
        });

      expect(initial.status).toBe(200);
      expect(initial.body.status).toBe("accepted");

      const updated = await runWhileAccountLocked(account.id, () =>
        request(app)
          .patch(`/api/users/${user.id}/plan`)
          .set("x-api-key", apiKey)
          .send({ planId: premium.id })
          .then((response) => response),
      );

      expect(updated.status).toBe(200);
      expect(updated.body.planId).toBe(premium.id);

      const consumed = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 20,
        });

      expect(consumed.status).toBe(200);
      expect(consumed.body.status).toBe("accepted");

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(30);
      expect(userUsage.body.currentPlan.id).toBe(premium.id);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(30);
    } finally {
      await deleteTestAccount(account.id);
    }
  });

  it("waits before editing private plan limits and then applies the new limits", async () => {
    const { account, apiKey } = await createTestAccount();

    try {
      const user = await createTestUser(account.id);

      const created = await request(app)
        .post("/api/plans")
        .set("x-api-key", apiKey)
        .send({
          name: "Locked User Plan",
          planType: "user",
          monthlyAllowance: 100,
          maxUnitsPerRequest: 10,
        });

      expect(created.status).toBe(201);

      const assigned = await request(app)
        .patch(`/api/users/${user.id}/plan`)
        .set("x-api-key", apiKey)
        .send({ planId: created.body.id });

      expect(assigned.status).toBe(200);

      const initial = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 10,
        });

      expect(initial.status).toBe(200);
      expect(initial.body.status).toBe("accepted");

      const updated = await runWhileAccountLocked(account.id, () =>
        request(app)
          .patch(`/api/plans/${created.body.id}`)
          .set("x-api-key", apiKey)
          .send({ maxUnitsPerRequest: 2 })
          .then((response) => response),
      );

      expect(updated.status).toBe(200);
      expect(updated.body.maxUnitsPerRequest).toBe(2);

      const rejected = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId: randomUUID(),
          requestedUnits: 3,
        });

      expect(rejected.status).toBe(200);
      expect(rejected.body.status).toBe("rejected");
      expect(rejected.body.rejectionReason).toBe("user_request_limit");

      const userUsage = await request(app)
        .get(`/api/usage/users/${user.id}`)
        .set("x-api-key", apiKey);

      const accountUsage = await request(app)
        .get("/api/usage/account")
        .set("x-api-key", apiKey);

      expect(userUsage.status).toBe(200);
      expect(userUsage.body.usedUnits).toBe(10);
      expect(userUsage.body.currentPlan.maxUnitsPerRequest).toBe(2);

      expect(accountUsage.status).toBe(200);
      expect(accountUsage.body.usedUnits).toBe(10);
    } finally {
      await deleteTestAccount(account.id);
    }
  });
});
