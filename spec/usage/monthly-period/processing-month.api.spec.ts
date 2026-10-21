import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import request from "supertest";

import app from "../../../src/app.js";
import { db } from "../../../src/db/connection.js";
import { accounts } from "../../../src/db/schema/accounts.js";
import { usage } from "../../../src/db/schema/usage.js";

import {
  createTestAccount,
  createTestUser,
  deleteTestAccount,
} from "../../helpers/fixtures.js";

///////////////////////////////////////////////////////
// Verify processing month after waiting for an account lock
///////////////////////////////////////////////////////
describe("Consumption processing month", () => {
  it("uses the processing month after waiting for the account lock", async () => {
    const { account, apiKey } = await createTestAccount();

    let releaseLock = () => {};
    let lockTask: Promise<void> | undefined;
    let pendingRequest: Promise<request.Response> | undefined;

    try {
      const user = await createTestUser(account.id);
      const requestId = randomUUID();

      const beforeMidnight = new Date("2026-09-30T23:59:59.900Z");
      const afterMidnight = new Date("2026-10-01T00:00:00.100Z");

      // Mock Date without replacing timers used by HTTP and PostgreSQL.
      jasmine.clock().mockDate(beforeMidnight);

      const release = new Promise<void>((resolve) => {
        releaseLock = resolve;
      });

      let reportLocked!: (pid: number) => void;
      let reportLockFailure!: (error: unknown) => void;

      const locked = new Promise<number>((resolve, reject) => {
        reportLocked = resolve;
        reportLockFailure = reject;
      });

      ///////////////////////////////////////////////////////
      // Hold the account lock in a separate transaction
      /////////////////////////////////////////////////////////
      lockTask = db
        .transaction(async (tx) => {
          await tx
            .select({ id: accounts.id })
            .from(accounts)
            .where(eq(accounts.id, account.id))
            .for("update");

          const result = await tx.execute(sql`
            SELECT pg_backend_pid() AS pid
          `);

          reportLocked(Number(result[0].pid));

          await release;
        })
        .catch((error) => {
          reportLockFailure(error);
          throw error;
        });

      const blockerPid = await locked;

      // Start consumption while the account remains locked.
      pendingRequest = request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId,
          requestedUnits: 10,
        })
        .then((response) => response);

      ///////////////////////////////////////////////////////
      // Confirm the request is waiting for the database lock
      ///////////////////////////////////////////////////////
      let isWaiting = false;
      const deadline = performance.now() + 2_000;

      while (performance.now() < deadline) {
        const waiting = await db.execute(sql`
          SELECT EXISTS (
            SELECT 1
            FROM pg_stat_activity
            WHERE ${blockerPid}::integer = ANY (
              pg_blocking_pids(pid)
            )
          ) AS waiting
        `);

        if (waiting[0]?.waiting === true) {
          isWaiting = true;
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 20));
      }

      if (!isWaiting) {
        throw new Error("Consumption did not wait for the account lock");
      }

      ///////////////////////////////////////////////////////
      // Enter the new month before releasing the lock
      ///////////////////////////////////////////////////////
      jasmine.clock().mockDate(afterMidnight);

      releaseLock();
      await lockTask;

      const response = await pendingRequest;

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("accepted");
      expect(response.body.createdAt).toBe(afterMidnight.toISOString());

      const rows = await db
        .select()
        .from(usage)
        .where(eq(usage.accountId, account.id));

      expect(rows).toEqual(
        jasmine.arrayWithExactContents([
          jasmine.objectContaining({
            userId: null,
            periodStart: "2026-10-01",
            usedUnits: 10,
          }),
          jasmine.objectContaining({
            userId: user.id,
            periodStart: "2026-10-01",
            usedUnits: 10,
          }),
        ]),
      );

      ///////////////////////////////////////////////////////
      // Preserve the original decision when retried next month
      ///////////////////////////////////////////////////////
      jasmine.clock().mockDate(new Date("2026-11-01T00:00:00Z"));

      const repeated = await request(app)
        .post("/api/usage/consume")
        .set("x-api-key", apiKey)
        .send({
          userId: user.id,
          requestId,
          requestedUnits: 10,
        });

      expect(repeated.status).toBe(200);
      expect(repeated.body).toEqual({
        ...response.body,
        duplicate: true,
      });

      const rowsAfterRetry = await db
        .select()
        .from(usage)
        .where(eq(usage.accountId, account.id));

      expect(rowsAfterRetry).toEqual(jasmine.arrayWithExactContents(rows));
    } finally {
      releaseLock();

      try {
        await Promise.allSettled([
          lockTask ?? Promise.resolve(),
          pendingRequest ?? Promise.resolve(),
        ]);
      } finally {
        jasmine.clock().uninstall();
        await deleteTestAccount(account.id);
      }
    }
  });
});
