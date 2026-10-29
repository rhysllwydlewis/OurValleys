import "server-only";
import { and, asc, eq, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessTranslation,
  service,
  serviceTranslation,
} from "@/lib/database/schema/business";
import {
  businessEvent,
  businessMenuGroup,
  businessMenuItem,
  businessOffer,
  eventTranslation,
  menuGroupTranslation,
  menuItemTranslation,
  offerTranslation,
} from "@/lib/database/schema/business-operations";
import {
  emptyTranslation,
  type BusinessTranslationText,
  type EventTranslationText,
  type MenuTranslationText,
  type OfferTranslationText,
  type ServiceTranslationText,
} from "@/modules/businesses/translation-model";

/**
 * Storage for the Welsh version of a business's own words. Reads are scoped to
 * one business id; callers that expose the editor must already have checked the
 * edit-profile permission for it. The public reader fails open to English, so
 * a translation problem can never take a business page down.
 */

export type TranslatableService = {
  id: string;
  name: string;
  description: string | null;
};

export type TranslatableOffer = {
  id: string;
  title: string;
  description: string;
  terms: string | null;
  actionLabel: string | null;
};

export type TranslatableEvent = {
  /** The earliest upcoming date; saving also writes the series' other dates. */
  id: string;
  title: string;
  description: string;
  startsAt: Date;
  /** How many upcoming dates share this text (1 for a one-off event). */
  dates: number;
};

export type TranslatableMenuGroup = {
  id: string;
  name: string;
  description: string | null;
  items: Array<{ id: string; name: string; description: string | null }>;
};

/**
 * Dates of one repeating event share their Welsh only while their English
 * title and description still match, so an owner who turns one Tuesday into a
 * "Christmas special" gets that date as its own entry.
 */
const seriesTextKey = (row: {
  seriesId: string | null;
  title: string;
  description: string;
}) =>
  row.seriesId
    ? `${row.seriesId}\u0000${row.title}\u0000${row.description}`
    : null;

/** Upcoming events offered for translation, one per repeating series. */
const EDITABLE_EVENT_LIMIT = 50;

export type WelshContent = {
  translation: BusinessTranslationText;
  services: TranslatableService[];
  offers: TranslatableOffer[];
  events: TranslatableEvent[];
  menuGroups: TranslatableMenuGroup[];
  serviceIdsByName: Map<string, string>;
};

export async function readWelshContent(
  businessId: string,
): Promise<WelshContent> {
  const database = getDatabase();
  const now = new Date();
  const [
    rows,
    [header],
    offerRows,
    eventRows,
    eventTextRows,
    groupRows,
    itemRows,
  ] = await Promise.all([
    database
      .select({
        id: service.id,
        name: service.name,
        description: service.description,
        welshName: serviceTranslation.name,
        welshDescription: serviceTranslation.description,
      })
      .from(service)
      .leftJoin(
        serviceTranslation,
        and(
          eq(serviceTranslation.serviceId, service.id),
          eq(serviceTranslation.locale, "cy"),
        ),
      )
      .where(
        and(eq(service.businessId, businessId), eq(service.status, "active")),
      )
      .orderBy(asc(service.sortOrder), asc(service.name)),
    database
      .select({
        summary: businessTranslation.summary,
        description: businessTranslation.description,
        updatedAt: businessTranslation.updatedAt,
      })
      .from(businessTranslation)
      .where(
        and(
          eq(businessTranslation.businessId, businessId),
          eq(businessTranslation.locale, "cy"),
        ),
      )
      .limit(1),
    database
      .select({
        id: businessOffer.id,
        title: businessOffer.title,
        description: businessOffer.description,
        welshTitle: offerTranslation.title,
        welshDescription: offerTranslation.description,
        terms: businessOffer.terms,
        actionLabel: businessOffer.actionLabel,
        welshTerms: offerTranslation.terms,
        welshActionLabel: offerTranslation.actionLabel,
      })
      .from(businessOffer)
      .leftJoin(
        offerTranslation,
        and(
          eq(offerTranslation.offerId, businessOffer.id),
          eq(offerTranslation.locale, "cy"),
        ),
      )
      .where(
        and(
          eq(businessOffer.businessId, businessId),
          inArray(businessOffer.status, ["draft", "active"]),
        ),
      )
      .orderBy(asc(businessOffer.sortOrder), asc(businessOffer.createdAt)),
    database
      .select({
        id: businessEvent.id,
        seriesId: businessEvent.seriesId,
        title: businessEvent.title,
        description: businessEvent.description,
        startsAt: businessEvent.startsAt,
      })
      .from(businessEvent)
      .where(
        and(
          eq(businessEvent.businessId, businessId),
          inArray(businessEvent.status, ["draft", "active"]),
          or(
            and(isNull(businessEvent.endsAt), gte(businessEvent.startsAt, now)),
            gte(businessEvent.endsAt, now),
          ),
        ),
      )
      .orderBy(asc(businessEvent.startsAt)),
    database
      .select({
        id: eventTranslation.eventId,
        title: eventTranslation.title,
        description: eventTranslation.description,
      })
      .from(eventTranslation)
      .innerJoin(businessEvent, eq(businessEvent.id, eventTranslation.eventId))
      .where(
        and(
          eq(businessEvent.businessId, businessId),
          eq(eventTranslation.locale, "cy"),
          // Past events are never shown, so their Welsh is not read.
          or(
            and(isNull(businessEvent.endsAt), gte(businessEvent.startsAt, now)),
            gte(businessEvent.endsAt, now),
          ),
        ),
      ),
    database
      .select({
        id: businessMenuGroup.id,
        name: businessMenuGroup.name,
        description: businessMenuGroup.description,
        welshName: menuGroupTranslation.name,
        welshDescription: menuGroupTranslation.description,
      })
      .from(businessMenuGroup)
      .leftJoin(
        menuGroupTranslation,
        and(
          eq(menuGroupTranslation.groupId, businessMenuGroup.id),
          eq(menuGroupTranslation.locale, "cy"),
        ),
      )
      .where(eq(businessMenuGroup.businessId, businessId))
      .orderBy(asc(businessMenuGroup.sortOrder), asc(businessMenuGroup.name)),
    database
      .select({
        id: businessMenuItem.id,
        groupId: businessMenuItem.groupId,
        name: businessMenuItem.name,
        description: businessMenuItem.description,
        welshName: menuItemTranslation.name,
        welshDescription: menuItemTranslation.description,
      })
      .from(businessMenuItem)
      .leftJoin(
        menuItemTranslation,
        and(
          eq(menuItemTranslation.itemId, businessMenuItem.id),
          eq(menuItemTranslation.locale, "cy"),
        ),
      )
      .where(eq(businessMenuItem.businessId, businessId))
      .orderBy(asc(businessMenuItem.sortOrder), asc(businessMenuItem.name)),
  ]);

  const events: Record<string, EventTranslationText> = {};
  for (const row of eventTextRows) {
    if (row.title !== null || row.description !== null) {
      events[row.id] = { title: row.title, description: row.description };
    }
  }
  const menuGroups: Record<string, MenuTranslationText> = {};
  for (const row of groupRows) {
    if (row.welshName !== null || row.welshDescription !== null) {
      menuGroups[row.id] = {
        name: row.welshName,
        description: row.welshDescription,
      };
    }
  }
  const menuItems: Record<string, MenuTranslationText> = {};
  for (const row of itemRows) {
    if (row.welshName !== null || row.welshDescription !== null) {
      menuItems[row.id] = {
        name: row.welshName,
        description: row.welshDescription,
      };
    }
  }
  // One entry per repeating series with the same English text (its earliest
  // upcoming date), so the owner translates "Tuesday quiz" once, not once per
  // Tuesday.
  const editableEvents: TranslatableEvent[] = [];
  const bySeries = new Map<string, TranslatableEvent>();
  for (const row of eventRows) {
    const key = seriesTextKey(row);
    const existing = key ? bySeries.get(key) : undefined;
    if (existing) {
      existing.dates += 1;
      continue;
    }
    const entry: TranslatableEvent = {
      id: row.id,
      title: row.title,
      description: row.description,
      startsAt: row.startsAt,
      dates: 1,
    };
    if (key) bySeries.set(key, entry);
    if (editableEvents.length < EDITABLE_EVENT_LIMIT)
      editableEvents.push(entry);
  }
  const itemsByGroup = new Map<string, TranslatableMenuGroup["items"]>();
  for (const row of itemRows) {
    const list = itemsByGroup.get(row.groupId) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      description: row.description?.trim() ? row.description : null,
    });
    itemsByGroup.set(row.groupId, list);
  }

  const offers: Record<string, OfferTranslationText> = {};
  for (const row of offerRows) {
    if (
      row.welshTitle !== null ||
      row.welshDescription !== null ||
      row.welshTerms !== null ||
      row.welshActionLabel !== null
    ) {
      offers[row.id] = {
        title: row.welshTitle,
        description: row.welshDescription,
        terms: row.welshTerms,
        actionLabel: row.welshActionLabel,
      };
    }
  }
  const services: Record<string, ServiceTranslationText> = {};
  for (const row of rows) {
    if (row.welshName !== null || row.welshDescription !== null) {
      services[row.id] = {
        name: row.welshName,
        description: row.welshDescription,
      };
    }
  }
  return {
    translation: {
      summary: header?.summary ?? null,
      description: header?.description ?? null,
      services,
      offers,
      events,
      menuGroups,
      menuItems,
      updatedAt: header?.updatedAt ?? null,
    },
    events: editableEvents,
    menuGroups: groupRows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description?.trim() ? row.description : null,
      items: itemsByGroup.get(row.id) ?? [],
    })),
    offers: offerRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      terms: row.terms?.trim() ? row.terms : null,
      actionLabel: row.actionLabel?.trim() ? row.actionLabel : null,
    })),
    services: rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description.trim() === "" ? null : row.description,
    })),
    serviceIdsByName: new Map(rows.map((row) => [row.name, row.id])),
  };
}

/** For the public site: never throws, and answers "no Welsh" on any failure. */
export async function readPublicWelshContent(
  businessId: string,
): Promise<WelshContent> {
  try {
    return await readWelshContent(businessId);
  } catch {
    return {
      translation: emptyTranslation,
      services: [],
      offers: [],
      events: [],
      menuGroups: [],
      serviceIdsByName: new Map(),
    };
  }
}

export type SaveTranslationResult =
  { status: "saved" } | { status: "missing" } | { status: "unavailable" };

/**
 * Replaces the business's Welsh text with `value`. Blank fields remove their
 * stored text (so the English shows again). Service ids that do not belong to
 * the business are ignored, so one business can never write into another's
 * services.
 */
export async function saveBusinessTranslation(input: {
  businessId: string;
  actorUserId: string;
  /** Offers, events and menu left out mean "leave their Welsh text as it is". */
  value: Omit<
    BusinessTranslationText,
    "updatedAt" | "offers" | "events" | "menuGroups" | "menuItems"
  > &
    Partial<
      Pick<
        BusinessTranslationText,
        "offers" | "events" | "menuGroups" | "menuItems"
      >
    >;
}): Promise<SaveTranslationResult> {
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      const [exists] = await transaction
        .select({ id: business.id })
        .from(business)
        .where(eq(business.id, input.businessId))
        .for("update")
        .limit(1);
      if (!exists) return { status: "missing" } as const;

      // Welsh text is public content: the page's "last updated" date and the
      // recently-updated ordering follow it like any other edit.
      await transaction
        .update(business)
        .set({ updatedAt: new Date() })
        .where(eq(business.id, input.businessId));

      const { summary, description } = input.value;
      if (summary === null && description === null) {
        await transaction
          .delete(businessTranslation)
          .where(
            and(
              eq(businessTranslation.businessId, input.businessId),
              eq(businessTranslation.locale, "cy"),
            ),
          );
      } else {
        const now = new Date();
        await transaction
          .insert(businessTranslation)
          .values({
            businessId: input.businessId,
            locale: "cy",
            summary,
            description,
            updatedByUserId: input.actorUserId,
          })
          .onConflictDoUpdate({
            target: [
              businessTranslation.businessId,
              businessTranslation.locale,
            ],
            set: {
              summary,
              description,
              updatedByUserId: input.actorUserId,
              updatedAt: now,
            },
          });
      }

      const owned = await transaction
        .select({ id: service.id })
        .from(service)
        .where(eq(service.businessId, input.businessId));
      const ownedIds = new Set(owned.map((row) => row.id));
      const clearIds: string[] = [];
      for (const [serviceId, text] of Object.entries(input.value.services)) {
        if (!ownedIds.has(serviceId)) continue;
        if (text.name === null && text.description === null) {
          clearIds.push(serviceId);
          continue;
        }
        await transaction
          .insert(serviceTranslation)
          .values({
            serviceId,
            locale: "cy",
            name: text.name,
            description: text.description,
          })
          .onConflictDoUpdate({
            target: [serviceTranslation.serviceId, serviceTranslation.locale],
            set: {
              name: text.name,
              description: text.description,
              updatedAt: new Date(),
            },
          });
      }
      if (clearIds.length > 0) {
        await transaction
          .delete(serviceTranslation)
          .where(
            and(
              inArray(serviceTranslation.serviceId, clearIds),
              eq(serviceTranslation.locale, "cy"),
            ),
          );
      }

      const ownedOffers = await transaction
        .select({ id: businessOffer.id })
        .from(businessOffer)
        .where(
          and(
            eq(businessOffer.businessId, input.businessId),
            // An administrator takedown is read-only, Welsh text included.
            ne(businessOffer.status, "removed"),
          ),
        );
      const ownedOfferIds = new Set(ownedOffers.map((row) => row.id));
      const clearOfferIds: string[] = [];
      for (const [offerId, text] of Object.entries(input.value.offers ?? {})) {
        if (!ownedOfferIds.has(offerId)) continue;
        if (
          text.title === null &&
          text.description === null &&
          text.terms === null &&
          text.actionLabel === null
        ) {
          clearOfferIds.push(offerId);
          continue;
        }
        await transaction
          .insert(offerTranslation)
          .values({
            offerId,
            locale: "cy",
            title: text.title,
            description: text.description,
            terms: text.terms,
            actionLabel: text.actionLabel,
          })
          .onConflictDoUpdate({
            target: [offerTranslation.offerId, offerTranslation.locale],
            set: {
              title: text.title,
              description: text.description,
              terms: text.terms,
              actionLabel: text.actionLabel,
              updatedAt: new Date(),
            },
          });
      }
      if (clearOfferIds.length > 0) {
        await transaction
          .delete(offerTranslation)
          .where(
            and(
              inArray(offerTranslation.offerId, clearOfferIds),
              eq(offerTranslation.locale, "cy"),
            ),
          );
      }

      // Events: the text is written to every date of the series, so a repeating
      // event reads the same wherever one of its dates is shown.
      const eventEntries = Object.entries(input.value.events ?? {});
      if (eventEntries.length > 0) {
        const ownedEvents = await transaction
          .select({
            id: businessEvent.id,
            seriesId: businessEvent.seriesId,
            title: businessEvent.title,
            description: businessEvent.description,
          })
          .from(businessEvent)
          .where(eq(businessEvent.businessId, input.businessId));
        const idsBySeries = new Map<string, string[]>();
        const ownedEventIds = new Set<string>();
        const seriesOf = new Map<string, string | null>();
        for (const row of ownedEvents) {
          ownedEventIds.add(row.id);
          const key = seriesTextKey(row);
          seriesOf.set(row.id, key);
          if (key) {
            idsBySeries.set(key, [...(idsBySeries.get(key) ?? []), row.id]);
          }
        }
        const clearEventIds: string[] = [];
        for (const [anchorId, text] of eventEntries) {
          if (!ownedEventIds.has(anchorId)) continue;
          const key = seriesOf.get(anchorId);
          const targets = key
            ? (idsBySeries.get(key) ?? [anchorId])
            : [anchorId];
          if (text.title === null && text.description === null) {
            clearEventIds.push(...targets);
            continue;
          }
          await transaction
            .insert(eventTranslation)
            .values(
              targets.map((eventId) => ({
                eventId,
                locale: "cy",
                title: text.title,
                description: text.description,
              })),
            )
            .onConflictDoUpdate({
              target: [eventTranslation.eventId, eventTranslation.locale],
              set: {
                title: sql`excluded.title`,
                description: sql`excluded.description`,
                updatedAt: new Date(),
              },
            });
        }
        if (clearEventIds.length > 0) {
          await transaction
            .delete(eventTranslation)
            .where(
              and(
                inArray(eventTranslation.eventId, clearEventIds),
                eq(eventTranslation.locale, "cy"),
              ),
            );
        }
      }

      const groupEntries = Object.entries(input.value.menuGroups ?? {});
      if (groupEntries.length > 0) {
        const ownedGroups = await transaction
          .select({ id: businessMenuGroup.id })
          .from(businessMenuGroup)
          .where(eq(businessMenuGroup.businessId, input.businessId));
        const ownedGroupIds = new Set(ownedGroups.map((row) => row.id));
        const clearGroupIds: string[] = [];
        for (const [groupId, text] of groupEntries) {
          if (!ownedGroupIds.has(groupId)) continue;
          if (text.name === null && text.description === null) {
            clearGroupIds.push(groupId);
            continue;
          }
          await transaction
            .insert(menuGroupTranslation)
            .values({
              groupId,
              locale: "cy",
              name: text.name,
              description: text.description,
            })
            .onConflictDoUpdate({
              target: [
                menuGroupTranslation.groupId,
                menuGroupTranslation.locale,
              ],
              set: {
                name: text.name,
                description: text.description,
                updatedAt: new Date(),
              },
            });
        }
        if (clearGroupIds.length > 0) {
          await transaction
            .delete(menuGroupTranslation)
            .where(
              and(
                inArray(menuGroupTranslation.groupId, clearGroupIds),
                eq(menuGroupTranslation.locale, "cy"),
              ),
            );
        }
      }

      const itemEntries = Object.entries(input.value.menuItems ?? {});
      if (itemEntries.length > 0) {
        const ownedItems = await transaction
          .select({ id: businessMenuItem.id })
          .from(businessMenuItem)
          .where(eq(businessMenuItem.businessId, input.businessId));
        const ownedItemIds = new Set(ownedItems.map((row) => row.id));
        const clearItemIds: string[] = [];
        for (const [itemId, text] of itemEntries) {
          if (!ownedItemIds.has(itemId)) continue;
          if (text.name === null && text.description === null) {
            clearItemIds.push(itemId);
            continue;
          }
          await transaction
            .insert(menuItemTranslation)
            .values({
              itemId,
              locale: "cy",
              name: text.name,
              description: text.description,
            })
            .onConflictDoUpdate({
              target: [menuItemTranslation.itemId, menuItemTranslation.locale],
              set: {
                name: text.name,
                description: text.description,
                updatedAt: new Date(),
              },
            });
        }
        if (clearItemIds.length > 0) {
          await transaction
            .delete(menuItemTranslation)
            .where(
              and(
                inArray(menuItemTranslation.itemId, clearItemIds),
                eq(menuItemTranslation.locale, "cy"),
              ),
            );
        }
      }
      return { status: "saved" } as const;
    });
  } catch {
    return { status: "unavailable" };
  }
}

export type EnglishBusinessText = {
  slug: string;
  status: string;
  summary: string;
  description: string;
};

/**
 * The English record the Welsh editor sits beside. Returns `null` only when
 * there is no such business; a database failure throws, so the page can show
 * its retryable error instead of a false "not found".
 */
export async function readEnglishBusinessText(
  businessId: string,
): Promise<EnglishBusinessText | null> {
  const [row] = await getDatabase()
    .select({
      slug: business.slug,
      status: business.status,
      summary: business.summary,
      description: business.description,
    })
    .from(business)
    .where(eq(business.id, businessId))
    .limit(1);
  return row ?? null;
}
