import "server-only";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/lib/database/client";
import { business, businessPublication, businessSite } from "@/lib/database/schema/business";
import { businessSlugRedirect } from "@/lib/database/schema/business-operations";
import {
  getBusinessMenuDocument,
  listBusinessEvents,
  listBusinessMenu,
  listBusinessOffers,
  listCategorySections,
  type BusinessDocumentView,
  type CategorySectionView,
  type EventView,
  type MenuGroupView,
  type OfferView,
} from "./content-features";
import {
  listPublicContactActions,
  type PublicContactAction,
} from "./contacts-and-enquiries";
import { getBusinessLifecycleView, type BusinessLifecycleState } from "./lifecycle-automation";

export type PublicBusinessOperations = {
  contacts: PublicContactAction[];
  offers: OfferView[];
  events: EventView[];
  menu: MenuGroupView[];
  categorySections: CategorySectionView[];
  menuDocument: BusinessDocumentView | null;
  lifecycleState: BusinessLifecycleState;
  temporaryClosedUntil: Date | null;
};

export const emptyPublicBusinessOperations: PublicBusinessOperations = {
  contacts: [],
  offers: [],
  events: [],
  menu: [],
  categorySections: [],
  menuDocument: null,
  lifecycleState: "active",
  temporaryClosedUntil: null,
};

export async function getPublicBusinessOperations(
  businessId: string,
): Promise<PublicBusinessOperations> {
  const [contacts, offers, events, menu, categorySections, menuDocument, lifecycle] =
    await Promise.all([
      listPublicContactActions(businessId),
      listBusinessOffers(businessId, true),
      listBusinessEvents(businessId, true),
      listBusinessMenu(businessId, true),
      listCategorySections(businessId, true),
      getBusinessMenuDocument(businessId),
      getBusinessLifecycleView(businessId),
    ]);

  return {
    contacts,
    offers,
    events,
    menu,
    categorySections,
    menuDocument,
    lifecycleState: lifecycle?.state ?? "active",
    temporaryClosedUntil: lifecycle?.temporaryClosedUntil ?? null,
  };
}

export async function resolvePublishedBusinessRedirect(
  slug: string,
): Promise<string | null> {
  try {
    const database = getDatabase();
    const [row] = await database
      .select({ toSlug: businessSlugRedirect.toSlug })
      .from(businessSlugRedirect)
      .innerJoin(business, eq(business.id, businessSlugRedirect.businessId))
      .innerJoin(
        businessPublication,
        eq(businessPublication.businessId, business.id),
      )
      .innerJoin(businessSite, eq(businessSite.businessId, business.id))
      .where(
        and(
          eq(businessSlugRedirect.fromSlug, slug),
          eq(business.status, "published"),
          eq(businessPublication.status, "published"),
          eq(businessSite.status, "published"),
        ),
      )
      .limit(1);
    return row?.toSlug ?? null;
  } catch {
    return null;
  }
}
