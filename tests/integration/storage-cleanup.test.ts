import { inArray } from "drizzle-orm";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const objects = new Set<string>();
const attempted: string[] = [];
let failKeys = new Set<string>();
vi.mock("@/lib/media-storage", () => ({
  isMediaStorageConfigured: () => true,
  deleteMediaObject: async (key: string) => {
    attempted.push(key);
    if (failKeys.has(key)) throw new Error("Storage refused the delete.");
    objects.delete(key);
  },
}));

import { closeDatabase, getDatabase } from "@/lib/database/client";
import { storageCleanup } from "@/lib/database/schema/storage-cleanup";
import {
  deleteStoredObjectOrQueue,
  enqueueStorageCleanup,
  processStorageCleanup,
  purgeCompletedStorageCleanup,
} from "@/lib/storage-cleanup";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const keyA = "business/test-cleanup/a.webp";
const keyB = "business/test-cleanup/b.webp";
const keyC = "business/test-cleanup/c.webp";
const allKeys = [keyA, keyB, keyC];

async function rows() {
  return getDatabase()
    .select()
    .from(storageCleanup)
    .where(inArray(storageCleanup.storageKey, allKeys));
}

describeDatabase("storage cleanup queue", () => {
  afterEach(async () => {
    failKeys = new Set();
    objects.clear();
    attempted.length = 0;
    await getDatabase()
      .delete(storageCleanup)
      .where(inArray(storageCleanup.storageKey, allKeys));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("queues a key once and deletes it, marking it done", async () => {
    objects.add(keyA);
    await enqueueStorageCleanup(getDatabase(), [keyA, keyA]);
    expect(await rows()).toHaveLength(1);

    const result = await processStorageCleanup({ storageKeys: [keyA] });

    expect(result).toMatchObject({ attempted: 1, deleted: 1, failed: 0 });
    expect(objects.has(keyA)).toBe(false);
    expect((await rows())[0]?.deletedAt).toBeInstanceOf(Date);
  });

  it("keeps a failed delete queued with its attempt counted, and retries it", async () => {
    failKeys = new Set([keyB]);
    await enqueueStorageCleanup(getDatabase(), [keyB, keyC]);

    const first = await processStorageCleanup({ storageKeys: [keyB, keyC] });
    expect(first).toMatchObject({ attempted: 2, deleted: 1, failed: 1 });
    const afterFirst = await rows();
    const failed = afterFirst.find((row) => row.storageKey === keyB);
    expect(failed?.deletedAt).toBeNull();
    expect(failed?.attempts).toBe(1);

    failKeys = new Set();
    const second = await processStorageCleanup({ storageKeys: [keyB, keyC] });
    expect(second).toMatchObject({ attempted: 1, deleted: 1, failed: 0 });
    expect((await rows()).every((row) => row.deletedAt !== null)).toBe(true);
  });

  it("backs a recently failed object off in scheduled runs, so it cannot crowd out new ones", async () => {
    failKeys = new Set([keyB]);
    await enqueueStorageCleanup(getDatabase(), [keyB]);
    await processStorageCleanup({ storageKeys: [keyB] });
    failKeys = new Set();
    attempted.length = 0;
    await enqueueStorageCleanup(getDatabase(), [keyC]);

    // A scheduled run (no key list) skips keyB, which failed moments ago,
    // and still reaches the newer keyC.
    await processStorageCleanup({ limit: 1000 });

    expect(attempted).toContain(keyC);
    expect(attempted).not.toContain(keyB);
    const afterwards = await rows();
    expect(
      afterwards.find((row) => row.storageKey === keyC)?.deletedAt,
    ).not.toBeNull();
    expect(
      afterwards.find((row) => row.storageKey === keyB)?.deletedAt,
    ).toBeNull();
  });

  it("queues an unreferenced object when storage refuses the immediate delete", async () => {
    failKeys = new Set([keyA]);

    await deleteStoredObjectOrQueue(keyA);

    const queued = await rows();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.deletedAt).toBeNull();
  });

  it("purges only rows completed more than thirty days ago", async () => {
    await enqueueStorageCleanup(getDatabase(), [keyA, keyB]);
    const database = getDatabase();
    await database
      .update(storageCleanup)
      .set({ deletedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) })
      .where(inArray(storageCleanup.storageKey, [keyA]));
    await database
      .update(storageCleanup)
      .set({ deletedAt: new Date() })
      .where(inArray(storageCleanup.storageKey, [keyB]));

    await purgeCompletedStorageCleanup();

    expect((await rows()).map((row) => row.storageKey)).toEqual([keyB]);
  });
});
