import type { PublicBusinessDetail } from "@/modules/businesses/types";
import type { PublicEvent } from "@/modules/events/public";

type JsonLdObject = Record<string, unknown>;

const timePattern = /^(\d{2}:\d{2})(?::\d{2})?$/;

/**
 * Maps the public business projection to a schema.org `LocalBusiness`.
 *
 * Only public projection fields are read. The street address is deliberately
 * never emitted (the projection only carries a pre-joined display string, and
 * home-based businesses hide their address); the area is emitted instead.
 * Demo records return null so fictional data never reaches search engines.
 */
export function buildBusinessJsonLd(
  business: PublicBusinessDetail,
  origin: string,
): JsonLdObject | null {
  if (business.isDemo) return null;

  const openingHoursSpecification = business.openingHours.flatMap((hours) => {
    const [opens, closes] = hours.display.split("–");
    const opensMatch = opens ? timePattern.exec(opens) : null;
    const closesMatch = closes ? timePattern.exec(closes) : null;
    if (!opensMatch || !closesMatch) return [];
    return [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: hours.day,
        opens: opensMatch[1],
        closes: closesMatch[1],
      },
    ];
  });

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${origin}${business.site.platformPath}`,
    url: `${origin}${business.site.platformPath}`,
    name: business.tradingName,
    ...(business.welshName ? { alternateName: business.welshName } : {}),
    description: business.summary,
    ...(business.publicPhone ? { telephone: business.publicPhone } : {}),
    ...(business.publicEmail ? { email: business.publicEmail } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: business.place.name,
      addressCountry: "GB",
    },
    ...(openingHoursSpecification.length > 0
      ? { openingHoursSpecification }
      : {}),
    ...(business.rating.average !== null && business.rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: business.rating.average,
            reviewCount: business.rating.count,
          },
        }
      : {}),
  };
}

/**
 * Maps a public event to a schema.org `Event`.
 *
 * Only fields already on the public event projection are read. Attendance
 * mode and location are deliberately omitted: events may be online and the
 * projection only carries a free-text location display, so asserting a
 * physical `Place` or offline attendance could be wrong. The booking link is
 * not emitted as an offer because the projection carries no price. Demo records return null so fictional data
 * never reaches search engines.
 */
export function buildEventJsonLd(
  event: PublicEvent,
  origin: string,
): JsonLdObject | null {
  if (event.fictional) return null;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": `${origin}/events/${event.id}`,
    url: `${origin}/events/${event.id}`,
    name: event.title,
    description: event.description,
    startDate: event.startsAt.toISOString(),
    ...(event.endsAt ? { endDate: event.endsAt.toISOString() } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    organizer: {
      "@type": "Organization",
      name: event.businessName,
      url: `${origin}/b/${event.businessSlug}`,
    },
  };
}

/** Serialises JSON-LD for a script tag, escaping `<` so it cannot close the tag. */
export function serializeJsonLd(value: JsonLdObject): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
