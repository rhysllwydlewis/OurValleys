import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { businessOffer } from "@/lib/database/schema/business-operations";
import {
  isOwnContentImage,
  loadContentImages,
  releaseContentImageIfUnused,
  type ContentImageView,
} from "./content-images";
import {
  actionsFor,
  duplicateTitle,
  extendedEnd,
  isExtensionDays,
  offerLimits,
  offerReadiness,
  offerState,
  type ParsedOfferForm,
  wholeMinute,
  type QuickAction,
  type StudioOffer,
} from "./offer-studio-model";

export type StudioOfferRow = StudioOffer & {
  image: ContentImageView | null;
  sortOrder: number;
  /** Sent back with an edit so a stale form is noticed rather than saved over. */
  updatedAt: Date;
};

export type StudioOffersResult =
  { status: "ok"; offers: StudioOfferRow[] } | { status: "unavailable" };

/**
 * Every offer of one business, with a plain "unavailable" when the read fails
 * so the studio never mistakes an outage for "no offers yet".
 */
export async function listStudioOffers(
  businessId: string,
): Promise<StudioOffersResult> {
  try {
    const database = getDatabase();
    const rows = await database
      .select()
      .from(businessOffer)
      .where(eq(businessOffer.businessId, businessId))
      .orderBy(asc(businessOffer.sortOrder), desc(businessOffer.createdAt))
      .limit(offerLimits.maxOffers * 5);
    const images = await loadContentImages(rows.map((r) => r.imageMediaId));
    return {
      status: "ok",
      offers: rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        terms: row.terms,
        actionLabel: row.actionLabel,
        actionUrl: row.actionUrl,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        status: row.status,
        sortOrder: row.sortOrder,
        updatedAt: row.updatedAt,
        image: (row.imageMediaId && images.get(row.imageMediaId)) || null,
        hasImage: Boolean(row.imageMediaId && images.get(row.imageMediaId)),
      })),
    };
  } catch {
    return { status: "unavailable" };
  }
}

export type SaveStudioOfferResult =
  | "saved"
  | "not_found"
  | "stale"
  | "limit"
  | "invalid"
  | "locked"
  | "unavailable";

/**
 * Creates or edits one offer from an already-validated form. `imageMediaId` is
 * `undefined` to leave the picture alone, `null` to remove it, or the id of a
 * picture just uploaded for this business. An edit carries the `updatedAt` the
 * form was built from; if someone else saved since, nothing is overwritten.
 */
export async function saveStudioOffer(input: {
  businessId: string;
  offerId?: string;
  expectedUpdatedAt?: number;
  offer: Extract<ParsedOfferForm, { ok: true }>["offer"];
  imageMediaId?: string | null;
}): Promise<SaveStudioOfferResult> {
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
  const fields = {
    title: input.offer.title,
    description: input.offer.description,
    terms: input.offer.terms,
    actionLabel: input.offer.actionLabel,
    actionUrl: input.offer.actionUrl,
    startsAt: input.offer.startsAt ? new Date(input.offer.startsAt) : null,
    endsAt: input.offer.endsAt ? new Date(input.offer.endsAt) : null,
    status: input.offer.status,
  };
  try {
    const database = getDatabase();
    const outcome = await database.transaction(async (transaction) => {
      // One writer per business at a time keeps the offer cap exact.
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${input.businessId}:offers`}))`,
      );
      if (!input.offerId) {
        const [counted] = await transaction
          .select({ count: sql<number>`count(*)::int` })
          .from(businessOffer)
          .where(eq(businessOffer.businessId, input.businessId));
        const count = counted?.count ?? 0;
        if (count >= offerLimits.maxOffers) return { result: "limit" as const };
        await transaction.insert(businessOffer).values({
          businessId: input.businessId,
          ...fields,
          sortOrder: Math.min(count, offerLimits.maxOffers),
          imageMediaId: input.imageMediaId ?? null,
        });
        return { result: "saved" as const };
      }
      const [previous] = await transaction
        .select({
          imageMediaId: businessOffer.imageMediaId,
          updatedAt: businessOffer.updatedAt,
          status: businessOffer.status,
        })
        .from(businessOffer)
        .where(
          and(
            eq(businessOffer.id, input.offerId),
            eq(businessOffer.businessId, input.businessId),
          ),
        )
        .for("update");
      if (!previous) return { result: "not_found" as const };
      // An administrator took this offer down; the owner cannot change it.
      if (previous.status === "removed") return { result: "locked" as const };
      if (
        input.expectedUpdatedAt !== undefined &&
        previous.updatedAt.getTime() !== input.expectedUpdatedAt
      ) {
        return { result: "stale" as const };
      }
      await transaction
        .update(businessOffer)
        .set({ ...fields, ...imageChange, updatedAt: sql`now()` })
        .where(
          and(
            eq(businessOffer.id, input.offerId),
            eq(businessOffer.businessId, input.businessId),
          ),
        );
      return {
        result: "saved" as const,
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
    }
    return outcome.result;
  } catch {
    return "unavailable";
  }
}

export type QuickActionResult =
  | "done"
  | "not_found"
  | "not_allowed"
  | "not_ready"
  | "already_ended"
  | "no_end"
  | "limit"
  | "invalid"
  | "locked"
  | "unavailable";

/**
 * One state change on one offer, decided against the row as it is in the
 * database (locked), not as the page last showed it: a stale button cannot
 * resurrect an ended offer or pause one that has just been removed.
 */
export async function applyOfferQuickAction(input: {
  businessId: string;
  offerId: string;
  action: QuickAction;
  /** For `extend`. */
  days?: number;
  /** Appended to a copy's title, in the owner's language. */
  copySuffix?: string;
  now?: Date;
}): Promise<QuickActionResult> {
  const now = input.now ?? new Date();
  if (input.action === "extend" && !isExtensionDays(input.days ?? 0)) {
    return "invalid";
  }
  try {
    const database = getDatabase();
    return await database.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`${input.businessId}:offers`}))`,
      );
      const [row] = await transaction
        .select()
        .from(businessOffer)
        .where(
          and(
            eq(businessOffer.id, input.offerId),
            eq(businessOffer.businessId, input.businessId),
          ),
        )
        .for("update");
      if (!row) return "not_found" as const;
      if (row.status === "removed") return "locked" as const;
      const current: StudioOffer = {
        id: row.id,
        title: row.title,
        description: row.description,
        terms: row.terms,
        actionLabel: row.actionLabel,
        actionUrl: row.actionUrl,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        status: row.status,
        hasImage: Boolean(row.imageMediaId),
      };
      const state = offerState(current, now);
      if (!actionsFor(state).includes(input.action)) {
        return state === "ended" && input.action !== "duplicate"
          ? ("already_ended" as const)
          : ("not_allowed" as const);
      }
      const where = and(
        eq(businessOffer.id, input.offerId),
        eq(businessOffer.businessId, input.businessId),
      );
      const touch = { updatedAt: sql`now()` };
      switch (input.action) {
        case "publish":
        case "resume": {
          if (!offerReadiness(current).ready) return "not_ready" as const;
          if (current.endsAt && current.endsAt.getTime() <= now.getTime()) {
            return "already_ended" as const;
          }
          await transaction
            .update(businessOffer)
            .set({ status: "active", ...touch })
            .where(where);
          return "done" as const;
        }
        case "pause":
          await transaction
            .update(businessOffer)
            .set({ status: "hidden", ...touch })
            .where(where);
          return "done" as const;
        case "endNow":
          await transaction
            .update(businessOffer)
            .set({ endsAt: wholeMinute(now), ...touch })
            .where(where);
          return "done" as const;
        case "extend": {
          const next = extendedEnd(current.endsAt, input.days ?? 0, now);
          if (!next) return "no_end" as const;
          await transaction
            .update(businessOffer)
            .set({ endsAt: next, ...touch })
            .where(where);
          return "done" as const;
        }
        case "duplicate": {
          const [counted] = await transaction
            .select({ count: sql<number>`count(*)::int` })
            .from(businessOffer)
            .where(eq(businessOffer.businessId, input.businessId));
          const count = counted?.count ?? 0;
          if (count >= offerLimits.maxOffers) return "limit" as const;
          await transaction.insert(businessOffer).values({
            businessId: input.businessId,
            title: duplicateTitle(row.title, input.copySuffix ?? "(copy)"),
            description: row.description,
            terms: row.terms,
            actionLabel: row.actionLabel,
            actionUrl: row.actionUrl,
            // The picture row is shared; it is only retired when no offer or
            // event uses it any more.
            imageMediaId: row.imageMediaId,
            // A copy never goes live by accident: draft, with no dates.
            startsAt: null,
            endsAt: null,
            status: "draft",
            sortOrder: Math.min(count, offerLimits.maxOffers),
          });
          return "done" as const;
        }
      }
    });
  } catch {
    return "unavailable";
  }
}

/**
 * A cheap check before the picture is touched: a refused (stale or missing)
 * edit must not first change the shared picture's description. The save still
 * re-checks under the row lock.
 */
export async function checkOfferCurrent(input: {
  businessId: string;
  offerId: string;
  expectedUpdatedAt: number | undefined;
}): Promise<
  | { result: "ok"; status: string }
  | { result: "stale" | "not_found" | "locked" | "unavailable" }
> {
  try {
    const [row] = await getDatabase()
      .select({
        updatedAt: businessOffer.updatedAt,
        status: businessOffer.status,
      })
      .from(businessOffer)
      .where(
        and(
          eq(businessOffer.id, input.offerId),
          eq(businessOffer.businessId, input.businessId),
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
    return { result: "ok", status: row.status };
  } catch {
    return { result: "unavailable" };
  }
}
