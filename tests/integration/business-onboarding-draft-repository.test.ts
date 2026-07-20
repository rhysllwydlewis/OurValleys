import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { business, category } from "@/lib/database/schema/business";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import {
  getBusinessOnboardingDraft,
  savePersistedBusinessOnboardingDraft,
} from "@/modules/businesses/onboarding-draft-repository";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000000701",
  businessId: "00000000-0000-4000-8000-000000000702",
  missingBusinessId: "00000000-0000-4000-8000-000000000799",
} as const;

const profile = {
  tradingName: "Cwm Test Studio",
  summary: "A fictional business profile used only by automated tests.",
  publicPhone: "01443 000 000",
  publicEmail: "HELLO@EXAMPLE.TEST",
};

describeDatabase("business onboarding draft repository", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Fixture services",
      slug: "fixture-onboarding-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Cwm Test Studio",
      slug: "cwm-test-studio-onboarding-fixture",
      summary: "Fictional summary.",
      description: "Fictional business used only by automated tests.",
      primaryCategoryId: fixture.categoryId,
      businessType: "limited_company",
    });
  });

  afterEach(async () => {
    const database = getDatabase();
    await database
      .delete(businessOnboardingDraft)
      .where(eq(businessOnboardingDraft.businessId, fixture.businessId));
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("creates and persists a validated draft", async () => {
    const result = await savePersistedBusinessOnboardingDraft({
      businessId: fixture.businessId,
      expectedVersion: 0,
      profile,
    });

    expect(result.status).toBe("saved");
    if (result.status !== "saved") throw new Error("Expected saved result");
    expect(result.draft.version).toBe(1);
    expect(result.draft.profile?.publicEmail).toBe("hello@example.test");

    await expect(getBusinessOnboardingDraft(fixture.businessId)).resolves.toMatchObject({
      businessId: fixture.businessId,
      version: 1,
      profile: { tradingName: "Cwm Test Studio" },
    });
  });

  it("rejects a stale concurrent write without overwriting newer data", async () => {
    const first = await savePersistedBusinessOnboardingDraft({
      businessId: fixture.businessId,
      expectedVersion: 0,
      profile,
    });
    expect(first.status).toBe("saved");

    const stale = await savePersistedBusinessOnboardingDraft({
      businessId: fixture.businessId,
      expectedVersion: 0,
      profile: { ...profile, tradingName: "Stale overwrite" },
    });

    expect(stale).toEqual({ status: "conflict", currentVersion: 1 });
    await expect(getBusinessOnboardingDraft(fixture.businessId)).resolves.toMatchObject({
      version: 1,
      profile: { tradingName: "Cwm Test Studio" },
    });
  });

  it("does not persist invalid profile data", async () => {
    const result = await savePersistedBusinessOnboardingDraft({
      businessId: fixture.businessId,
      expectedVersion: 0,
      profile: { ...profile, summary: "Too short" },
    });

    expect(result.status).toBe("invalid");
    await expect(getBusinessOnboardingDraft(fixture.businessId)).resolves.toMatchObject({
      version: 0,
      profile: null,
    });
  });

  it("fails closed when the canonical business does not exist", async () => {
    await expect(
      savePersistedBusinessOnboardingDraft({
        businessId: fixture.missingBusinessId,
        expectedVersion: 0,
        profile,
      }),
    ).resolves.toEqual({ status: "missing" });
  });
});
