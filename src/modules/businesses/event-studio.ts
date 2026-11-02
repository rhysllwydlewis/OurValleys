import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessEvent } from "@/lib/database/schema/business-operations";
import { savedEvent } from "@/lib/database/schema/saved-discovery";
import { generateEventOccurrences } from "@/modules/events/recurrence";
import { notifyCancelledEventSaves } from "./content-features";
import {
  isOwnContentImage,
  loadContentImages,
  releaseContentImageIfUnused,
  type ContentImageView,
} from "./content-images";
import {
  actionsFor,
  copyDates,
  duplicateTitle,
  eventLimits,
  eventListedUntil,
  eventReadiness,
  eventState,
  isPostponeDays,
  shiftLondonDays,
  type ParsedEventForm,
  type QuickAction,
  type StudioEvent,
} from "./event-studio-model";

export type StudioEventRow = StudioEvent & {
  image: ContentImageView | null;
  /** Sent back with an edit so a stale form is noticed rather than saved over. */
  updatedAt: Date;
};

export type StudioEventsResult =
  | { status: "ok"; events: StudioEventRow[]; takenDown: number }
  | { status: "unavailable" };

const lockKey = (businessId: string) =>
  sql`select pg_advisory_xact_lock(hashtext(${`${businessId}:events`}))`;

/**
 * Every event of one business except administrator takedowns (counted
 * separately so the owner is told), with a plain "unavailable" when the read
 * fails so the studio never mistakes an outage for "no events yet".
 */
export async function listStudioEvents(
  businessId: string,
): Promise<StudioEventsResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select()
      .from(businessEvent)
      .where(eq(businessEvent.businessId, businessId))
      .orderBy(asc(businessEvent.startsAt))
      .limit(eventLimits.maxEvents + 100);
    const live = rows.filter((row) => row.status !== "removed");
    const images = await loadContentImages(live.map((r) => r.imageMediaId));
    return {
      status: "ok",
      takenDown: rows.length - live.length,
      events: live.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        locationDisplay: row.locationDisplay,
        bookingUrl: row.bookingUrl,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        status: row.status,
        seriesId: row.seriesId,
        updatedAt: row.updatedAt,
        image: (row.imageMediaId && images.get(row.imageMediaId)) || null,
        hasImage: Boolean(row.imageMediaId && images.get(row.imageMediaId)),
      })),
    };
  } catch {
    return { status: "unavailable" };
  }
}

export type SaveStudioEventResult =
  | "saved"
  | "not_found"
  | "locked"
  | "stale"
  | "limit"
  | "invalid"
  | "unavailable";

/**
 * Creates (one date or a repeating series) or edits one date from an
 * already-validated form. `imageMediaId` is `undefined` to leave the picture
 * alone, `null` to remove it, or the id of a picture just uploaded for this
 * business. An edit carries the `updatedAt` the form was built from; if
 * someone else saved since, nothing is overwritten. With `applyToSeries` the
 * wording fields (not dates, status or picture) are copied to the series'
 * other upcoming dates that the owner still manages.
 */
export async function saveStudioEvent(input: {
  businessId: string;
  eventId?: string;
  expectedUpdatedAt?: number;
  event: Extract<ParsedEventForm, { ok: true }>["event"];
  imageMediaId?: string | null;
  now?: Date;
}): Promise<SaveStudioEventResult> {
  const now = input.now ?? new Date();
  if (
    input.imageMediaId &&
    !(await isOwnContentImage({
      businessId: input.businessId,
      kind: "event",
      mediaId: input.imageMediaId,
    }))
  ) {
    return "invalid";
  }
  const imageChange =
    input.imageMediaId === undefined
      ? {}
      : { imageMediaId: input.imageMediaId };
  const wording = {
    title: input.event.title,
    description: input.event.description,
    locationDisplay: input.event.locationDisplay,
    bookingUrl: input.event.bookingUrl,
  };
  const startsAt = new Date(input.event.startsAt);
  const endsAt = input.event.endsAt ? new Date(input.event.endsAt) : null;
  try {
    const database = getDatabase();
    const outcome = await database.transaction(async (transaction) => {
      // One writer per business at a time keeps the event cap exact.
      await transaction.execute(lockKey(input.businessId));
      if (!input.eventId) {
        const [counted] = await transaction
          .select({ count: sql<number>`count(*)::int` })
          .from(businessEvent)
          .where(eq(businessEvent.businessId, input.businessId));
        const occurrences = generateEventOccurrences({
          startsAt,
          endsAt,
          frequency: input.event.repeat?.frequency ?? "weekly",
          count: input.event.repeat?.occurrences ?? 1,
        });
        if (
          (counted?.count ?? 0) + occurrences.length >
          eventLimits.maxEvents
        ) {
          return { result: "limit" as const };
        }
        const seriesId = input.event.repeat ? randomUUID() : null;
        await transaction.insert(businessEvent).values(
          occurrences.map((occurrence) => ({
            businessId: input.businessId,
            ...wording,
            startsAt: occurrence.startsAt,
            endsAt: occurrence.endsAt,
            status: input.event.status,
            imageMediaId: input.imageMediaId ?? null,
            seriesId,
          })),
        );
        return { result: "saved" as const };
      }
      const [previous] = await transaction
        .select({
          imageMediaId: businessEvent.imageMediaId,
          updatedAt: businessEvent.updatedAt,
          status: businessEvent.status,
          seriesId: businessEvent.seriesId,
          startsAt: businessEvent.startsAt,
          endsAt: businessEvent.endsAt,
        })
        .from(businessEvent)
        .where(
          and(
            eq(businessEvent.id, input.eventId),
            eq(businessEvent.businessId, input.businessId),
          ),
        )
        .for("update");
      if (!previous) return { result: "not_found" as const };
      // An administrator took this event down; owners cannot undo that.
      if (previous.status === "removed") return { result: "locked" as const };
      if (
        input.expectedUpdatedAt !== undefined &&
        previous.updatedAt.getTime() !== input.expectedUpdatedAt
      ) {
        return { result: "stale" as const };
      }
      await transaction
        .update(businessEvent)
        .set({
          ...wording,
          startsAt,
          endsAt,
          status: input.event.status,
          ...imageChange,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(businessEvent.id, input.eventId),
            eq(businessEvent.businessId, input.businessId),
          ),
        );
      if (previous.startsAt.getTime() !== startsAt.getTime()) {
        await transaction
          .update(savedEvent)
          .set({ reminderSentAt: null })
          .where(eq(savedEvent.eventId, input.eventId));
      }
      if (input.event.applyToSeries && previous.seriesId) {
        await transaction
          .update(businessEvent)
          .set({ ...wording, updatedAt: sql`now()` })
          .where(
            and(
              eq(businessEvent.seriesId, previous.seriesId),
              eq(businessEvent.businessId, input.businessId),
              ne(businessEvent.id, input.eventId),
              inArray(businessEvent.status, ["draft", "active", "hidden"]),
              gte(businessEvent.startsAt, now),
            ),
          );
      }
      return {
        result: "saved" as const,
        // Only a published event that has not finished leaves savers
        // expecting it; a draft, a paused or a finished one does not.
        justCancelled:
          previous.status === "active" &&
          input.event.status === "cancelled" &&
          eventListedUntil(previous).getTime() > now.getTime(),
        replacedImageMediaId:
          input.imageMediaId !== undefined &&
          previous.imageMediaId !== input.imageMediaId
            ? previous.imageMediaId
            : null,
      };
    });
    if (outcome.result === "saved" && "replacedImageMediaId" in outcome) {
      await releaseContentImageIfUnused({
        businessId: input.businessId,
        mediaId: outcome.replacedImageMediaId,
      });
      if (outcome.justCancelled && input.eventId) {
        await notifyCancelledEventSaves({
          businessId: input.businessId,
          eventId: input.eventId,
          eventTitle: input.event.title,
        }).catch(() => undefined);
      }
    }
    return outcome.result;
  } catch {
    return "unavailable";
  }
}

export type QuickActionResult =
  | "done"
  | "not_found"
  | "locked"
  | "not_allowed"
  | "not_ready"
  | "already_over"
  | "limit"
  | "invalid"
  | "unavailable";

/**
 * One state change on one event, decided against the row as it is in the
 * database (locked), not as the page last showed it: a stale button cannot
 * resurrect a finished event or cancel one that has just been removed.
 */
export async function applyEventQuickAction(input: {
  businessId: string;
  eventId: string;
  action: QuickAction;
  /** For `postpone`. */
  days?: number;
  /** Appended to a copy's title, in the owner's language. */
  copySuffix?: string;
  now?: Date;
}): Promise<QuickActionResult> {
  const now = input.now ?? new Date();
  if (input.action === "postpone" && !isPostponeDays(input.days ?? 0)) {
    return "invalid";
  }
  let cancelledTitle: string | null = null;
  try {
    const database = getDatabase();
    const result = await database.transaction(async (transaction) => {
      await transaction.execute(lockKey(input.businessId));
      const [row] = await transaction
        .select()
        .from(businessEvent)
        .where(
          and(
            eq(businessEvent.id, input.eventId),
            eq(businessEvent.businessId, input.businessId),
          ),
        )
        .for("update");
      if (!row) return "not_found" as const;
      if (row.status === "removed") return "locked" as const;
      const current: StudioEvent = {
        id: row.id,
        title: row.title,
        description: row.description,
        locationDisplay: row.locationDisplay,
        bookingUrl: row.bookingUrl,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        status: row.status,
        seriesId: row.seriesId,
        hasImage: Boolean(row.imageMediaId),
      };
      const state = eventState(current, now);
      if (!actionsFor(state).includes(input.action)) {
        return state === "past" && input.action !== "duplicate"
          ? ("already_over" as const)
          : ("not_allowed" as const);
      }
      const where = and(
        eq(businessEvent.id, input.eventId),
        eq(businessEvent.businessId, input.businessId),
      );
      const touch = { updatedAt: sql`now()` };
      switch (input.action) {
        case "publish":
        case "resume": {
          const readiness = eventReadiness(current, now);
          if (readiness.missing.includes("future")) {
            return "already_over" as const;
          }
          if (!readiness.ready) return "not_ready" as const;
          await transaction
            .update(businessEvent)
            .set({ status: "active", ...touch })
            .where(where);
          return "done" as const;
        }
        case "pause":
          await transaction
            .update(businessEvent)
            .set({ status: "hidden", ...touch })
            .where(where);
          return "done" as const;
        case "cancel":
          await transaction
            .update(businessEvent)
            .set({ status: "cancelled", ...touch })
            .where(where);
          cancelledTitle = row.title;
          return "done" as const;
        case "reopen": {
          // Back to a draft, never straight to live: the owner re-checks the
          // date first (and savers were already told it was cancelled).
          await transaction
            .update(businessEvent)
            .set({ status: "draft", ...touch })
            .where(where);
          return "done" as const;
        }
        case "postpone": {
          const start = shiftLondonDays(row.startsAt, input.days ?? 0);
          const end = row.endsAt
            ? shiftLondonDays(row.endsAt, input.days ?? 0)
            : null;
          if (!start || (row.endsAt && !end)) return "invalid" as const;
          await transaction
            .update(businessEvent)
            .set({ startsAt: start, endsAt: end, ...touch })
            .where(where);
          // A reminder already sent for the old date must not stop one being
          // sent for the new date.
          await transaction
            .update(savedEvent)
            .set({ reminderSentAt: null })
            .where(eq(savedEvent.eventId, input.eventId));
          return "done" as const;
        }
        case "duplicate": {
          const [counted] = await transaction
            .select({ count: sql<number>`count(*)::int` })
            .from(businessEvent)
            .where(eq(businessEvent.businessId, input.businessId));
          if ((counted?.count ?? 0) >= eventLimits.maxEvents) {
            return "limit" as const;
          }
          const dates = copyDates(
            { startsAt: row.startsAt, endsAt: row.endsAt },
            now,
          );
          await transaction.insert(businessEvent).values({
            businessId: input.businessId,
            title: duplicateTitle(row.title, input.copySuffix ?? "(copy)"),
            description: row.description,
            locationDisplay: row.locationDisplay,
            bookingUrl: row.bookingUrl,
            // The picture row is shared; it is only retired when nothing
            // uses it any more.
            imageMediaId: row.imageMediaId,
            startsAt: dates.startsAt,
            endsAt: dates.endsAt,
            // A copy never goes live by accident.
            status: "draft",
            seriesId: null,
          });
          return "done" as const;
        }
      }
    });
    if (result === "done" && cancelledTitle !== null) {
      await notifyCancelledEventSaves({
        businessId: input.businessId,
        eventId: input.eventId,
        eventTitle: cancelledTitle,
      }).catch(() => undefined);
    }
    return result;
  } catch {
    return "unavailable";
  }
}

/**
 * A cheap check before the picture is touched: a refused (stale or missing)
 * edit must not first change the shared picture's description. The save still
 * re-checks under the row lock.
 */
export async function checkEventCurrent(input: {
  businessId: string;
  eventId: string;
  expectedUpdatedAt: number | undefined;
}): Promise<
  | { result: "ok"; status: string; endsAt: Date | null; startsAt: Date }
  | { result: "stale" | "not_found" | "locked" | "unavailable" }
> {
  try {
    const [row] = await getDatabase()
      .select({
        updatedAt: businessEvent.updatedAt,
        status: businessEvent.status,
        startsAt: businessEvent.startsAt,
        endsAt: businessEvent.endsAt,
      })
      .from(businessEvent)
      .where(
        and(
          eq(businessEvent.id, input.eventId),
          eq(businessEvent.businessId, input.businessId),
        ),
      );
    if (!row) return { result: "not_found" };
    if (row.status === "removed") return { result: "locked" };
    if (
      input.expectedUpdatedAt !== undefined &&
      row.updatedAt.getTime() !== input.expectedUpdatedAt
    ) {
      return { result: "stale" };
    }
    return {
      result: "ok",
      status: row.status,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
    };
  } catch {
    return { result: "unavailable" };
  }
}
