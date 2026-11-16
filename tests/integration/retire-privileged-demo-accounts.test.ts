import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { account, session, user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  category,
} from "@/lib/database/schema/business";
import { adminAuditLog } from "@/lib/database/schema/moderation";
import {
  retiredDemoEmails,
  retirementAuditAction,
  retirePrivilegedDemoAccounts,
} from "../../scripts/retire-privileged-demo-accounts";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

// Fixture addresses stand in for the two demo identities so the real demo
// accounts, which browser tests rely on, are never touched.
const fixture = {
  categoryId: "00000000-0000-4000-8000-000000002601",
  businessId: "00000000-0000-4000-8000-000000002602",
  ownerId: "00000000-0000-4000-8000-000000002603",
  adminId: "00000000-0000-4000-8000-000000002604",
  bystanderId: "00000000-0000-4000-8000-000000002605",
  ownerEmail: "retire.owner@example.test",
  adminEmail: "retire.admin@example.test",
  bystanderEmail: "retire.viewer@example.test",
} as const;
const emails = [fixture.ownerEmail, fixture.adminEmail] as const;
const userIds = [fixture.ownerId, fixture.adminId, fixture.bystanderId];
const rowIds = userIds.map((userId, index) => ({
  userId,
  account: `00000000-0000-4000-8000-0000000026${10 + index}`,
  session: `00000000-0000-4000-8000-0000000026${20 + index}`,
}));

describeDatabase("retirePrivilegedDemoAccounts", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ownerId,
        name: "Retire Owner",
        email: fixture.ownerEmail,
        emailVerified: true,
      },
      {
        id: fixture.adminId,
        name: "Retire Admin",
        email: fixture.adminEmail,
        emailVerified: true,
        role: "admin",
      },
      {
        id: fixture.bystanderId,
        name: "Retire Viewer",
        email: fixture.bystanderEmail,
        emailVerified: true,
      },
    ]);
    await database.insert(account).values(
      rowIds.map(({ userId, account: id }) => ({
        id,
        userId,
        accountId: userId,
        providerId: "credential",
        password: "not-a-real-hash",
      })),
    );
    await database.insert(session).values(
      rowIds.map(({ userId, session: id }) => ({
        id,
        userId,
        token: `retire-token-${userId}`,
        expiresAt: new Date(Date.now() + 3_600_000),
      })),
    );
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Retire fixtures",
      slug: "retire-fixtures",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Retire Fixture",
      slug: "retire-fixture",
      summary: "A fictional business used only by retirement tests.",
      description: "A fictional business used only by retirement tests.",
      publicPhone: "01443 000000",
      primaryCategoryId: fixture.categoryId,
      businessType: "service_area",
      status: "draft",
      createdByUserId: fixture.ownerId,
    });
    await database.insert(businessMembership).values([
      {
        businessId: fixture.businessId,
        userId: fixture.ownerId,
        role: "owner",
        permissions: [],
        status: "active",
      },
      {
        businessId: fixture.businessId,
        userId: fixture.bystanderId,
        role: "viewer",
        permissions: [],
        status: "active",
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(adminAuditLog)
      .where(eq(adminAuditLog.action, retirementAuditAction));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(inArray(user.id, userIds));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  async function remainingEmails() {
    const rows = await getDatabase()
      .select({ email: user.email })
      .from(user)
      .where(inArray(user.id, userIds));
    return rows.map((row) => row.email).sort();
  }

  it("only ever targets the business-owner and administrator demo identities", () => {
    expect([...retiredDemoEmails].sort()).toEqual([
      "demo.admin@ourvalleys.example",
      "demo.owner@ourvalleys.example",
    ]);
  });

  it("a dry run reports the evidence and changes nothing", async () => {
    const report = await retirePrivilegedDemoAccounts({
      confirm: false,
      emails,
    });

    expect(report.mode).toBe("dry-run");
    expect(report.absent).toEqual([]);
    expect(report.found.map((entry) => entry.email).sort()).toEqual([
      fixture.adminEmail,
      fixture.ownerEmail,
    ]);
    const owner = report.found.find((e) => e.email === fixture.ownerEmail);
    expect(owner).toMatchObject({
      role: "user",
      sessions: 1,
      credentials: 1,
      memberships: 1,
    });
    expect(await remainingEmails()).toHaveLength(3);
    const audit = await getDatabase()
      .select({ id: adminAuditLog.id })
      .from(adminAuditLog)
      .where(eq(adminAuditLog.action, retirementAuditAction));
    expect(audit).toHaveLength(0);
  });

  it("deletes the two identities with their sessions, credentials and memberships, and nothing else", async () => {
    const report = await retirePrivilegedDemoAccounts({
      confirm: true,
      emails,
    });

    expect(report.mode).toBe("confirmed");
    expect(report.remainingAfter).toBe(0);
    expect(await remainingEmails()).toEqual([fixture.bystanderEmail]);

    const database = getDatabase();
    const sessions = await database
      .select({ userId: session.userId })
      .from(session)
      .where(inArray(session.userId, userIds));
    expect(sessions.map((row) => row.userId)).toEqual([fixture.bystanderId]);
    const credentials = await database
      .select({ userId: account.userId })
      .from(account)
      .where(inArray(account.userId, userIds));
    expect(credentials.map((row) => row.userId)).toEqual([fixture.bystanderId]);
    const memberships = await database
      .select({ userId: businessMembership.userId })
      .from(businessMembership)
      .where(eq(businessMembership.businessId, fixture.businessId));
    expect(memberships.map((row) => row.userId)).toEqual([fixture.bystanderId]);
  });

  it("keeps the business the owner created, only dropping the link to the person", async () => {
    await retirePrivilegedDemoAccounts({ confirm: true, emails });

    const [kept] = await getDatabase()
      .select({
        tradingName: business.tradingName,
        createdByUserId: business.createdByUserId,
      })
      .from(business)
      .where(eq(business.id, fixture.businessId));
    expect(kept?.tradingName).toBe("Retire Fixture");
    expect(kept?.createdByUserId).toBeNull();
  });

  it("records the evidence in the audit log in the same change", async () => {
    await retirePrivilegedDemoAccounts({ confirm: true, emails });

    const [entry] = await getDatabase()
      .select({
        action: adminAuditLog.action,
        targetType: adminAuditLog.targetType,
        metadata: adminAuditLog.metadata,
      })
      .from(adminAuditLog)
      .where(eq(adminAuditLog.action, retirementAuditAction));
    expect(entry?.targetType).toBe("release");
    expect(entry?.metadata).toMatchObject({
      mode: "confirmed",
      remainingAfter: 0,
    });
    expect(
      (entry?.metadata as { found: unknown[] } | null)?.found,
    ).toHaveLength(2);
  });

  it("is safe to repeat once the identities are gone", async () => {
    await retirePrivilegedDemoAccounts({ confirm: true, emails });
    const again = await retirePrivilegedDemoAccounts({
      confirm: true,
      emails,
    });

    expect(again.found).toEqual([]);
    expect([...again.absent].sort()).toEqual([
      fixture.adminEmail,
      fixture.ownerEmail,
    ]);
    expect(await remainingEmails()).toEqual([fixture.bystanderEmail]);
  });

  it("refuses to retire the account named by ADMIN_EMAIL, changing nothing", async () => {
    await expect(
      retirePrivilegedDemoAccounts({
        confirm: true,
        emails,
        adminEmail: ` ${fixture.adminEmail.toUpperCase()} `,
      }),
    ).rejects.toThrow(/ADMIN_EMAIL/);

    expect(await remainingEmails()).toHaveLength(3);
  });
});
