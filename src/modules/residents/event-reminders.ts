import "server-only";
import { and, asc, eq, gt, inArray, isNull, lte } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business } from "@/lib/database/schema/business";
import { businessEvent } from "@/lib/database/schema/business-operations";
import { savedEvent } from "@/lib/database/schema/saved-discovery";
import { sendTransactionalEmail } from "@/lib/email";
import { buildUnsubscribeUrl } from "@/lib/notification-unsubscribe";
import { getSiteUrl } from "@/lib/site";

const HOUR_MS = 3_600_000;

/** Events starting within this window from the run time are reminded. */
export const EVENT_REMINDER_WINDOW_HOURS = 24;
const MAX_EVENTS_PER_EMAIL = 10;

export type ReminderEvent = {
  id: string;
  title: string;
  businessName: string;
  startsAt: Date;
};

const reminderDateFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Europe/London",
});

/**
 * Plain-text body only: public event titles, times and links plus the
 * one-click unsubscribe link. No personal or enquiry data.
 */
export function composeEventReminderEmail(
  events: ReminderEvent[],
  unsubscribeUrl: string,
  siteUrl: URL = getSiteUrl(),
): { subject: string; text: string } {
  const lines: string[] = ["Coming up soon from the events you saved.", ""];
  for (const item of events) {
    lines.push(
      `- ${item.title}, ${reminderDateFormat.format(item.startsAt)} — ${item.businessName}: ${new URL(`/events/${item.id}`, siteUrl).toString()}`,
    );
  }
  lines.push(
    "",
    "You are receiving this because you turned on saved-event reminders in your account settings.",
    `Stop these emails: ${unsubscribeUrl}`,
  );
  return {
    subject:
      events.length === 1
        ? `Reminder: ${events[0]!.title}`
        : `${events.length} events you saved are coming up`,
    text: lines.join("\n"),
  };
}

export type EventReminderResult = {
  recipients: number;
  sent: number;
  failed: number;
};

/**
 * Sends one reminder email per opted-in resident covering their saved,
 * active, published events that start within the next day and have not been
 * reminded yet. Safe to run repeatedly: each saved event is marked reminded
 * only after the email for it is delivered, so a failed send is retried on
 * the next run and an event is never reminded twice. Cancelled events,
 * suspended or unpublished businesses and unverified or banned recipients
 * are excluded.
 */
export async function runEventReminders(
  now = new Date(),
): Promise<EventReminderResult> {
  const database = getDatabase();
  const result: EventReminderResult = { recipients: 0, sent: 0, failed: 0 };
  const windowEnd = new Date(
    now.getTime() + EVENT_REMINDER_WINDOW_HOURS * HOUR_MS,
  );

  const rows = await database
    .select({
      userId: user.id,
      email: user.email,
      eventId: businessEvent.id,
      title: businessEvent.title,
      startsAt: businessEvent.startsAt,
      businessName: business.tradingName,
    })
    .from(savedEvent)
    .innerJoin(user, eq(user.id, savedEvent.userId))
    .innerJoin(businessEvent, eq(businessEvent.id, savedEvent.eventId))
    .innerJoin(business, eq(business.id, businessEvent.businessId))
    .where(
      and(
        isNull(savedEvent.reminderSentAt),
        eq(user.savedEventReminderEmails, true),
        eq(user.emailVerified, true),
        eq(user.banned, false),
        eq(businessEvent.status, "active"),
        gt(businessEvent.startsAt, now),
        lte(businessEvent.startsAt, windowEnd),
        eq(business.status, "published"),
        eq(business.isDemo, false),
        isNull(business.suspendedAt),
      ),
    )
    .orderBy(asc(businessEvent.startsAt));

  const byUser = new Map<string, { email: string; events: ReminderEvent[] }>();
  for (const row of rows) {
    const entry = byUser.get(row.userId) ?? { email: row.email, events: [] };
    if (entry.events.length < MAX_EVENTS_PER_EMAIL) {
      entry.events.push({
        id: row.eventId,
        title: row.title,
        businessName: row.businessName,
        startsAt: row.startsAt,
      });
    }
    byUser.set(row.userId, entry);
  }
  result.recipients = byUser.size;

  for (const [userId, entry] of byUser) {
    try {
      await sendTransactionalEmail({
        category: "event_reminder",
        to: entry.email,
        ...composeEventReminderEmail(
          entry.events,
          buildUnsubscribeUrl("saved_event_reminder", userId),
        ),
      });
      await database
        .update(savedEvent)
        .set({ reminderSentAt: now })
        .where(
          and(
            eq(savedEvent.userId, userId),
            inArray(
              savedEvent.eventId,
              entry.events.map((event) => event.id),
            ),
          ),
        );
      result.sent += 1;
    } catch {
      result.failed += 1;
    }
  }

  return result;
}
