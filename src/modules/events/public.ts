import "server-only";

import { and, asc, eq, gte, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { getDatabase } from "@/lib/database/client";
import { business } from "@/lib/database/schema/business";
import { businessEvent } from "@/lib/database/schema/business-operations";

export type PublicEvent = {
  id: string;
  title: string;
  description: string;
  locationDisplay: string | null;
  startsAt: Date;
  endsAt: Date | null;
  bookingUrl: string | null;
  businessName: string;
  businessSlug: string;
  fictional: boolean;
};

export type PublicEventListResult =
  | { state: "ready"; events: PublicEvent[] }
  | { state: "unavailable"; events: [] };

export type PublicEventDetailResult =
  | { state: "found"; event: PublicEvent }
  | { state: "not_found" }
  | { state: "unavailable" };

const eventIdSchema = z.uuid();

const publicEventSelection = {
  id: businessEvent.id,
  title: businessEvent.title,
  description: businessEvent.description,
  locationDisplay: businessEvent.locationDisplay,
  startsAt: businessEvent.startsAt,
  endsAt: businessEvent.endsAt,
  bookingUrl: businessEvent.bookingUrl,
  businessName: business.tradingName,
  businessSlug: business.slug,
  fictional: business.isDemo,
};

function publicLifecycleFilter(now: Date) {
  return and(
    eq(business.status, "published"),
    eq(businessEvent.status, "active"),
    or(
      and(isNull(businessEvent.endsAt), gte(businessEvent.startsAt, now)),
      gte(businessEvent.endsAt, now),
    ),
  );
}

export async function listPublicEvents(): Promise<PublicEventListResult> {
  try {
    const database = getDatabase();
    const events = await database
      .select(publicEventSelection)
      .from(businessEvent)
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .where(publicLifecycleFilter(new Date()))
      .orderBy(asc(businessEvent.startsAt))
      .limit(100);

    return { state: "ready", events };
  } catch {
    return { state: "unavailable", events: [] };
  }
}

export async function getPublicEvent(
  eventId: string,
): Promise<PublicEventDetailResult> {
  if (!eventIdSchema.safeParse(eventId).success) return { state: "not_found" };

  try {
    const database = getDatabase();
    const [event] = await database
      .select(publicEventSelection)
      .from(businessEvent)
      .innerJoin(business, eq(business.id, businessEvent.businessId))
      .where(
        and(
          eq(businessEvent.id, eventId),
          publicLifecycleFilter(new Date()),
        ),
      )
      .limit(1);

    return event ? { state: "found", event } : { state: "not_found" };
  } catch {
    return { state: "unavailable" };
  }
}
