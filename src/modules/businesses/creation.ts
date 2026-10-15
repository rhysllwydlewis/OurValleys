import "server-only";
import { and, eq, ne, or, sql } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessMembership,
  category,
  place,
} from "@/lib/database/schema/business";
import { businessSlugRedirect } from "@/lib/database/schema/business-operations";
import { businessOnboardingDraft } from "@/lib/database/schema/onboarding";
import { businessPermissions } from "@/modules/identity/access-policy";
import { recordAdminAudit } from "@/modules/identity/audit-log";
import { slugifyBusinessName } from "./slug";
import {
  foldBusinessName,
  rankSimilarBusinesses,
  type NameMatchKind,
} from "./start-journey";

/**
 * Phase 2 of docs/32: a verified user creates a new business draft with an
 * owner membership, a clean slug and an audit event. Claims against existing
 * businesses are a later phase; the duplicate search below only surfaces
 * published (public) businesses so drafts never leak.
 */

const welshNameSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.string().max(120).nullable(),
);

export const businessCreationSchema = z.object({
  tradingName: z.string().trim().min(2).max(120),
  welshName: welshNameSchema,
  primaryCategoryId: z.uuid(),
  placeId: z.uuid(),
  businessType: z.enum(["premises", "service_area", "online"]),
});

export type BusinessCreationInput = z.infer<typeof businessCreationSchema>;

export type SimilarBusiness = {
  id: string;
  slug: string;
  tradingName: string;
  welshName: string | null;
  placeName: string | null;
  categoryName: string | null;
  /** How alike the name is: the same name, a close one, or just a possible one. */
  matchKind: NameMatchKind;
};

/** Bounds how many active businesses one account can own outright. */
export const maxOwnedBusinesses = 5;

const slugAttemptLimit = 10;

const candidateLimit = 40;

/**
 * Published businesses whose English or Welsh name could be the one being
 * entered. The database narrows by accent-folded word and trigram similarity;
 * the pure ranking in `start-journey.ts` then decides what is worth showing.
 * Only public fields are read, so drafts and private data never surface.
 */
export async function findSimilarPublishedBusinesses(
  tradingName: string,
  options: { placeId?: string | null } = {},
): Promise<SimilarBusiness[]> {
  const trimmed = tradingName.trim().slice(0, 120);
  if (trimmed.length < 2) return [];

  const tokens = Array.from(
    new Set(
      foldBusinessName(trimmed)
        .split(" ")
        .filter((token) => token.length >= 3),
    ),
  ).slice(0, 6);
  const escape = (value: string) => value.replace(/[%_\\]/g, "\\$&");
  const tokenClauses = tokens.map(
    (token) =>
      sql`(lower(public.ourvalleys_unaccent(${business.tradingName})) like ${`%${escape(token)}%`}
        or lower(public.ourvalleys_unaccent(coalesce(${business.welshName}, ''))) like ${`%${escape(token)}%`})`,
  );
  const folded = foldBusinessName(trimmed);

  try {
    const database = getDatabase();
    const rows = await database
      .select({
        id: business.id,
        slug: business.slug,
        tradingName: business.tradingName,
        welshName: business.welshName,
        placeId: sql<string | null>`(
          select business_location.place_id
          from business_location
          where business_location.business_id = ${business.id}
            and business_location.is_primary = true
          limit 1
        )`,
        placeName: sql<string | null>`(
          select ${place.canonicalName}
          from business_location
          inner join ${place} on ${place.id} = business_location.place_id
          where business_location.business_id = ${business.id}
            and business_location.is_primary = true
          limit 1
        )`,
        categoryName: category.name,
      })
      .from(business)
      .leftJoin(category, eq(category.id, business.primaryCategoryId))
      .where(
        and(
          eq(business.status, "published"),
          or(
            ...tokenClauses,
            sql`similarity(lower(public.ourvalleys_unaccent(${business.tradingName})), ${folded}) > 0.3`,
            sql`similarity(lower(public.ourvalleys_unaccent(coalesce(${business.welshName}, ''))), ${folded}) > 0.3`,
          ),
        ),
      )
      .limit(candidateLimit);

    return rankSimilarBusinesses(trimmed, rows, {
      placeId: options.placeId ?? null,
    }).map((match) => ({
      id: match.id,
      slug: match.slug,
      tradingName: match.tradingName,
      welshName: match.welshName ?? null,
      placeName: match.placeName,
      categoryName: match.categoryName,
      matchKind: match.matchKind,
    }));
  } catch {
    return [];
  }
}

export type CreateBusinessResult =
  | { status: "created"; businessId: string; slug: string }
  | { status: "invalid"; message: string }
  | { status: "limit" }
  | { status: "unavailable" };

export async function createBusinessDraft(input: {
  userId: string;
  creation: BusinessCreationInput;
}): Promise<CreateBusinessResult> {
  const parsed = businessCreationSchema.safeParse(input.creation);
  if (!parsed.success) {
    return {
      status: "invalid",
      message: "Check the business name, category and location and try again.",
    };
  }

  const creation = parsed.data;

  try {
    const database = getDatabase();

    const [activeCategory] = await database
      .select({ id: category.id })
      .from(category)
      .where(
        and(
          eq(category.id, creation.primaryCategoryId),
          eq(category.status, "active"),
        ),
      )
      .limit(1);
    if (!activeCategory) {
      return { status: "invalid", message: "Choose an available category." };
    }

    const [activePlace] = await database
      .select({ id: place.id, slug: place.slug })
      .from(place)
      .where(and(eq(place.id, creation.placeId), eq(place.status, "active")))
      .limit(1);
    if (!activePlace) {
      return { status: "invalid", message: "Choose an available location." };
    }

    const [ownedRow] = await database
      .select({ ownedCount: sql<number>`count(*)::int` })
      .from(businessMembership)
      .innerJoin(business, eq(business.id, businessMembership.businessId))
      .where(
        and(
          eq(businessMembership.userId, input.userId),
          eq(businessMembership.role, "owner"),
          eq(businessMembership.status, "active"),
          eq(business.isDemo, false),
          ne(business.status, "removed"),
        ),
      );
    if ((ownedRow?.ownedCount ?? 0) >= maxOwnedBusinesses) {
      return { status: "limit" };
    }

    const slug = await findAvailableSlug(
      creation.tradingName,
      activePlace.slug,
    );
    if (!slug) {
      return {
        status: "invalid",
        message:
          "A web address could not be generated from this name. Adjust the business name slightly and try again.",
      };
    }

    const created = await database.transaction(async (transaction) => {
      const [createdBusiness] = await transaction
        .insert(business)
        .values({
          tradingName: creation.tradingName,
          welshName: creation.welshName,
          slug,
          summary: "",
          description: "",
          primaryCategoryId: creation.primaryCategoryId,
          businessType: creation.businessType,
          status: "draft",
          claimStatus: "claimed",
          createdByUserId: input.userId,
        })
        .returning({ id: business.id, slug: business.slug });
      if (!createdBusiness) {
        throw new Error("Business insert returned no row.");
      }

      await transaction.insert(businessMembership).values({
        businessId: createdBusiness.id,
        userId: input.userId,
        role: "owner",
        permissions: Object.values(businessPermissions),
        status: "active",
        acceptedAt: new Date(),
      });

      await transaction.insert(businessOnboardingDraft).values({
        businessId: createdBusiness.id,
        location: {
          placeId: creation.placeId,
          locationType: creation.businessType,
          publicAddressVisibility: "service_area_only",
          publicAddressLineOne: null,
          publicLocality: null,
          publicPostcode: null,
          privateAddressLineOne: null,
          privatePostcode: null,
        },
      });

      return createdBusiness;
    });

    await recordAdminAudit({
      actorUserId: input.userId,
      action: "business.created",
      targetType: "business",
      targetId: created.id,
      metadata: { slug: created.slug },
    });

    return { status: "created", businessId: created.id, slug: created.slug };
  } catch {
    return { status: "unavailable" };
  }
}

async function findAvailableSlug(
  tradingName: string,
  placeSlug: string,
): Promise<string | null> {
  const base = slugifyBusinessName(tradingName);
  if (!base) return null;

  const database = getDatabase();
  const candidates = [base, `${base}-${placeSlug}`];
  for (let suffix = 2; suffix <= slugAttemptLimit; suffix += 1) {
    candidates.push(`${base}-${placeSlug}-${suffix}`);
  }

  for (const candidate of candidates) {
    const [existing] = await database
      .select({ id: business.id })
      .from(business)
      .where(eq(business.slug, candidate))
      .limit(1);
    if (existing) continue;
    // An address another business used before still redirects there.
    const [redirected] = await database
      .select({ id: businessSlugRedirect.id })
      .from(businessSlugRedirect)
      .where(eq(businessSlugRedirect.fromSlug, candidate))
      .limit(1);
    if (!redirected) return candidate;
  }

  return null;
}
