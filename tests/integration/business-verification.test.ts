import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import {
  expireVerificationChecks,
  listVerificationChecks,
  recordVerificationCheck,
  revokeVerificationCheck,
} from "@/modules/businesses/verification";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000931",
  businessId: "00000000-0000-4000-8000-000000000932",
  adminUserId: "00000000-0000-4000-8000-000000000933",
} as const;

async function summaryStatus(): Promise<string | undefined> {
  const [row] = await getDatabase()
    .select({ status: business.verificationSummaryStatus })
    .from(business)
    .where(eq(business.id, fixture.businessId));
  return row?.status;
}

const day = 24 * 60 * 60 * 1000;

describeDatabase("business verification checks", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture verification services",
      slug: "fixture-verification-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Verification Fixture Studio",
      slug: "verification-fixture-studio",
      summary: "A fictional business used only by verification tests.",
      description: "Fictional description.",
      primaryCategoryId: fixture.categoryId,
      businessType: "limited_company",
      status: "published",
    });
    await database.insert(user).values({
      id: fixture.adminUserId,
      name: "Fixture Admin",
      email: "admin@verification-fixture.test",
      emailVerified: true,
      role: "admin",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.adminUserId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const base = () => ({
    adminUserId: fixture.adminUserId,
    businessId: fixture.businessId,
    checkType: "companies_house",
    evidenceNote: "Company number matched the public register.",
    expiresAt: null,
  });

  it("starts unverified and becomes verified when a check is recorded", async () => {
    expect(await summaryStatus()).toBe("unverified");
    const result = await recordVerificationCheck(base());
    expect(result).toEqual({ status: "recorded", summary: "verified" });
    expect(await summaryStatus()).toBe("verified");
  });

  it("rejects unknown types, missing evidence and past expiry", async () => {
    expect(
      await recordVerificationCheck({ ...base(), checkType: "paid_plan" }),
    ).toEqual({ status: "invalid" });
    expect(
      await recordVerificationCheck({ ...base(), evidenceNote: "  " }),
    ).toEqual({ status: "invalid" });
    expect(
      await recordVerificationCheck({
        ...base(),
        expiresAt: new Date(Date.now() - day),
      }),
    ).toEqual({ status: "invalid" });
    expect(await summaryStatus()).toBe("unverified");
  });

  it("reports an unknown business as not found", async () => {
    expect(
      await recordVerificationCheck({
        ...base(),
        businessId: "00000000-0000-4000-8000-000000000999",
      }),
    ).toEqual({ status: "not_found" });
  });

  it("supersedes an earlier check of the same type", async () => {
    await recordVerificationCheck(base());
    await recordVerificationCheck(base());
    const checks = await listVerificationChecks(fixture.businessId);
    expect(checks.filter((check) => check.status === "active")).toHaveLength(1);
    expect(checks.filter((check) => check.status === "revoked")).toHaveLength(
      1,
    );
  });

  it("reverts to unverified once the only check is revoked", async () => {
    await recordVerificationCheck(base());
    const [check] = await listVerificationChecks(fixture.businessId);
    expect(
      await revokeVerificationCheck({
        adminUserId: fixture.adminUserId,
        checkId: check!.id,
        reason: "Company struck off the register.",
      }),
    ).toMatchObject({ status: "revoked", summary: "unverified" });
    expect(await summaryStatus()).toBe("unverified");
    expect(
      await revokeVerificationCheck({
        adminUserId: fixture.adminUserId,
        checkId: check!.id,
        reason: "Revoking again should not work.",
      }),
    ).toEqual({ status: "not_found" });
    expect(
      await revokeVerificationCheck({
        adminUserId: fixture.adminUserId,
        checkId: check!.id,
        reason: "x",
      }),
    ).toEqual({ status: "invalid" });
  });

  it("stays verified while another check remains active", async () => {
    await recordVerificationCheck(base());
    await recordVerificationCheck({ ...base(), checkType: "premises" });
    const checks = await listVerificationChecks(fixture.businessId);
    const companies = checks.find((c) => c.checkType === "companies_house");
    const result = await revokeVerificationCheck({
      adminUserId: fixture.adminUserId,
      checkId: companies!.id,
      reason: "Details changed and need rechecking.",
    });
    expect(result).toMatchObject({ summary: "verified" });
  });

  it("downgrades a business whose only check has expired", async () => {
    const soon = new Date(Date.now() + day);
    await recordVerificationCheck({ ...base(), expiresAt: soon });
    expect(await summaryStatus()).toBe("verified");

    expect(await expireVerificationChecks(new Date(Date.now()))).toEqual({
      downgraded: 0,
    });
    expect(
      await expireVerificationChecks(new Date(soon.getTime() + day)),
    ).toEqual({ downgraded: 1 });
    expect(await summaryStatus()).toBe("unverified");
    const [check] = await listVerificationChecks(
      fixture.businessId,
      new Date(soon.getTime() + day),
    );
    expect(check?.expired).toBe(true);
  });
});
