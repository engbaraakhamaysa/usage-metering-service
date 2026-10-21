import { eq, sql } from "drizzle-orm";
import type request from "supertest";

import { db } from "../../src/db/connection.js";
import { accounts } from "../../src/db/schema/accounts.js";

///////////////////////////////////////////////////////
// Verify an operation waits for the account lock
///////////////////////////////////////////////////////
export async function runWhileAccountLocked(
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
