import "server-only";

import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessLocation,
  category,
  place,
} from "@/lib/database/schema/business";
import {
  businessOffer,
  offerTranslation,
} from "@/lib/database/schema/business-operations";
import { loadContentImages } from "./content-images";
import { OFFER_ENDED_VISIBLE_DAYS } from "./offer-page-model";
import { listPublicOffers, type PublicOffer } from "./public-offers";

export type PublicOfferDetail = PublicOffer & {
  businessId: string;
  startsAt: Date | null;
  actionLabel: string | null;
  actionUrl: string | null;
  welshActionLabel: boolean;
  categorySlug: string;
  placeSlug: string;
  /** Live offers can be saved and acted on; ended ones are kept for old links. */
  ended: boolean;
};

export type PublicOfferDetailResult =
  | { state: "found"; offer: PublicOfferDetail }
  | { state: "not_found" }
  | { state: "unavailable" };

const offerIdSchema = z.uuid();

/**
 * One offer for its own page. A live offer is shown in full. An offer that
 * has just ended stays reachable for a while so a shared link explains what
 * happened instead of failing; drafts, paused and not-yet-started offers, and
 * offers of a business that is not published, do not exist publicly.
 */
export async function getPublicOffer(
  offerId: string,
  locale: "en" | "cy",
  now: Date = new Date(),
): Promise<PublicOfferDetailResult> {
  const parsed = offerIdSchema.safeParse(offerId);
  if (!parsed.success) return { state: "not_found" };

  try {
    const earliestEnd = new Date(
      now.getTime() - OFFER_ENDED_VISIBLE_DAYS * 86_400_000,
    );
    const [row] = await getDatabase()
      .select({
        id: businessOffer.id,
        imageMediaId: businessOffer.imageMediaId,
        title: businessOffer.title,
        description: businessOffer.description,
        terms: businessOffer.terms,
        actionLabel: businessOffer.actionLabel,
        actionUrl: businessOffer.actionUrl,
        startsAt: businessOffer.startsAt,
        endsAt: businessOffer.endsAt,
        welshTitle: offerTranslation.title,
        welshDescription: offerTranslation.description,
        welshTerms: offerTranslation.terms,
        welshActionLabel: offerTranslation.actionLabel,
        businessId: business.id,
        businessName: business.tradingName,
        businessSlug: business.slug,
        placeName: place.canonicalName,
        placeSlug: place.slug,
        categoryName: category.name,
        categorySlug: category.slug,
        fictional: business.isDemo,
      })
      .from(businessOffer)
      .leftJoin(
        offerTranslation,
        and(
          eq(offerTranslation.offerId, businessOffer.id),
          eq(offerTranslation.locale, "cy"),
        ),
      )
      .innerJoin(business, eq(business.id, businessOffer.businessId))
      .innerJoin(category, eq(category.id, business.primaryCategoryId))
      .innerJoin(
        businessLocation,
        and(
          eq(businessLocation.businessId, business.id),
          eq(businessLocation.isPrimary, true),
          eq(businessLocation.status, "active"),
        ),
      )
      .innerJoin(place, eq(place.id, businessLocation.placeId))
      .where(
        and(
          eq(businessOffer.id, parsed.data),
          eq(business.status, "published"),
          eq(businessOffer.status, "active"),
          or(isNull(businessOffer.startsAt), lte(businessOffer.startsAt, now)),
          or(
            isNull(businessOffer.endsAt),
            gte(businessOffer.endsAt, earliestEnd),
          ),
        ),
      )
      .limit(1);
    if (!row) return { state: "not_found" };

    const images = await loadContentImages([row.imageMediaId]);
    const welshReader = locale === "cy";
    const {
      imageMediaId,
      welshTitle,
      welshDescription,
      welshTerms,
      welshActionLabel,
      ...offer
    } = row;
    return {
      state: "found",
      offer: {
        ...offer,
        title: (welshReader && welshTitle) || offer.title,
        description: (welshReader && welshDescription) || offer.description,
        terms: (welshReader && offer.terms && welshTerms) || offer.terms,
        actionLabel:
          (welshReader && offer.actionLabel && welshActionLabel) ||
          offer.actionLabel,
        welshTitle: welshReader && !!welshTitle,
        welshDescription: welshReader && !!welshDescription,
        welshTerms: welshReader && !!offer.terms && !!welshTerms,
        welshActionLabel:
          welshReader && !!offer.actionLabel && !!welshActionLabel,
        image: (imageMediaId && images.get(imageMediaId)) || null,
        ended: !!offer.endsAt && offer.endsAt < now,
      },
    };
  } catch {
    return { state: "unavailable" };
  }
}

/**
 * Other live offers nearby and in the same line of business, never the
 * offer being read. Failure is quiet: the page is complete without them.
 */
export async function listRelatedOffers(
  offer: Pick<PublicOfferDetail, "id" | "categorySlug" | "placeSlug">,
  locale: "en" | "cy",
  limit = 3,
): Promise<PublicOffer[]> {
  const sameKind = await listPublicOffers({
    category: offer.categorySlug,
    place: offer.placeSlug,
    pageSize: limit + 1,
    locale,
  });
  const picked = sameKind.offers.filter((item) => item.id !== offer.id);
  if (picked.length >= limit) return picked.slice(0, limit);

  const nearby = await listPublicOffers({
    place: offer.placeSlug,
    pageSize: limit + 4,
    locale,
  });
  const seen = new Set([offer.id, ...picked.map((item) => item.id)]);
  for (const item of nearby.offers) {
    if (picked.length >= limit) break;
    if (!seen.has(item.id)) {
      picked.push(item);
      seen.add(item.id);
    }
  }
  return picked;
}
