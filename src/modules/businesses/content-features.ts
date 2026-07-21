import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import {
  businessCategorySection,
  businessDocument,
  businessEvent,
  businessMenuGroup,
  businessMenuItem,
  businessOffer,
} from "@/lib/database/schema/business-operations";
import {
  deleteMediaObject,
  isMediaStorageConfigured,
  publicMediaUrl,
  putMediaObject,
} from "@/lib/media-storage";
import { inspectImageUpload } from "./media-validation";

const optionalUrl = z.union([z.url().max(1000), z.literal(""), z.null()]);
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

export async function saveBusinessOffer(input: {
  businessId: string;
  offer: z.input<typeof offerSchema>;
}): Promise<"saved" | "invalid" | "not_found" | "unavailable"> {
  const parsed = offerSchema.safeParse(input.offer);
  if (!parsed.success) return "invalid";
  try {
    const database = getDatabase();
    if (parsed.data.id) {
      const [updated] = await database
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
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(businessOffer.id, parsed.data.id),
            eq(businessOffer.businessId, input.businessId),
          ),
        )
        .returning({ id: businessOffer.id });
      return updated ? "saved" : "not_found";
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
      .returning({ id: businessOffer.id });
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
    return await database
      .select()
      .from(businessOffer)
      .where(and(...filters))
      .orderBy(asc(businessOffer.sortOrder), desc(businessOffer.createdAt));
  } catch {
    return [];
  }
}

export async function saveBusinessEvent(input: {
  businessId: string;
  event: z.input<typeof eventSchema>;
}): Promise<"saved" | "invalid" | "not_found" | "unavailable"> {
  const parsed = eventSchema.safeParse(input.event);
  if (!parsed.success) return "invalid";
  try {
    const database = getDatabase();
    if (parsed.data.id) {
      const [updated] = await database
        .update(businessEvent)
        .set({
          title: parsed.data.title,
          description: parsed.data.description,
          locationDisplay: parsed.data.locationDisplay || null,
          startsAt: new Date(parsed.data.startsAt),
          endsAt: parseDate(parsed.data.endsAt),
          bookingUrl: parsed.data.bookingUrl || null,
          status: parsed.data.status,
          updatedAt: sql`now()`,
        })
        .where(
          and(
            eq(businessEvent.id, parsed.data.id),
            eq(businessEvent.businessId, input.businessId),
          ),
        )
        .returning({ id: businessEvent.id });
      return updated ? "saved" : "not_found";
    }
    await database.insert(businessEvent).values({
      businessId: input.businessId,
      title: parsed.data.title,
      description: parsed.data.description,
      locationDisplay: parsed.data.locationDisplay || null,
      startsAt: new Date(parsed.data.startsAt),
      endsAt: parseDate(parsed.data.endsAt),
      bookingUrl: parsed.data.bookingUrl || null,
      status: parsed.data.status,
    });
    return "saved";
  } catch {
    return "unavailable";
  }
}

export async function removeBusinessEvent(businessId: string, eventId: string) {
  try {
    const database = getDatabase();
    const rows = await database
      .delete(businessEvent)
      .where(
        and(
          eq(businessEvent.id, eventId),
          eq(businessEvent.businessId, businessId),
        ),
      )
      .returning({ id: businessEvent.id });
    return rows.length > 0 ? "removed" : "not_found";
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
      filters.push(
        eq(businessEvent.status, "active"),
        or(
          isNull(businessEvent.endsAt),
          gte(businessEvent.endsAt, new Date()),
        )!,
      );
    }
    return await database
      .select()
      .from(businessEvent)
      .where(and(...filters))
      .orderBy(asc(businessEvent.startsAt));
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
            isNull(businessEvent.endsAt),
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

export async function saveMenuGroup(input: {
  businessId: string;
  group: z.input<typeof menuGroupSchema>;
}): Promise<"saved" | "invalid" | "not_found" | "unavailable"> {
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
    await database.insert(businessMenuGroup).values({
      businessId: input.businessId,
      name: parsed.data.name,
      description: parsed.data.description || null,
      sortOrder: parsed.data.sortOrder,
      status: parsed.data.status,
    });
    return "saved";
  } catch {
    return "unavailable";
  }
}

export async function saveMenuItem(input: {
  businessId: string;
  item: z.input<typeof menuItemSchema>;
}): Promise<"saved" | "invalid" | "not_found" | "unavailable"> {
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
      priceDisplay: parsed.data.priceDisplay || null,
      dietaryLabels: [...new Set(parsed.data.dietaryLabels)],
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
    await database.insert(businessMenuItem).values({
      ...values,
      businessId: input.businessId,
    });
    return "saved";
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
      .orderBy(asc(businessMenuGroup.sortOrder));
    const items = await database
      .select()
      .from(businessMenuItem)
      .where(eq(businessMenuItem.businessId, businessId))
      .orderBy(asc(businessMenuItem.sortOrder));
    return groups.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      status: group.status,
      sortOrder: group.sortOrder,
      items: items
        .filter(
          (item) =>
            item.groupId === group.id && (!publicOnly || item.available),
        )
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
    return bytes.subarray(0, 5).toString("ascii") === "%PDF-"
      ? { valid: true as const, extension: "pdf" }
      : {
          valid: false as const,
          message: "The file contents do not match a PDF.",
        };
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
      await transaction.insert(businessDocument).values({
        businessId: input.businessId,
        role: "menu",
        storageKey,
        displayName: input.displayName.trim().slice(0, 160),
        contentType: input.contentType,
        byteSize: input.bytes.length,
      });
    });
    if (oldKey) await deleteMediaObject(oldKey).catch(() => undefined);
    return "saved";
  } catch {
    await deleteMediaObject(storageKey).catch(() => undefined);
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
    await database
      .update(businessDocument)
      .set({ status: "removed", updatedAt: sql`now()` })
      .where(eq(businessDocument.id, row.id));
    await deleteMediaObject(row.storageKey).catch(() => undefined);
    return "removed";
  } catch {
    return "unavailable";
  }
}
