import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import {
  business,
  businessMembership,
  category,
} from "@/lib/database/schema/business";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import {
  readOnboardingDraftForUser,
  saveOnboardingDraftForUser,
} from "@/modules/businesses/onboarding-draft-access";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000721",
  businessId: "00000000-0000-4000-8000-000000000722",
  otherBusinessId: "00000000-0000-4000-8000-000000000723",
  editorUserId: "00000000-0000-4000-8000-000000000724",
  viewerUserId: "00000000-0000-4000-8000-000000000725",
  outsiderUserId: "00000000-0000-4000-8000-000000000726",
  editorMembershipId: "00000000-0000-4000-8000-000000000727",
  viewerMembershipId: "00000000-0000-4000-8000-000000000728",
} as const;

const profile = {
  tradingName: "Cwm Access Test Studio",
  summary: "A fictional business profile used only by access-policy tests.",
  publicPhone: null,
  publicEmail: null,
};

describeDatabase("onboarding draft access policy", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture access services",
      slug: "fixture-onboarding-access-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values([
      {
        id: fixture.businessId,
        tradingName: "Cwm Access Test Studio",
        slug: "cwm-access-test-studio-fixture",
        summary: "Fictional summary.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "limited_company",
      },
      {
        id: fixture.otherBusinessId,
        tradingName: "Other Tenant Fixture",
        slug: "other-tenant-fixture",
        summary: "Fictional summary.",
        description: "Fictional business used only by automated tests.",
        primaryCategoryId: fixture.categoryId,
        businessType: "limited_company",
      },
    ]);
    await database.insert(user).values([
      {
        id: fixture.editorUserId,
        name: "Fixture Editor",
        email: "editor@access-fixture.test",
        emailVerified: true,
      },
      {
        id: fixture.viewerUserId,
        name: "Fixture Viewer",
        email: "viewer@access-fixture.test",
        emailVerified: true,
      },
      {
        id: fixture.outsiderUserId,
        name: "Fixture Outsider",
        email: "outsider@access-fixture.test",
        emailVerified: true,
      },
    ]);
    await database.insert(businessMembership).values([
      {
        id: fixture.editorMembershipId,
        businessId: fixture.businessId,
        userId: fixture.editorUserId,
        role: "editor",
        permissions: ["business.view", "business.edit_profile"],
        status: "active",
      },
      {
        id: fixture.viewerMembershipId,
        businessId: fixture.businessId,
        userId: fixture.viewerUserId,
        role: "viewer",
        permissions: ["business.view"],
        status: "active",
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(businessOnboardingDraft)
      .where(eq(businessOnboardingDraft.businessId, fixture.businessId));
    await database
      .delete(businessMembership)
      .where(eq(businessMembership.businessId, fixture.businessId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database
      .delete(business)
      .where(eq(business.id, fixture.otherBusinessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    for (const userId of [
      fixture.editorUserId,
      fixture.viewerUserId,
      fixture.outsiderUserId,
    ]) {
      await database.delete(user).where(eq(user.id, userId));
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("allows an editor membership to save a draft section", async () => {
    const result = await saveOnboardingDraftForUser({
      userId: fixture.editorUserId,
      businessId: fixture.businessId,
      expectedVersion: 0,
      profile,
    });

    expect(result.status).toBe("saved");
    if (result.status !== "saved") throw new Error("Expected saved result");
    expect(result.draft.version).toBe(1);
  });

  it("denies a viewer membership from saving while allowing reads", async () => {
    const write = await saveOnboardingDraftForUser({
      userId: fixture.viewerUserId,
      businessId: fixture.businessId,
      expectedVersion: 0,
      profile,
    });
    expect(write).toEqual({ status: "forbidden" });

    const read = await readOnboardingDraftForUser({
      userId: fixture.viewerUserId,
      businessId: fixture.businessId,
    });
    expect(read.status).toBe("ready");
  });

  it("denies users without membership for both read and write", async () => {
    await expect(
      saveOnboardingDraftForUser({
        userId: fixture.outsiderUserId,
        businessId: fixture.businessId,
        expectedVersion: 0,
        profile,
      }),
    ).resolves.toEqual({ status: "forbidden" });

    await expect(
      readOnboardingDraftForUser({
        userId: fixture.outsiderUserId,
        businessId: fixture.businessId,
      }),
    ).resolves.toEqual({ status: "forbidden" });
  });

  it("denies cross-tenant writes for a membership of another business", async () => {
    await expect(
      saveOnboardingDraftForUser({
        userId: fixture.editorUserId,
        businessId: fixture.otherBusinessId,
        expectedVersion: 0,
        profile,
      }),
    ).resolves.toEqual({ status: "forbidden" });
  });

  it("propagates optimistic-concurrency conflicts to authorised editors", async () => {
    const first = await saveOnboardingDraftForUser({
      userId: fixture.editorUserId,
      businessId: fixture.businessId,
      expectedVersion: 0,
      profile,
    });
    expect(first.status).toBe("saved");

    const stale = await saveOnboardingDraftForUser({
      userId: fixture.editorUserId,
      businessId: fixture.businessId,
      expectedVersion: 0,
      profile: { ...profile, tradingName: "Stale write" },
    });
    expect(stale).toEqual({ status: "conflict", currentVersion: 1 });
  });
});
