import { sql } from "drizzle-orm";
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

  it("makes a second caller wait for the first to finish", async () => {
    const order: string[] = [];
    let releaseFirst = () => {};
    const firstHolds = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = withSessionAdvisoryLock("test-lock-order", async () => {
      order.push("first start");
      await firstHolds;
      order.push("first end");
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    const second = withSessionAdvisoryLock("test-lock-order", async () => {
      order.push("second start");
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(order).toEqual(["first start"]);

    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(["first start", "first end", "second start"]);
    expect(await advisoryLockCount()).toBe(0);
  });

  it("leaves no lock behind after a lifecycle pass", async () => {
    await runLifecycleAutomation();
    expect(await advisoryLockCount()).toBe(0);
  });
});
