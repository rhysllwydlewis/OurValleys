import { eq, inArray } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

// Only the two outside boundaries are faked: file storage and email. The
// lifecycle rules, the transaction and the cascade are the real code.
const deletedObjects: string[] = [];
vi.mock("@/lib/media-storage", () => ({
  isMediaStorageConfigured: () => true,
  publicMediaUrl: (key: string) => `https://media.test/${key}`,
  putMediaObject: async () => undefined,
  deleteMediaObject: async (key: string) => {
    deletedObjects.push(key);
  },
}));
const sentEmails: { to: string; subject: string; text: string }[] = [];
let failEmail = false;
vi.mock("@/lib/email", () => ({
  sendTransactionalEmail: async (message: {
    to: string;
    subject: string;
    text: string;
  }) => {
    if (failEmail) throw new Error("Email provider rejected the message.");
    sentEmails.push(message);
  },
}));

import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMedia,
  businessMembership,
  category,
} from "@/lib/database/schema/business";
import {
  businessDocument,
  businessLifecycle,
} from "@/lib/database/schema/business-operations";
import { adminAuditLog } from "@/lib/database/schema/moderation";
import { storageCleanup } from "@/lib/database/schema/storage-cleanup";
import { runLifecycleAutomation } from "@/modules/businesses/lifecycle-automation";
import { permissionsForBusinessRole } from "@/modules/identity/access-policy";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000002301",
  businessId: "00000000-0000-4000-8000-000000002302",
  ownerId: "00000000-0000-4000-8000-000000002303",
  mediaKey: "business/test-deletion/gallery/photo.webp",
  retiredMediaKey: "business/test-deletion/gallery/retired.webp",
  documentKey: "business/test-deletion/documents/menu.pdf",
} as const;
const keys = [
  fixture.mediaKey,
  fixture.retiredMediaKey,
  fixture.documentKey,
] as const;

const day = 24 * 60 * 60 * 1000;

async function setLifecycle(input: {
  deleteAfterDaysAgo: number;
  warnedDaysAgo: number | null;
  state?: string;
}) {
  const database = getDatabase();
  const now = Date.now();
  await database
    .insert(businessLifecycle)
    .values({
      businessId: fixture.businessId,
      state: input.state ?? "deletion_pending",
      deletionRequestedAt: new Date(now - 40 * day),
      deleteAfter: new Date(now - input.deleteAfterDaysAgo * day),
      deletionWarningSentAt:
        input.warnedDaysAgo === null
          ? null
          : new Date(now - input.warnedDaysAgo * day),
    })
    .onConflictDoUpdate({
      target: businessLifecycle.businessId,
      set: {
        state: input.state ?? "deletion_pending",
        deleteAfter: new Date(now - input.deleteAfterDaysAgo * day),
        deletionWarningSentAt:
          input.warnedDaysAgo === null
            ? null
            : new Date(now - input.warnedDaysAgo * day),
      },
    });
}

async function businessExists() {
  const rows = await getDatabase()
    .select({ id: business.id })
    .from(business)
    .where(eq(business.id, fixture.businessId));
  return rows.length === 1;
}

describeDatabase("owner-requested business deletion", () => {
  beforeEach(async () => {
    deletedObjects.length = 0;
    sentEmails.length = 0;
    failEmail = false;
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.ownerId,
      name: "Deletion Owner",
      email: "deletion.owner@example.test",
      emailVerified: true,
    });
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Deletion fixtures",
      slug: "deletion-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Deletion Fixture",
      slug: "deletion-fixture",
      summary: "A fictional business used only by deletion tests.",
      description: "A fictional business used only by deletion tests.",
      primaryCategoryId: fixture.categoryId,
      businessType: "service_area",
      status: "published",
      createdByUserId: fixture.ownerId,
    });
    await database.insert(businessMembership).values({
      businessId: fixture.businessId,
      userId: fixture.ownerId,
      role: "owner",
      permissions: permissionsForBusinessRole("owner"),
      status: "active",
    });
    await database.insert(businessMedia).values([
      {
        businessId: fixture.businessId,
        role: "gallery",
        storageKey: fixture.mediaKey,
        altText: "A fictional photograph",
        contentType: "image/webp",
        byteSize: 1000,
      },
      {
        businessId: fixture.businessId,
        role: "gallery",
        storageKey: fixture.retiredMediaKey,
        altText: "A fictional photograph that was removed",
        contentType: "image/webp",
        byteSize: 1000,
        status: "removed",
      },
    ]);
    await database.insert(businessDocument).values({
      businessId: fixture.businessId,
      role: "menu",
      storageKey: fixture.documentKey,
      displayName: "Fictional menu",
      contentType: "application/pdf",
      byteSize: 1000,
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(storageCleanup)
      .where(inArray(storageCleanup.storageKey, [...keys]));
    await database
      .delete(adminAuditLog)
      .where(eq(adminAuditLog.targetId, fixture.businessId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("sends the warning first and does not delete in the same run, even past the deletion date", async () => {
    await setLifecycle({ deleteAfterDaysAgo: 2, warnedDaysAgo: null });

    await runLifecycleAutomation();

    expect(sentEmails.map((email) => email.subject)).toContain(
      "Deletion Fixture deletion is approaching",
    );
    expect(await businessExists()).toBe(true);
    const [lifecycle] = await getDatabase()
      .select({
        warnedAt: businessLifecycle.deletionWarningSentAt,
        deleteAfter: businessLifecycle.deleteAfter,
      })
      .from(businessLifecycle)
      .where(eq(businessLifecycle.businessId, fixture.businessId));
    expect(lifecycle?.warnedAt).toBeInstanceOf(Date);
    // The deadline the owner sees moves out to a week after the late warning.
    expect(lifecycle?.deleteAfter?.getTime()).toBeGreaterThanOrEqual(
      Date.now() + 6.9 * day,
    );
  });

  it("does not count a warning that could not be delivered, and does not delete", async () => {
    failEmail = true;
    await setLifecycle({ deleteAfterDaysAgo: 2, warnedDaysAgo: null });

    const result = await runLifecycleAutomation();

    expect(result.deletionWarningsFailed).toBeGreaterThanOrEqual(1);
    expect(await businessExists()).toBe(true);
    const [lifecycle] = await getDatabase()
      .select({ warnedAt: businessLifecycle.deletionWarningSentAt })
      .from(businessLifecycle)
      .where(eq(businessLifecycle.businessId, fixture.businessId));
    expect(lifecycle?.warnedAt).toBeNull();
  });

  it("waits for the full warning window after a late warning", async () => {
    await setLifecycle({ deleteAfterDaysAgo: 5, warnedDaysAgo: 2 });

    await runLifecycleAutomation();

    expect(await businessExists()).toBe(true);
    expect(deletedObjects).toEqual([]);
  });

  it("never deletes a business that is no longer pending deletion", async () => {
    await setLifecycle({
      deleteAfterDaysAgo: 5,
      warnedDaysAgo: 10,
      state: "active",
    });

    await runLifecycleAutomation();

    expect(await businessExists()).toBe(true);
  });

  it("deletes after a delivered warning and the full window, removing every stored file and recording the audit entry", async () => {
    await setLifecycle({ deleteAfterDaysAgo: 3, warnedDaysAgo: 10 });

    const result = await runLifecycleAutomation();

    expect(result.deletedAfterRecovery).toBeGreaterThanOrEqual(1);
    expect(await businessExists()).toBe(false);

    // Active, retired and document objects were all queued and then removed.
    expect([...deletedObjects].sort()).toEqual([...keys].sort());
    const queued = await getDatabase()
      .select({
        storageKey: storageCleanup.storageKey,
        deletedAt: storageCleanup.deletedAt,
      })
      .from(storageCleanup)
      .where(inArray(storageCleanup.storageKey, [...keys]));
    expect(queued).toHaveLength(3);
    expect(queued.every((row) => row.deletedAt !== null)).toBe(true);

    const [audit] = await getDatabase()
      .select({
        actorUserId: adminAuditLog.actorUserId,
        metadata: adminAuditLog.metadata,
      })
      .from(adminAuditLog)
      .where(eq(adminAuditLog.targetId, fixture.businessId));
    expect(audit?.actorUserId).toBe(fixture.ownerId);
    expect(audit?.metadata).toMatchObject({
      action: "owner_requested_deletion_completed",
      storageObjectsQueued: 3,
    });
  });
});
