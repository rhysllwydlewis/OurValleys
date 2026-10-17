import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import {
  business,
  businessTranslation,
  service,
  serviceTranslation,
} from "@/lib/database/schema/business";
import {
  emptyTranslation,
  type BusinessTranslationText,
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

export type WelshContent = {
  translation: BusinessTranslationText;
  services: TranslatableService[];
  serviceIdsByName: Map<string, string>;
};

export async function readWelshContent(
  businessId: string,
): Promise<WelshContent> {
  const database = getDatabase();
  const [rows, [header]] = await Promise.all([
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
  ]);

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
      updatedAt: header?.updatedAt ?? null,
    },
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
  value: Omit<BusinessTranslationText, "updatedAt">;
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

/** The English record the Welsh editor sits beside. */
export async function readEnglishBusinessText(
  businessId: string,
): Promise<EnglishBusinessText | null> {
  try {
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
  } catch {
    return null;
  }
}
