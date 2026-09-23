import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import { businessLifecycle } from "@/lib/database/schema/business-operations";
import {
  configureLifecycleEmails,
  ensureBusinessLifecycle,
  getBusinessLifecycleView,
  runLifecycleAutomation,
} from "@/modules/businesses/lifecycle-automation";
import {
  applyUnsubscribe,
  createUnsubscribeToken,
} from "@/lib/notification-unsubscribe";

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  categoryId: "00000000-0000-4000-8000-000000002401",
  businessId: "00000000-0000-4000-8000-000000002402",
  ownerId: "00000000-0000-4000-8000-000000002403",
  residentId: "00000000-0000-4000-8000-000000002404",
} as const;

async function seedFixtureBusiness(createdAt: Date) {
  const database = getDatabase();
  await database.insert(category).values({
    id: fixture.categoryId,
    name: "Unsubscribe fixtures",
    slug: "unsubscribe-fixtures",
    description: "Fictional category used only by automated tests.",
  });
  await database.insert(business).values({
    id: fixture.businessId,
    tradingName: "Unsubscribe Fixture Business",
    slug: "unsubscribe-fixture-business",
    summary: "A fictional test business.",
    description: "A fictional test business used only by automated tests.",
    primaryCategoryId: fixture.categoryId,
    businessType: "service_area",
    status: "draft",
    createdByUserId: fixture.ownerId,
    createdAt,
  });
}

describeDatabase("notification unsubscribe", () => {
  beforeEach(async () => {
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.ownerId,
        name: "Unsubscribe Owner",
        email: "unsubscribe.owner@example.test",
        emailVerified: true,
      },
      {
        id: fixture.residentId,
        name: "Unsubscribe Resident",
        email: "unsubscribe.resident@example.test",
        emailVerified: true,
        savedEventCancellationEmails: true,
      },
    ]);
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.ownerId));
    await database.delete(user).where(eq(user.id, fixture.residentId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("turns off saved-event cancellation emails with a valid token", async () => {
    const token = createUnsubscribeToken(
      "saved_event_cancellation",
      fixture.residentId,
    );
    const result = await applyUnsubscribe(
      "saved_event_cancellation",
      fixture.residentId,
      token,
    );
    expect(result).toBe("unsubscribed");

    const [row] = await getDatabase()
      .select({ enabled: user.savedEventCancellationEmails })
      .from(user)
      .where(eq(user.id, fixture.residentId));
    expect(row?.enabled).toBe(false);
  });

  it("refuses a forged or tampered token and makes no change", async () => {
    const forgedToken = "0".repeat(64);
    const result = await applyUnsubscribe(
      "saved_event_cancellation",
      fixture.residentId,
      forgedToken,
    );
    expect(result).toBe("invalid");

    const [row] = await getDatabase()
      .select({ enabled: user.savedEventCancellationEmails })
      .from(user)
      .where(eq(user.id, fixture.residentId));
    expect(row?.enabled).toBe(true);
  });

  it("refuses a token whose subject does not match the category it was minted for", async () => {
    const token = createUnsubscribeToken(
      "business_lifecycle",
      fixture.residentId,
    );
    const result = await applyUnsubscribe(
      "saved_event_cancellation",
      fixture.residentId,
      token,
    );
    expect(result).toBe("invalid");
  });

  it("turns off business lifecycle emails, creating the lifecycle row if needed", async () => {
    await seedFixtureBusiness(new Date());

    const token = createUnsubscribeToken(
      "business_lifecycle",
      fixture.businessId,
    );
    const result = await applyUnsubscribe(
      "business_lifecycle",
      fixture.businessId,
      token,
    );
    expect(result).toBe("unsubscribed");

    const [row] = await getDatabase()
      .select({ enabled: businessLifecycle.lifecycleEmailsEnabled })
      .from(businessLifecycle)
      .where(eq(businessLifecycle.businessId, fixture.businessId));
    expect(row?.enabled).toBe(false);
  });

  it("lets a business owner re-enable lifecycle emails through the dashboard action", async () => {
    await seedFixtureBusiness(new Date());
    await ensureBusinessLifecycle(fixture.businessId);
    await configureLifecycleEmails({
      businessId: fixture.businessId,
      enabled: false,
    });

    let view = await getBusinessLifecycleView(fixture.businessId);
    expect(view?.lifecycleEmailsEnabled).toBe(false);

    await configureLifecycleEmails({
      businessId: fixture.businessId,
      enabled: true,
    });
    view = await getBusinessLifecycleView(fixture.businessId);
    expect(view?.lifecycleEmailsEnabled).toBe(true);
  });

  it("keeps advancing the lifecycle reminder state machine even when emails are suppressed", async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    await seedFixtureBusiness(threeDaysAgo);
    await ensureBusinessLifecycle(fixture.businessId);
    await configureLifecycleEmails({
      businessId: fixture.businessId,
      enabled: false,
    });

    await runLifecycleAutomation();

    const [row] = await getDatabase()
      .select({ dayTwoReminderSentAt: businessLifecycle.dayTwoReminderSentAt })
      .from(businessLifecycle)
      .where(eq(businessLifecycle.businessId, fixture.businessId));
    expect(row?.dayTwoReminderSentAt).not.toBeNull();
  });
});
