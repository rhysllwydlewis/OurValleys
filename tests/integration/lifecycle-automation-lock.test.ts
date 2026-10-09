import { sql } from "drizzle-orm";
import postgres from "postgres";
import { afterAll, describe, expect, it } from "vitest";
import { withSessionAdvisoryLock } from "@/lib/database/advisory-lock";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { runLifecycleAutomation } from "@/modules/businesses/lifecycle-automation";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

async function advisoryLockCount(): Promise<number> {
  const rows = await getDatabase().execute<{ count: number }>(
    sql`select count(*)::int as count from pg_locks where locktype = 'advisory'`,
  );
  return rows[0]?.count ?? 0;
}

describeDatabase("session advisory lock", () => {
  afterAll(async () => {
    await closeDatabase();
  });

  it("releases the lock even when the work keeps every pooled connection busy", async () => {
    // With a lock taken through the pool, busy work moves later queries to
    // other connections, so the unlock would run on a connection that does not
    // hold the lock and the lock would stay behind.
    const result = await withSessionAdvisoryLock("test-lock-busy", async () => {
      await Promise.all(
        Array.from({ length: 6 }, () =>
          getDatabase().execute(sql`select pg_sleep(0.05)`),
        ),
      );
      return "done";
    });

    expect(result).toBe("done");
    expect(await advisoryLockCount()).toBe(0);
  });

  it("releases the lock when the work throws", async () => {
    await expect(
      withSessionAdvisoryLock("test-lock-throws", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(await advisoryLockCount()).toBe(0);
  });

  it("does not deadlock when callers in one process each need the pool", async () => {
    // The test pool has two connections. Without a per-process queue the
    // second caller reserves the other one and waits on the lock, leaving the
    // first caller's own query with no connection.
    const order: string[] = [];
    await Promise.all(
      ["first", "second"].map((label) =>
        withSessionAdvisoryLock("test-lock-local", async () => {
          await getDatabase().execute(sql`select 1`);
          order.push(label);
        }),
      ),
    );

    expect(order).toEqual(["first", "second"]);
    expect(await advisoryLockCount()).toBe(0);
  });

  it("waits while another process holds the lock", async () => {
    const other = postgres(process.env.TEST_DATABASE_URL as string, {
      max: 1,
      prepare: false,
    });
    try {
      await other`select pg_advisory_lock(hashtext('test-lock-other'))`;

      let entered = false;
      const waiting = withSessionAdvisoryLock("test-lock-other", async () => {
        entered = true;
      });
      // The caller is blocked inside Postgres on the other session's lock.
      await expect
        .poll(async () => {
          const rows = await getDatabase().execute<{ count: number }>(
            sql`select count(*)::int as count from pg_locks where locktype = 'advisory' and not granted`,
          );
          return rows[0]?.count ?? 0;
        })
        .toBe(1);
      expect(entered).toBe(false);

      await other`select pg_advisory_unlock(hashtext('test-lock-other'))`;
      await waiting;
      expect(entered).toBe(true);
    } finally {
      await other.end({ timeout: 5 });
    }
    expect(await advisoryLockCount()).toBe(0);
  });

  it("leaves no lock behind after a lifecycle pass", async () => {
    await runLifecycleAutomation();
    expect(await advisoryLockCount()).toBe(0);
  });
});
