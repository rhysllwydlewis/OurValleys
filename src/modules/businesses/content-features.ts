import "server-only";
import { randomUUID } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { user } from "@/lib/database/schema/auth";
import { business } from "@/lib/database/schema/business";
import {
  businessCategorySection,
  businessDocument,
  businessEvent,
  businessMenuGroup,
  businessMenuItem,
  businessOffer,
} from "@/lib/database/schema/business-operations";
import {
  isOwnContentImage,
  loadContentImages,
  releaseContentImageIfUnused,
  type ContentImageView,
} from "./content-images";
import {
  MAX_EVENT_OCCURRENCES,
  eventRepeatFrequencies,
  generateEventOccurrences,
} from "@/modules/events/recurrence";
import { savedEvent } from "@/lib/database/schema/saved-discovery";
import { sendTransactionalEmail } from "@/lib/email";
import {
  moveId,
  normaliseDietaryLabels,
  normalisePrice,
  type MoveDirection,
  type ParsedMenuGroup,
} from "./menu-model";
import {
  isMediaStorageConfigured,
  publicMediaUrl,
  putMediaObject,
} from "@/lib/media-storage";
import {
  deleteStoredObjectOrQueue,
  enqueueStorageCleanup,
  processStorageCleanup,
} from "@/lib/storage-cleanup";
import { buildUnsubscribeUrl } from "@/lib/notification-unsubscribe";
import { inspectImageUpload } from "./media-validation";

const safeHttpUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter an http or https URL.");
const optionalUrl = z.union([safeHttpUrl, z.literal(""), z.null()]);
const optionalDate = z.union([z.iso.datetime(), z.literal(""), z.null()]);

const offerSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().min(5).max(1000),
    terms: z.string().trim().max(1000).nullable().optional(),
    actionLabel: z.string().trim().max(50).nullable().optional(),
    actionUrl: optionalUrl.optional(),
    startsAt: optionalDate.optional(),
    endsAt: optionalDate.optional(),
    status: z.enum(["draft", "active", "hidden"]),
    sortOrder: z.number().int().min(0).max(100),
  })
  .superRefine((value, context) => {
    if (value.actionLabel && !value.actionUrl) {
      context.addIssue({
        code: "custom",
        message: "Add a link for the offer action.",
      });
    }
    if (
      value.startsAt &&
      value.endsAt &&
      new Date(value.endsAt) <= new Date(value.startsAt)
    ) {
      context.addIssue({
        code: "custom",
        message: "The offer end date must be after its start date.",
      });
    }
  });

const eventSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(2).max(160),
    description: z.string().trim().min(5).max(3000),
    locationDisplay: z.string().trim().max(300).nullable().optional(),
    startsAt: z.iso.datetime(),
    endsAt: optionalDate.optional(),
    bookingUrl: optionalUrl.optional(),
    status: z.enum(["draft", "active", "cancelled", "hidden"]),
    /** Only honoured when creating a new event, never when editing one. */
    repeat: z
      .object({
        frequency: z.enum(eventRepeatFrequencies),
        occurrences: z.number().int().min(2).max(MAX_EVENT_OCCURRENCES),
      })
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
      context.addIssue({
        code: "custom",
        message: "The event end time must be after its start time.",
      });
    }
  });

const menuGroupSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(100),
  status: z.enum(["active", "hidden"]),
});

const menuItemSchema = z.object({
  id: z.uuid().optional(),
  groupId: z.uuid(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  priceDisplay: z.string().trim().max(80).nullable().optional(),
  dietaryLabels: z.array(z.string().trim().min(1).max(40)).max(12),
  available: z.boolean(),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(200),
});

export const categorySectionTypes = [
  "areas_covered",
  "treatments",
  "facilities",
  "products",
  "team",
  "faq",
] as const;

const categoryEntrySchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(1200).default(""),
  meta: z.string().trim().max(200).optional(),
});
const categorySectionSchema = z.object({
  id: z.uuid().optional(),
  sectionType: z.enum(categorySectionTypes),
  title: z.string().trim().min(2).max(120),
  entries: z.array(categoryEntrySchema).min(1).max(50),
  status: z.enum(["active", "hidden"]),
  sortOrder: z.number().int().min(0).max(100),
});

export type OfferView = {
  id: string;
  title: string;
  description: string;
  terms: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  status: string;
  sortOrder: number;
  image: ContentImageView | null;
  /** Set by the Welsh overlay when title / description are the owner's Welsh. */
  welshTitle?: boolean;
  welshDescription?: boolean;
};

export type EventView = {
  id: string;
  businessId: string;
  businessName?: string;
  businessSlug?: string;
  title: string;
  description: string;
  locationDisplay: string | null;
  startsAt: Date;
  endsAt: Date | null;
  bookingUrl: string | null;
  status: string;
  /** Shared by the dates of one repeating event; null for one-off events. */
  seriesId?: string | null;
  image?: ContentImageView | null;
  /** Set by the Welsh overlay when title / description are the owner's Welsh. */
  welshTitle?: boolean;
  welshDescription?: boolean;
};

export type MenuGroupView = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  sortOrder: number;
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    priceDisplay: string | null;
    dietaryLabels: string[];
    available: boolean;
    featured: boolean;
    sortOrder: number;
  }>;
};

export type CategorySectionView = {
  id: string;
  sectionType: (typeof categorySectionTypes)[number];
  title: string;
  entries: Array<{ title: string; description: string; meta?: string }>;
  status: string;
  sortOrder: number;
};

function parseDate(value: string | null | undefined): Date | null {
  return value ? new Date(value) : null;
}

/**
 * `imageMediaId` is `undefined` to leave the picture as it is, `null` to
 * remove it, or the id of a picture just uploaded for this business.
 */
export async function saveBusinessOffer(input: {
  businessId: string;
  offer: z.input<typeof offerSchema>;
  imageMediaId?: string | null;
}): Promise<"saved" | "invalid" | "not_found" | "unavailable"> {
  const parsed = offerSchema.safeParse(input.offer);
  if (!parsed.success) return "invalid";
  if (
    input.imageMediaId &&
    !(await isOwnContentImage({
      businessId: input.businessId,
      kind: "offer",
      mediaId: input.imageMediaId,
    }))
  ) {
    return "invalid";
  }
  const imageChange =
    input.imageMediaId === undefined
      ? {}
      : { imageMediaId: input.imageMediaId };
  try {
    const database = getDatabase();
    if (parsed.data.id) {
      const offerId = parsed.data.id;
      // The previous picture is read and replaced under a row lock, as events
      // do, so two concurrent saves cannot both retire the same old picture and
      // strand the first one's newly uploaded picture.
      const outcome = await database.transaction(async (transaction) => {
        const [previous] = await transaction
          .select({ imageMediaId: businessOffer.imageMediaId })
          .from(businessOffer)
          .where(
            and(
              eq(businessOffer.id, offerId),
              eq(businessOffer.businessId, input.businessId),
            ),
          )
          .for("update");
        if (!previous) return null;
        await transaction
          .update(businessOffer)
          .set({
            title: parsed.data.title,
            description: parsed.data.description,
            terms: parsed.data.terms || null,
            actionLabel: parsed.data.actionLabel || null,
            actionUrl: parsed.data.actionUrl || null,
            startsAt: parseDate(parsed.data.startsAt),
            endsAt: parseDate(parsed.data.endsAt),
            status: parsed.data.status,
            sortOrder: parsed.data.sortOrder,
            ...imageChange,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(businessOffer.id, offerId),
              eq(businessOffer.businessId, input.businessId),
            ),
          );
        return {
          replacedImageMediaId:
            input.imageMediaId !== undefined &&
            previous.imageMediaId !== input.imageMediaId
              ? previous.imageMediaId
              : null,
        };
      });
      if (!outcome) return "not_found";
      await releaseContentImageIfUnused({
        businessId: input.businessId,
        mediaId: outcome.replacedImageMediaId,
      });
      return "saved";
    }
    await database.insert(businessOffer).values({
      businessId: input.businessId,
      title: parsed.data.title,
      description: parsed.data.description,
      terms: parsed.data.terms || null,
      actionLabel: parsed.data.actionLabel || null,
      actionUrl: parsed.data.actionUrl || null,
      startsAt: parseDate(parsed.data.startsAt),
      endsAt: parseDate(parsed.data.endsAt),
      status: parsed.data.status,
      sortOrder: parsed.data.sortOrder,
      imageMediaId: input.imageMediaId ?? null,
    });
    return "saved";
  } catch {
    return "unavailable";
  }
}

export async function removeBusinessOffer(businessId: string, offerId: string) {
  try {
    const database = getDatabase();
    const rows = await database
      .delete(businessOffer)
      .where(
        and(
          eq(businessOffer.id, offerId),
          eq(businessOffer.businessId, businessId),
        ),
      )
      .returning({
        id: businessOffer.id,
        imageMediaId: businessOffer.imageMediaId,
      });
    await releaseContentImageIfUnused({
      businessId,
      mediaId: rows[0]?.imageMediaId,
    });
    return rows.length > 0 ? "removed" : "not_found";
  } catch {
    return "unavailable";
  }
}

export async function listBusinessOffers(
  businessId: string,
  publicOnly = false,
): Promise<OfferView[]> {
  try {
    const database = getDatabase();
    const now = new Date();
    const filters = [eq(businessOffer.businessId, businessId)];
    if (publicOnly) {
      filters.push(
        eq(businessOffer.status, "active"),
        or(isNull(businessOffer.startsAt), lte(businessOffer.startsAt, now))!,
        or(isNull(businessOffer.endsAt), gte(businessOffer.endsAt, now))!,
      );
    }
    const rows = await database
      .select()
      .from(businessOffer)
      .where(and(...filters))
      .orderBy(asc(businessOffer.sortOrder), desc(businessOffer.createdAt));
    const images = await loadContentImages(rows.map((r) => r.imageMediaId));
    return rows.map(({ imageMediaId, ...offer }) => ({
      ...offer,
      image: (imageMediaId && images.get(imageMediaId)) || null,
    }));
  } catch {
    return [];
  }
}

/**
 * `imageMediaId` is `undefined` to leave the picture as it is, `null` to
 * remove it, or the id of a picture just uploaded for this business. When an
 * event repeats, every generated date shares the one picture; editing a date
 * afterwards changes only that date.
 */
export async function saveBusinessEvent(input: {
  businessId: string;
  event: z.input<typeof eventSchema>;
  imageMediaId?: string | null;
}): Promise<"saved" | "invalid" | "not_found" | "locked" | "unavailable"> {
  const parsed = eventSchema.safeParse(input.event);
  if (!parsed.success) return "invalid";
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
  try {
    const database = getDatabase();
    if (parsed.data.id) {
      const eventId = parsed.data.id;
      const outcome = await database.transaction(async (transaction) => {
        const [existing] = await transaction
          .select({
            status: businessEvent.status,
            imageMediaId: businessEvent.imageMediaId,
          })
          .from(businessEvent)
          .where(
            and(
              eq(businessEvent.id, eventId),
              eq(businessEvent.businessId, input.businessId),
            ),
          )
          .for("update");
        if (!existing) return "not_found" as const;
        // An administrator took this event down; owners cannot undo that.
        if (existing.status === "removed") return "locked" as const;
        const [updated] = await transaction
          .update(businessEvent)
          .set({
            title: parsed.data.title,
            description: parsed.data.description,
            locationDisplay: parsed.data.locationDisplay || null,
            startsAt: new Date(parsed.data.startsAt),
            endsAt: parseDate(parsed.data.endsAt),
            bookingUrl: parsed.data.bookingUrl || null,
            status: parsed.data.status,
            ...imageChange,
            updatedAt: sql`now()`,
          })
          .where(
            and(
              eq(businessEvent.id, eventId),
              eq(businessEvent.businessId, input.businessId),
            ),
          )
          .returning({ id: businessEvent.id });
        if (!updated) return "not_found" as const;
        const justCancelled =
          existing.status !== "cancelled" && parsed.data.status === "cancelled";
        return {
          outcome: justCancelled ? ("cancelled" as const) : ("saved" as const),
          replacedImageMediaId:
            input.imageMediaId !== undefined &&
            existing.imageMediaId !== input.imageMediaId
              ? existing.imageMediaId
              : null,
        };
      });
      if (typeof outcome === "string") return outcome;
      await releaseContentImageIfUnused({
        businessId: input.businessId,
        mediaId: outcome.replacedImageMediaId,
      });
      if (outcome.outcome === "cancelled") {
        await notifyCancelledEventSaves({
          businessId: input.businessId,
          eventId,
          eventTitle: parsed.data.title,
        }).catch(() => undefined);
        return "saved";
      }
      return outcome.outcome;
    }
    const repeat = parsed.data.repeat;
    const occurrences = generateEventOccurrences({
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parseDate(parsed.data.endsAt),
      frequency: repeat?.frequency ?? "weekly",
      count: repeat?.occurrences ?? 1,
    });
    const seriesId = repeat ? randomUUID() : null;
    await database.insert(businessEvent).values(
      occurrences.map((occurrence) => ({
        businessId: input.businessId,
        title: parsed.data.title,
        description: parsed.data.description,
        locationDisplay: parsed.data.locationDisplay || null,
        startsAt: occurrence.startsAt,
        endsAt: occurrence.endsAt,
        bookingUrl: parsed.data.bookingUrl || null,
        status: parsed.data.status,
        imageMediaId: input.imageMediaId ?? null,
        seriesId,
      })),
    );
    return "saved";
  } catch {
    return "unavailable";
  }
}

/**
 * Best-effort, non-blocking notification to residents who saved an event
 * that was just cancelled. Failures here never surface to the caller —
 * cancelling the event is the primary operation and must succeed even if
 * email delivery is unavailable, matching the pattern in
 * lifecycle-automation.ts.
 */
async function notifyCancelledEventSaves(input: {
  businessId: string;
  eventId: string;
  eventTitle: string;
  /** Recipients read before the saves were deleted (event removal). */
  recipients?: CancellationRecipient[];
}): Promise<void> {
  const database = getDatabase();
  const [businessRow] = await database
    .select({ name: business.tradingName })
    .from(business)
    .where(eq(business.id, input.businessId));
  if (!businessRow) return;

  const recipients =
    input.recipients ?? (await cancellationRecipients(input.eventId));
  if (recipients.length === 0) return;

  await Promise.allSettled(
    recipients.map((recipient) => {
      const unsubscribeUrl = buildUnsubscribeUrl(
        "saved_event_cancellation",
        recipient.id,
      );
      return sendTransactionalEmail({
        category: "event_cancellation",
        to: recipient.email,
        subject: `${input.eventTitle} has been cancelled`,
        text: `${businessRow.name} has cancelled "${input.eventTitle}", an event you saved.\n\nStop these notifications: ${unsubscribeUrl}`,
      });
    }),
  );
}

type CancellationRecipient = { id: string; email: string };

async function cancellationRecipients(
  eventId: string,
): Promise<CancellationRecipient[]> {
  return getDatabase()
    .select({ id: user.id, email: user.email })
    .from(savedEvent)
    .innerJoin(user, eq(user.id, savedEvent.userId))
    .where(
      and(
        eq(savedEvent.eventId, eventId),
        eq(user.savedEventCancellationEmails, true),
      ),
    );
}

/**
 * Cancels every upcoming, owner-managed occurrence of the series that
 * `eventId` belongs to, leaving past dates and administrator takedowns alone.
 * Residents who saved a cancelled date are notified once per date, best-effort.
 */
export async function cancelUpcomingSeriesEvents(
  businessId: string,
  eventId: string,
): Promise<
  | { outcome: "cancelled"; count: number }
  | { outcome: "not_found" | "not_series" | "unavailable" }
> {
  try {
    const database = getDatabase();
    const [anchor] = await database
      .select({ seriesId: businessEvent.seriesId })
      .from(businessEvent)
      .where(
        and(
          eq(businessEvent.id, eventId),
          eq(businessEvent.businessId, businessId),
        ),
      );
    if (!anchor) return { outcome: "not_found" };
    if (!anchor.seriesId) return { outcome: "not_series" };
    const cancelled = await database
      .update(businessEvent)
      .set({ status: "cancelled", updatedAt: sql`now()` })
      .where(
        and(
          eq(businessEvent.seriesId, anchor.seriesId),
          eq(businessEvent.businessId, businessId),
          inArray(businessEvent.status, ["draft", "active"]),
          gte(businessEvent.startsAt, new Date()),
        ),
      )
      .returning({ id: businessEvent.id, title: businessEvent.title });
    for (const event of cancelled) {
      await notifyCancelledEventSaves({
        businessId,
        eventId: event.id,
        eventTitle: event.title,
      }).catch(() => undefined);
    }
    return { outcome: "cancelled", count: cancelled.length };
  } catch {
    return { outcome: "unavailable" };
  }
}

export async function removeBusinessEvent(businessId: string, eventId: string) {
  try {
    const database = getDatabase();
    // Deleting an upcoming published event cascades its saves away, so read who
    // to tell first. Draft, cancelled and past events notify nobody.
    const [current] = await database
      .select({
        title: businessEvent.title,
        status: businessEvent.status,
        startsAt: businessEvent.startsAt,
      })
      .from(businessEvent)
      .where(
        and(
          eq(businessEvent.id, eventId),
          eq(businessEvent.businessId, businessId),
        ),
      );
    const notify =
      current?.status === "active" && current.startsAt.getTime() > Date.now();
    const recipients = notify
      ? await cancellationRecipients(eventId).catch(() => [])
      : [];
    const rows = await database
      .delete(businessEvent)
      .where(
        and(
          eq(businessEvent.id, eventId),
          eq(businessEvent.businessId, businessId),
          // Keep administrator takedowns (and their reports) on record.
          ne(businessEvent.status, "removed"),
        ),
      )
      .returning({
        id: businessEvent.id,
        imageMediaId: businessEvent.imageMediaId,
      });
    if (rows.length > 0) {
      await releaseContentImageIfUnused({
        businessId,
        mediaId: rows[0]?.imageMediaId,
      });
      if (current && recipients.length > 0) {
        await notifyCancelledEventSaves({
          businessId,
          eventId,
          eventTitle: current.title,
          recipients,
        }).catch(() => undefined);
      }
      return "removed";
    }
    const [existing] = await database
      .select({ id: businessEvent.id })
      .from(businessEvent)
      .where(
        and(
          eq(businessEvent.id, eventId),
          eq(businessEvent.businessId, businessId),
        ),
      );
    return existing ? "locked" : "not_found";
  } catch {
    return "unavailable";
  }
}

export async function listBusinessEvents(
  businessId: string,
  publicOnly = false,
): Promise<EventView[]> {
  try {
    const database = getDatabase();
    const filters = [eq(businessEvent.businessId, businessId)];
    if (publicOnly) {
      const now = new Date();
      filters.push(
        eq(businessEvent.status, "active"),
        or(
          and(isNull(businessEvent.endsAt), gte(businessEvent.startsAt, now)),
          gte(businessEvent.endsAt, now),
        )!,
      );
    }
    const rows = await database
      .select()
      .from(businessEvent)
      .where(and(...filters))
      .orderBy(asc(businessEvent.startsAt));
    const images = await loadContentImages(rows.map((r) => r.imageMediaId));
    return rows.map(({ imageMediaId, ...event }) => ({
      ...event,
      image: (imageMediaId && images.get(imageMediaId)) || null,
    }));
  } catch {
    return [];
  }
}

export async function listUpcomingBusinessEvents(): Promise<EventView[]> {
  try {
    const database = getDatabase();
    const { business } = await import("@/lib/database/schema/business");
    return await database
      .select({
        id: businessEvent.id,
        businessId: businessEvent.businessId,
        businessName: business.tradingName,
        businessSlug: business.slug,
        title: businessEvent.title,
        description: businessEvent.description,
        locationDisplay: businessEvent.locationDisplay,
        startsAt: businessEvent.startsAt,
        endsAt: businessEvent.endsAt,
        bookingUrl: businessEvent.bookingUrl,
        status: businessEvent.status,
      })
      .from(businessEvent)
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .where(
        and(
          eq(business.status, "published"),
          eq(businessEvent.status, "active"),
          or(
            and(
              isNull(businessEvent.endsAt),
              gte(businessEvent.startsAt, new Date()),
            ),
            gte(businessEvent.endsAt, new Date()),
          ),
        ),
      )
      .orderBy(asc(businessEvent.startsAt))
      .limit(100);
  } catch {
    return [];
  }
}

export const maxMenuGroups = 30;
export const maxMenuItems = 300;

export async function saveMenuGroup(input: {
  businessId: string;
  group: z.input<typeof menuGroupSchema>;
}): Promise<"saved" | "invalid" | "not_found" | "limit" | "unavailable"> {
  const parsed = menuGroupSchema.safeParse(input.group);
  if (!parsed.success) return "invalid";
  try {
    const database = getDatabase();

    if (parsed.data.id) {
      const [row] = await database
        .update(businessMenuGroup)
        .set({
          name: parsed.data.name,
          description: parsed.data.description || null,
          sortOrder: parsed.data.sortOrder,
          status: parsed.data.status,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(businessMenuGroup.id, parsed.data.id),
            eq(businessMenuGroup.businessId, input.businessId),
          ),
        )
        .returning({ id: businessMenuGroup.id });
      return row ? "saved" : "not_found";
    }
    // The limit is checked under a lock on the business row so parallel
    // creates cannot both pass it.
    return await database.transaction(async (transaction) => {
      await transaction
        .select({ id: business.id })
        .from(business)
        .where(eq(business.id, input.businessId))
        .for("update");
      const [{ count } = { count: 0 }] = await transaction
        .select({ count: sql<number>`count(*)::int` })
        .from(businessMenuGroup)
        .where(eq(businessMenuGroup.businessId, input.businessId));
      if (count >= maxMenuGroups) return "limit" as const;
      await transaction.insert(businessMenuGroup).values({
        businessId: input.businessId,
        name: parsed.data.name,
        description: parsed.data.description || null,
        sortOrder: parsed.data.sortOrder,
        status: parsed.data.status,
      });
      return "saved" as const;
    });
  } catch {
    return "unavailable";
  }
}

export async function saveMenuItem(input: {
  businessId: string;
  item: z.input<typeof menuItemSchema>;
}): Promise<"saved" | "invalid" | "not_found" | "limit" | "unavailable"> {
  const parsed = menuItemSchema.safeParse(input.item);
  if (!parsed.success) return "invalid";
  try {
    const database = getDatabase();
    const [group] = await database
      .select({ id: businessMenuGroup.id })
      .from(businessMenuGroup)
      .where(
        and(
          eq(businessMenuGroup.id, parsed.data.groupId),
          eq(businessMenuGroup.businessId, input.businessId),
        ),
      )
      .limit(1);
    if (!group) return "not_found";
    const values = {
      groupId: parsed.data.groupId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      priceDisplay: normalisePrice(parsed.data.priceDisplay),
      dietaryLabels: normaliseDietaryLabels(parsed.data.dietaryLabels),
      available: parsed.data.available,
      featured: parsed.data.featured,
      sortOrder: parsed.data.sortOrder,
      updatedAt: sql`now()`,
    };
    if (parsed.data.id) {
      const [row] = await database
        .update(businessMenuItem)
        .set(values)
        .where(
          and(
            eq(businessMenuItem.id, parsed.data.id),
            eq(businessMenuItem.businessId, input.businessId),
          ),
        )
        .returning({ id: businessMenuItem.id });
      return row ? "saved" : "not_found";
    }
    return await database.transaction(async (transaction) => {
      await transaction
        .select({ id: business.id })
        .from(business)
        .where(eq(business.id, input.businessId))
        .for("update");
      const [{ count } = { count: 0 }] = await transaction
        .select({ count: sql<number>`count(*)::int` })
        .from(businessMenuItem)
        .where(eq(businessMenuItem.businessId, input.businessId));
      if (count >= maxMenuItems) return "limit" as const;
      await transaction.insert(businessMenuItem).values({
        ...values,
        businessId: input.businessId,
      });
      return "saved" as const;
    });
  } catch {
    return "unavailable";
  }
}

export async function removeMenuEntry(input: {
  businessId: string;
  groupId?: string;
  itemId?: string;
}) {
  try {
    const database = getDatabase();
    if (input.itemId) {
      const rows = await database
        .delete(businessMenuItem)
        .where(
          and(
            eq(businessMenuItem.id, input.itemId),
            eq(businessMenuItem.businessId, input.businessId),
          ),
        )
        .returning({ id: businessMenuItem.id });
      return rows.length > 0 ? "removed" : "not_found";
    }
    if (input.groupId) {
      const rows = await database
        .delete(businessMenuGroup)
        .where(
          and(
            eq(businessMenuGroup.id, input.groupId),
            eq(businessMenuGroup.businessId, input.businessId),
          ),
        )
        .returning({ id: businessMenuGroup.id });
      return rows.length > 0 ? "removed" : "not_found";
    }
    return "not_found";
  } catch {
    return "unavailable";
  }
}

/**
 * Moves a group among the business's groups, or an item within its group, one
 * place. Orders are rewritten as 0..n inside one transaction under a row lock
 * on the business's groups, so two quick clicks cannot interleave.
 */
export async function moveMenuEntry(input: {
  businessId: string;
  groupId?: string;
  itemId?: string;
  direction: MoveDirection;
}): Promise<"moved" | "not_found" | "unavailable"> {
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      if (input.itemId) {
        const [target] = await transaction
          .select({ groupId: businessMenuItem.groupId })
          .from(businessMenuItem)
          .where(
            and(
              eq(businessMenuItem.id, input.itemId),
              eq(businessMenuItem.businessId, input.businessId),
            ),
          )
          .limit(1);
        if (!target) return "not_found" as const;
        await transaction
          .select({ id: businessMenuGroup.id })
          .from(businessMenuGroup)
          .where(eq(businessMenuGroup.id, target.groupId))
          .for("update");
        const siblings = await transaction
          .select({ id: businessMenuItem.id })
          .from(businessMenuItem)
          .where(
            and(
              eq(businessMenuItem.groupId, target.groupId),
              eq(businessMenuItem.businessId, input.businessId),
            ),
          )
          .orderBy(
            asc(businessMenuItem.sortOrder),
            asc(businessMenuItem.createdAt),
          );
        const next = moveId(
          siblings.map((row) => row.id),
          input.itemId,
          input.direction,
        );
        for (const [index, id] of next.entries()) {
          await transaction
            .update(businessMenuItem)
            .set({ sortOrder: index, updatedAt: sql`now()` })
            .where(eq(businessMenuItem.id, id));
        }
        return "moved" as const;
      }
      if (!input.groupId) return "not_found" as const;
      const groups = await transaction
        .select({ id: businessMenuGroup.id })
        .from(businessMenuGroup)
        .where(eq(businessMenuGroup.businessId, input.businessId))
        .orderBy(
          asc(businessMenuGroup.sortOrder),
          asc(businessMenuGroup.createdAt),
        )
        .for("update");
      const ids = groups.map((row) => row.id);
      if (!ids.includes(input.groupId)) return "not_found" as const;
      const next = moveId(ids, input.groupId, input.direction);
      for (const [index, id] of next.entries()) {
        await transaction
          .update(businessMenuGroup)
          .set({ sortOrder: index, updatedAt: sql`now()` })
          .where(eq(businessMenuGroup.id, id));
      }
      return "moved" as const;
    });
  } catch {
    return "unavailable";
  }
}

/** Quick toggles on one item: "not available today" and "house favourite". */
export async function setMenuItemFlags(input: {
  businessId: string;
  itemId: string;
  available?: boolean;
  featured?: boolean;
}): Promise<"saved" | "not_found" | "unavailable"> {
  const changes: { available?: boolean; featured?: boolean } = {};
  if (typeof input.available === "boolean") changes.available = input.available;
  if (typeof input.featured === "boolean") changes.featured = input.featured;
  if (Object.keys(changes).length === 0) return "not_found";
  try {
    const [row] = await getDatabase()
      .update(businessMenuItem)
      .set({ ...changes, updatedAt: sql`now()` })
      .where(
        and(
          eq(businessMenuItem.id, input.itemId),
          eq(businessMenuItem.businessId, input.businessId),
        ),
      )
      .returning({ id: businessMenuItem.id });
    return row ? "saved" : "not_found";
  } catch {
    return "unavailable";
  }
}

/**
 * Adds pasted groups and items after what the business already has, all or
 * nothing, inside the group and item limits. Returns how many were added.
 */
class MenuImportInvalid extends Error {}

export async function importMenuGroups(input: {
  businessId: string;
  groups: readonly ParsedMenuGroup[];
}): Promise<
  | { outcome: "imported"; groups: number; items: number }
  | { outcome: "invalid" | "limit" | "unavailable" }
> {
  const groups = input.groups.filter((group) => group.items.length > 0);
  if (groups.length === 0) return { outcome: "invalid" };
  try {
    return await getDatabase().transaction(async (transaction) => {
      await transaction
        .select({ id: business.id })
        .from(business)
        .where(eq(business.id, input.businessId))
        .for("update");
      const [{ groupCount = 0, groupMax = -1 } = {}] = await transaction
        .select({
          groupCount: sql<number>`count(*)::int`,
          groupMax: sql<number>`coalesce(max(${businessMenuGroup.sortOrder}), -1)::int`,
        })
        .from(businessMenuGroup)
        .where(eq(businessMenuGroup.businessId, input.businessId));
      const [{ itemCount = 0 } = {}] = await transaction
        .select({ itemCount: sql<number>`count(*)::int` })
        .from(businessMenuItem)
        .where(eq(businessMenuItem.businessId, input.businessId));
      const newItems = groups.reduce(
        (sum, group) => sum + group.items.length,
        0,
      );
      if (
        groupCount + groups.length > maxMenuGroups ||
        itemCount + newItems > maxMenuItems
      ) {
        return { outcome: "limit" as const };
      }
      let order = groupMax + 1;
      for (const group of groups) {
        const parsedGroup = menuGroupSchema.safeParse({
          name: group.name,
          description: null,
          sortOrder: Math.min(order, 100),
          status: "active",
        });
        if (!parsedGroup.success) throw new MenuImportInvalid();
        const [created] = await transaction
          .insert(businessMenuGroup)
          .values({
            businessId: input.businessId,
            name: parsedGroup.data.name,
            sortOrder: order,
            status: "active",
          })
          .returning({ id: businessMenuGroup.id });
        order += 1;
        for (const [index, line] of group.items.entries()) {
          const parsedItem = menuItemSchema.safeParse({
            groupId: created!.id,
            name: line.name,
            description: line.description,
            priceDisplay: line.priceDisplay,
            dietaryLabels: line.dietaryLabels,
            available: true,
            featured: false,
            sortOrder: Math.min(index, 200),
          });
          if (!parsedItem.success) throw new MenuImportInvalid();
          await transaction.insert(businessMenuItem).values({
            businessId: input.businessId,
            groupId: created!.id,
            name: parsedItem.data.name,
            description: parsedItem.data.description || null,
            priceDisplay: normalisePrice(parsedItem.data.priceDisplay),
            dietaryLabels: normaliseDietaryLabels(
              parsedItem.data.dietaryLabels,
            ),
            available: true,
            featured: false,
            sortOrder: index,
          });
        }
      }
      return {
        outcome: "imported" as const,
        groups: groups.length,
        items: newItems,
      };
    });
  } catch (error) {
    // A line that fails validation rolls the whole import back.
    if (error instanceof MenuImportInvalid) return { outcome: "invalid" };
    return { outcome: "unavailable" };
  }
}

export async function listBusinessMenu(
  businessId: string,
  publicOnly = false,
): Promise<MenuGroupView[]> {
  try {
    const database = getDatabase();
    const groupFilters = [eq(businessMenuGroup.businessId, businessId)];
    if (publicOnly) groupFilters.push(eq(businessMenuGroup.status, "active"));
    const groups = await database
      .select()
      .from(businessMenuGroup)
      .where(and(...groupFilters))
      .orderBy(
        asc(businessMenuGroup.sortOrder),
        asc(businessMenuGroup.createdAt),
      );
    const items = await database
      .select()
      .from(businessMenuItem)
      .where(eq(businessMenuItem.businessId, businessId))
      .orderBy(
        asc(businessMenuItem.sortOrder),
        asc(businessMenuItem.createdAt),
      );
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      status: group.status,
      sortOrder: group.sortOrder,
      items: items
        .filter((item) => item.groupId === group.id)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          priceDisplay: item.priceDisplay,
          dietaryLabels: item.dietaryLabels,
          available: item.available,
          featured: item.featured,
          sortOrder: item.sortOrder,
        })),
    }));
  } catch {
    return [];
  }
}

export async function saveCategorySection(input: {
  businessId: string;
  section: z.input<typeof categorySectionSchema>;
}): Promise<"saved" | "invalid" | "not_found" | "unavailable"> {
  const parsed = categorySectionSchema.safeParse(input.section);
  if (!parsed.success) return "invalid";
  try {
    const database = getDatabase();
    const values = {
      sectionType: parsed.data.sectionType,
      title: parsed.data.title,
      content: { entries: parsed.data.entries },
      status: parsed.data.status,
      sortOrder: parsed.data.sortOrder,
      updatedAt: sql`now()`,
    };
    if (parsed.data.id) {
      const [row] = await database
        .update(businessCategorySection)
        .set(values)
        .where(
          and(
            eq(businessCategorySection.id, parsed.data.id),
            eq(businessCategorySection.businessId, input.businessId),
          ),
        )
        .returning({ id: businessCategorySection.id });
      return row ? "saved" : "not_found";
    }
    await database.insert(businessCategorySection).values({
      ...values,
      businessId: input.businessId,
    });
    return "saved";
  } catch {
    return "unavailable";
  }
}

export async function removeCategorySection(
  businessId: string,
  sectionId: string,
) {
  try {
    const database = getDatabase();
    const rows = await database
      .delete(businessCategorySection)
      .where(
        and(
          eq(businessCategorySection.id, sectionId),
          eq(businessCategorySection.businessId, businessId),
        ),
      )
      .returning({ id: businessCategorySection.id });
    return rows.length > 0 ? "removed" : "not_found";
  } catch {
    return "unavailable";
  }
}

export async function listCategorySections(
  businessId: string,
  publicOnly = false,
): Promise<CategorySectionView[]> {
  try {
    const database = getDatabase();
    const filters = [eq(businessCategorySection.businessId, businessId)];
    if (publicOnly) filters.push(eq(businessCategorySection.status, "active"));
    const rows = await database
      .select()
      .from(businessCategorySection)
      .where(and(...filters))
      .orderBy(asc(businessCategorySection.sortOrder));
    return rows.flatMap((row) => {
      if (
        !(categorySectionTypes as readonly string[]).includes(row.sectionType)
      )
        return [];
      const content = row.content as { entries?: unknown };
      const parsed = z.array(categoryEntrySchema).safeParse(content.entries);
      if (!parsed.success) return [];
      return [
        {
          id: row.id,
          sectionType: row.sectionType as CategorySectionView["sectionType"],
          title: row.title,
          entries: parsed.data,
          status: row.status,
          sortOrder: row.sortOrder,
        },
      ];
    });
  } catch {
    return [];
  }
}

export type BusinessDocumentView = {
  id: string;
  displayName: string;
  contentType: string;
  byteSize: number;
  url: string | null;
};

export async function getBusinessMenuDocument(
  businessId: string,
): Promise<BusinessDocumentView | null> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select()
      .from(businessDocument)
      .where(
        and(
          eq(businessDocument.businessId, businessId),
          eq(businessDocument.role, "menu"),
          eq(businessDocument.status, "active"),
        ),
      )
      .limit(1);
    return row
      ? {
          id: row.id,
          displayName: row.displayName,
          contentType: row.contentType,
          byteSize: row.byteSize,
          url: publicMediaUrl(row.storageKey),
        }
      : null;
  } catch {
    return null;
  }
}

function inspectMenuDocument(bytes: Buffer, contentType: string) {
  if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) {
    return {
      valid: false as const,
      message: "Menu files must be 8MB or smaller.",
    };
  }
  if (contentType === "application/pdf") {
    if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return {
        valid: false as const,
        message: "The file contents do not match a PDF.",
      };
    }
    const source = bytes.toString("latin1").toLowerCase();
    const blockedConstructs = [
      "/javascript",
      "/js",
      "/launch",
      "/embeddedfile",
      "/openaction",
      "/aa",
    ];
    if (blockedConstructs.some((token) => source.includes(token))) {
      return {
        valid: false as const,
        message: "Active or embedded PDF content is not accepted.",
      };
    }
    return { valid: true as const, extension: "pdf" };
  }
  const inspected = inspectImageUpload(bytes, contentType);
  return inspected.status === "valid"
    ? { valid: true as const, extension: inspected.image.extension }
    : { valid: false as const, message: inspected.message };
}

export async function saveBusinessMenuDocument(input: {
  businessId: string;
  displayName: string;
  contentType: string;
  bytes: Buffer;
}): Promise<"saved" | "invalid" | "storage_unavailable" | "unavailable"> {
  const inspected = inspectMenuDocument(input.bytes, input.contentType);
  if (!inspected.valid || input.displayName.trim().length < 2) return "invalid";
  if (!isMediaStorageConfigured()) return "storage_unavailable";

  const storageKey = `business/${input.businessId}/documents/menu-${randomUUID()}.${inspected.extension}`;
  try {
    await putMediaObject(storageKey, input.bytes, input.contentType);
    const database = getDatabase();
    let oldKey: string | null = null;
    await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${input.businessId}:documents`}))`,
      );
      const [old] = await transaction
        .select({ storageKey: businessDocument.storageKey })
        .from(businessDocument)
        .where(
          and(
            eq(businessDocument.businessId, input.businessId),
            eq(businessDocument.role, "menu"),
            eq(businessDocument.status, "active"),
          ),
        )
        .for("update")
        .limit(1);
      oldKey = old?.storageKey ?? null;
      await transaction
        .update(businessDocument)
        .set({ status: "replaced", updatedAt: sql`now()` })
        .where(
          and(
            eq(businessDocument.businessId, input.businessId),
            eq(businessDocument.role, "menu"),
            eq(businessDocument.status, "active"),
          ),
        );
      if (oldKey) await enqueueStorageCleanup(transaction, [oldKey]);
      await transaction.insert(businessDocument).values({
        businessId: input.businessId,
        role: "menu",
        storageKey,
        displayName: input.displayName.trim().slice(0, 160),
        contentType: input.contentType,
        byteSize: input.bytes.length,
      });
    });
    if (oldKey) await processStorageCleanup({ storageKeys: [oldKey] });
    return "saved";
  } catch {
    await deleteStoredObjectOrQueue(storageKey);
    return "unavailable";
  }
}

export async function removeBusinessMenuDocument(businessId: string) {
  try {
    const database = getDatabase();
    const [row] = await database
      .select({
        id: businessDocument.id,
        storageKey: businessDocument.storageKey,
      })
      .from(businessDocument)
      .where(
        and(
          eq(businessDocument.businessId, businessId),
          eq(businessDocument.role, "menu"),
          eq(businessDocument.status, "active"),
        ),
      )
      .limit(1);
    if (!row) return "not_found";
    await database.transaction(async (transaction) => {
      await transaction
        .update(businessDocument)
        .set({ status: "removed", updatedAt: sql`now()` })
        .where(eq(businessDocument.id, row.id));
      await enqueueStorageCleanup(transaction, [row.storageKey]);
    });
    await processStorageCleanup({ storageKeys: [row.storageKey] });
    return "removed";
  } catch {
    return "unavailable";
  }
}
