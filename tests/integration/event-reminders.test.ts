import { eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { closeDatabase, getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business, category } from "@/lib/database/schema/business";
import { businessEvent } from "@/lib/database/schema/business-operations";
import { savedEvent } from "@/lib/database/schema/saved-discovery";
import {
  applyUnsubscribe,
  createUnsubscribeToken,
} from "@/lib/notification-unsubscribe";
import { runEventReminders } from "@/modules/residents/event-reminders";

const sent = vi.hoisted(() => [] as Array<{ to: string; text: string }>);
vi.mock("@/lib/email", () => ({
  sendTransactionalEmail: async (message: { to: string; text: string }) => {
    sent.push(message);
  },
}));

const hasDatabase = Boolean(process.env.TEST_DATABASE_URL);
const describeDatabase = hasDatabase ? describe : describe.skip;

const fixture = {
  optedInId: "00000000-0000-4000-8000-000000004101",
  optedOutId: "00000000-0000-4000-8000-000000004102",
  categoryId: "00000000-0000-4000-8000-000000004103",
  businessId: "00000000-0000-4000-8000-000000004104",
  soonEventId: "00000000-0000-4000-8000-000000004105",
  laterEventId: "00000000-0000-4000-8000-000000004106",
  pastEventId: "00000000-0000-4000-8000-000000004107",
  hiddenEventId: "00000000-0000-4000-8000-000000004108",
} as const;

const now = new Date("2026-09-28T08:00:00.000Z");
const hoursFromNow = (hours: number) =>
  new Date(now.getTime() + hours * 3_600_000);

describeDatabase("saved-event reminders", () => {
  beforeEach(async () => {
    sent.length = 0;
    const database = getDatabase();
    await database.insert(user).values([
      {
        id: fixture.optedInId,
        name: "Reminder Resident",
        email: "reminder.in@example.test",
        emailVerified: true,
        savedEventReminderEmails: true,
      },
      {
        id: fixture.optedOutId,
        name: "Quiet Resident",
        email: "reminder.out@example.test",
        emailVerified: true,
      },
    ]);
    await database.insert(category).values({
      id: fixture.categoryId,
      name: "Reminder fixture services",
      slug: "reminder-fixture-services",
      description: "Fictional category used only by automated tests.",
    });
    await database.insert(business).values({
      id: fixture.businessId,
      tradingName: "Reminder Fixture Hall",
      slug: "reminder-fixture-hall",
      summary: "A fictional business for reminder tests.",
      description: "Fictional.",
      primaryCategoryId: fixture.categoryId,
      businessType: "limited_company",
      status: "published",
    });
    const event = (
      id: string,
      title: string,
      hours: number,
      status: string,
    ) => ({
      id,
      businessId: fixture.businessId,
      title,
      description: "Fictional event.",
      startsAt: hoursFromNow(hours),
      status,
    });
    await database
      .insert(businessEvent)
      .values([
        event(fixture.soonEventId, "Reminder Fixture Quiz", 10, "active"),
        event(fixture.laterEventId, "Reminder Fixture Fair", 72, "active"),
        event(fixture.pastEventId, "Reminder Fixture Past", -2, "active"),
        event(fixture.hiddenEventId, "Reminder Fixture Cancelled", 5, "hidden"),
      ]);
    const eventIds = [
      fixture.soonEventId,
      fixture.laterEventId,
      fixture.pastEventId,
      fixture.hiddenEventId,
    ];
    await database
      .insert(savedEvent)
      .values(
        [fixture.optedInId, fixture.optedOutId].flatMap((userId) =>
          eventIds.map((eventId) => ({ userId, eventId })),
        ),
      );
  });

  afterEach(async () => {
    const database = getDatabase();
    await database.delete(business).where(eq(business.id, fixture.businessId));
    await database.delete(category).where(eq(category.id, fixture.categoryId));
    await database.delete(user).where(eq(user.id, fixture.optedInId));
    await database.delete(user).where(eq(user.id, fixture.optedOutId));
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("emails an opted-in resident only about active events starting within a day", async () => {
    const result = await runEventReminders(now);

    expect(result).toEqual({ recipients: 1, sent: 1, failed: 0 });
    expect(sent).toHaveLength(1);
    const message = sent[0]!;
    expect(message.to).toBe("reminder.in@example.test");
    expect(message.text).toContain("Reminder Fixture Quiz");
    expect(message.text).toContain(`/events/${fixture.soonEventId}`);
    expect(message.text).not.toContain("Reminder Fixture Fair");
    expect(message.text).not.toContain("Reminder Fixture Past");
    expect(message.text).not.toContain("Reminder Fixture Cancelled");
    expect(message.text).toContain("/unsubscribe/saved_event_reminder/");
  });

  it("never reminds the same saved event twice", async () => {
    await runEventReminders(now);
    sent.length = 0;
    await runEventReminders(hoursFromNow(1));
    expect(sent).toHaveLength(0);
  });

  it("reminds about a later event once it enters the window", async () => {
    await runEventReminders(now);
    sent.length = 0;
    await runEventReminders(hoursFromNow(60));
    expect(sent).toHaveLength(1);
    expect(sent[0]!.text).toContain("Reminder Fixture Fair");
  });

  it("does not remind about events of suspended businesses or banned residents", async () => {
    const database = getDatabase();
    await database
      .update(business)
      .set({ suspendedAt: now })
      .where(eq(business.id, fixture.businessId));
    expect((await runEventReminders(now)).sent).toBe(0);
    await database
      .update(business)
      .set({ suspendedAt: null })
      .where(eq(business.id, fixture.businessId));
    await database
      .update(user)
      .set({ banned: true })
      .where(eq(user.id, fixture.optedInId));
    expect((await runEventReminders(now)).sent).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("stops after the resident unsubscribes with a valid token", async () => {
    const token = createUnsubscribeToken(
      "saved_event_reminder",
      fixture.optedInId,
    );
    expect(
      await applyUnsubscribe("saved_event_reminder", fixture.optedInId, token),
    ).toBe("unsubscribed");
    await runEventReminders(now);
    expect(sent).toHaveLength(0);
  });

  it("rejects an unsubscribe with a token from another category", async () => {
    const token = createUnsubscribeToken(
      "saved_place_digest",
      fixture.optedInId,
    );
    expect(
      await applyUnsubscribe("saved_event_reminder", fixture.optedInId, token),
    ).toBe("invalid");
  });
});
