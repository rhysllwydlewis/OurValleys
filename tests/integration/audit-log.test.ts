import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { adminAuditLog, user } from "@/lib/database/schema";
import {
  listRecentAdminAudit,
  recordAdminAudit,
} from "@/modules/identity/audit-log";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  actorId: "00000000-0000-4000-8000-000000000901",
  targetId: "00000000-0000-4000-8000-000000000902",
  missingActorId: "00000000-0000-4000-8000-000000000903",
} as const;

describeDatabase("admin audit log", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values({
      id: fixture.actorId,
      name: "Fixture Auditor",
      email: "fixture-auditor@example.test",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(adminAuditLog)
      .where(eq(adminAuditLog.actorUserId, fixture.actorId));
    await database.delete(user).where(eq(user.id, fixture.actorId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("records an entry that lists back with the joined actor", async () => {
    await recordAdminAudit({
      actorUserId: fixture.actorId,
      action: "business.suspended",
      targetType: "business",
      targetId: fixture.targetId,
      metadata: { reason: "duplicate listing" },
    });

    const result = await listRecentAdminAudit();
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;

    const entry = result.entries.find(
      (candidate) => candidate.targetId === fixture.targetId,
    );
    expect(entry).toBeDefined();
    expect(entry).toMatchObject({
      action: "business.suspended",
      targetType: "business",
      targetId: fixture.targetId,
      metadata: { reason: "duplicate listing" },
      actor: {
        id: fixture.actorId,
        name: "Fixture Auditor",
        email: "fixture-auditor@example.test",
      },
    });
  });

  it("defaults targetId and metadata to null when omitted", async () => {
    await recordAdminAudit({
      actorUserId: fixture.actorId,
      action: "user.role_changed",
      targetType: "user",
    });

    const result = await listRecentAdminAudit();
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;

    const entry = result.entries.find(
      (candidate) =>
        candidate.action === "user.role_changed" &&
        candidate.actor?.id === fixture.actorId,
    );
    expect(entry).toBeDefined();
    expect(entry?.targetId).toBeNull();
    expect(entry?.metadata).toBeNull();
  });

  it("orders entries most recent first", async () => {
    await recordAdminAudit({
      actorUserId: fixture.actorId,
      action: "category.created",
      targetType: "category",
      targetId: "first",
    });
    await recordAdminAudit({
      actorUserId: fixture.actorId,
      action: "category.updated",
      targetType: "category",
      targetId: "second",
    });

    const result = await listRecentAdminAudit();
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;

    const relevant = result.entries.filter(
      (candidate) => candidate.actor?.id === fixture.actorId,
    );
    expect(relevant[0]?.targetId).toBe("second");
    expect(relevant[1]?.targetId).toBe("first");
  });

  it("respects the limit parameter", async () => {
    for (let index = 0; index < 3; index += 1) {
      await recordAdminAudit({
        actorUserId: fixture.actorId,
        action: "place.created",
        targetType: "place",
        targetId: `place-${index}`,
      });
    }

    const result = await listRecentAdminAudit(2);
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(result.entries).toHaveLength(2);
  });

  it("never throws, even when the write violates a foreign key constraint", async () => {
    await expect(
      recordAdminAudit({
        actorUserId: fixture.missingActorId,
        action: "user.banned",
        targetType: "user",
        targetId: fixture.missingActorId,
      }),
    ).resolves.toBeUndefined();

    const result = await listRecentAdminAudit();
    expect(result.state).toBe("ready");
    if (result.state !== "ready") return;
    expect(
      result.entries.some(
        (candidate) => candidate.targetId === fixture.missingActorId,
      ),
    ).toBe(false);
  });
});
