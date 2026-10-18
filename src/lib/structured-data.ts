import type { PublicBusinessDetail } from "@/modules/businesses/types";
import type { PublicEvent } from "@/modules/events/public";
import {
  splitStoredLabels,
  type DietaryLabelKey,
  type MenuGroupShape,
} from "@/modules/businesses/menu-model";

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

  // Special days replace the weekly rule for their date, which is what
  // schema.org's specialOpeningHoursSpecification means (a plain
  // openingHoursSpecification would sit beside the weekly rule instead).
  // A closure is expressed as 00:00-00:00 bounded by validFrom/validThrough.
  const specialDays = business.openingExceptions.flatMap((exception) => {
    const [opens, closes] = exception.display.split("–");
    const opensMatch = opens ? timePattern.exec(opens) : null;
    const closesMatch = closes ? timePattern.exec(closes) : null;
    const isOpen = Boolean(opensMatch && closesMatch);
    if (!isOpen && exception.display !== "Closed") return [];
    return [
      {
        "@type": "OpeningHoursSpecification",
        opens: opensMatch?.[1] ?? "00:00",
        closes: closesMatch?.[1] ?? "00:00",
        validFrom: exception.date,
        validThrough: exception.date,
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
    ...(specialDays.length > 0
      ? { specialOpeningHoursSpecification: specialDays }
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
    ...(event.image ? { image: event.image.url } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    organizer: {
      "@type": "Organization",
      name: event.businessName,
      url: `${origin}/b/${event.businessSlug}`,
    },
  };
}

export type BreadcrumbItem = { name: string; path: string };

/**
 * Builds a schema.org `BreadcrumbList` from an ordered trail of site paths.
 *
 * Paths are made absolute against the origin. Demo pages and empty trails
 * return null so fictional data never reaches search engines.
 */
export function buildBreadcrumbJsonLd(
  items: readonly BreadcrumbItem[],
  origin: string,
  options: { demo?: boolean } = {},
): JsonLdObject | null {
  if (options.demo || items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${origin}${item.path}`,
    })),
  };
}

/**
 * `FAQPage` data from the owner's published question-and-answer pairs. Only
 * answered questions are included, demo records return null, and an empty
 * list returns null so no hollow structured data is emitted.
 */
export function buildFaqJsonLd(
  pairs: ReadonlyArray<{ question: string; answer: string }> | null,
  options: { demo?: boolean } = {},
): JsonLdObject | null {
  if (options.demo || !pairs || pairs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pairs.map((pair) => ({
      "@type": "Question",
      name: pair.question,
      acceptedAnswer: { "@type": "Answer", text: pair.answer },
    })),
  };
}

/** Serialises JSON-LD for a script tag, escaping `<` so it cannot close the tag. */
export function serializeJsonLd(value: JsonLdObject): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const dietUrls: Partial<Record<DietaryLabelKey, string>> = {
  vegetarian: "https://schema.org/VegetarianDiet",
  vegan: "https://schema.org/VeganDiet",
  "gluten-free": "https://schema.org/GlutenFreeDiet",
  halal: "https://schema.org/HalalDiet",
};

/**
 * Maps the public menu to a schema.org `Menu`. Dishes that are not available
 * today are left out, hidden sections never reach this function, and prices
 * are emitted only when they are one plain amount ("£4.50"); text such as
 * "from £5" stays on the page. Demo records return null.
 */
export function buildMenuJsonLd(
  input: {
    businessName: string;
    path: string;
    isDemo: boolean;
    groups: ReadonlyArray<MenuGroupShape>;
  },
  origin: string,
): JsonLdObject | null {
  if (input.isDemo) return null;
  const sections = input.groups.flatMap((group) => {
    const items = group.items.filter((item) => item.available);
    if (items.length === 0) return [];
    return [
      {
        "@type": "MenuSection",
        name: group.name,
        ...(group.description ? { description: group.description } : {}),
        hasMenuItem: items.map((item) => {
          const price = /^£(\d{1,4}\.\d{2})$/.exec(item.priceDisplay ?? "");
          const diets = splitStoredLabels(item.dietaryLabels)
            .keys.map((key) => dietUrls[key])
            .filter(Boolean);
          return {
            "@type": "MenuItem",
            name: item.name,
            ...(item.description ? { description: item.description } : {}),
            ...(price
              ? {
                  offers: {
                    "@type": "Offer",
                    price: price[1],
                    priceCurrency: "GBP",
                  },
                }
              : {}),
            ...(diets.length > 0 ? { suitableForDiet: diets } : {}),
          };
        }),
      },
    ];
  });
  if (sections.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Menu",
    name: `${input.businessName} menu`,
    url: `${origin}${input.path}`,
    hasMenuSection: sections,
  };
}
