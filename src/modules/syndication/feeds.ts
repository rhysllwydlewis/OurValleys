import { getSiteUrl } from "@/lib/site";
import type { AtomFeed } from "@/lib/atom";
import { truncateForFeed } from "@/lib/atom";
import type { PublicOffer } from "@/modules/businesses/public-offers";
import type { PublicBusinessSummary } from "@/modules/businesses/types";
import type { PublicEvent } from "@/modules/events/public";
import type { PublicStory } from "@/modules/stories/public";

const DEMO_PREFIX = "[Demo] ";

function absolute(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}

function latest(dates: Date[], fallback: Date): Date {
  return dates.reduce((a, b) => (b > a ? b : a), fallback);
}

export function buildEventsAtom(
  events: readonly PublicEvent[],
  now: Date,
): AtomFeed {
  return {
    id: absolute("/events"),
    title: "OurValleys local events",
    subtitle: "Upcoming events from local businesses and organisations.",
    selfUrl: absolute("/events/feed.xml"),
    alternateUrl: absolute("/events"),
    updated: latest(
      events.map((e) => e.startsAt).filter((d) => d <= now),
      now,
    ),
    entries: events.map((event) => {
      const when = event.startsAt.toUTCString();
      const where = event.locationDisplay ? ` at ${event.locationDisplay}` : "";
      return {
        id: absolute(`/events/${event.id}`),
        title: `${event.fictional ? DEMO_PREFIX : ""}${event.title}`,
        url: absolute(`/events/${event.id}`),
        updated: now,
        summary: truncateForFeed(
          `${event.businessName}, ${when}${where}. ${event.description}`,
        ),
      };
    }),
  };
}

export function buildOffersAtom(
  offers: readonly PublicOffer[],
  now: Date,
): AtomFeed {
  return {
    id: absolute("/offers"),
    title: "OurValleys local offers",
    subtitle: "Current offers from local businesses and organisations.",
    selfUrl: absolute("/offers/feed.xml"),
    alternateUrl: absolute("/offers"),
    updated: now,
    entries: offers.map((offer) => ({
      id: absolute(`/b/${offer.businessSlug}#offer-${offer.id}`),
      title: `${offer.fictional ? DEMO_PREFIX : ""}${offer.title} – ${offer.businessName}`,
      url: absolute(`/b/${offer.businessSlug}`),
      updated: now,
      summary: truncateForFeed(
        offer.terms
          ? `${offer.description} Terms: ${offer.terms}`
          : offer.description,
      ),
    })),
  };
}

export function buildBusinessesAtom(
  businesses: readonly PublicBusinessSummary[],
): AtomFeed {
  return {
    id: absolute("/businesses"),
    title: "New on OurValleys",
    subtitle: "Newly listed local businesses and organisations.",
    selfUrl: absolute("/businesses/feed.xml"),
    alternateUrl: absolute("/businesses"),
    updated: latest(
      businesses.map((b) => new Date(b.publishedAt ?? b.updatedAt)),
      new Date(0),
    ),
    entries: businesses.map((business) => ({
      id: absolute(`/b/${business.slug}`),
      title: `${business.isDemo ? DEMO_PREFIX : ""}${business.tradingName}`,
      url: absolute(`/b/${business.slug}`),
      // Raw-SQL rows can carry timestamps as strings; normalise before formatting.
      updated: new Date(business.updatedAt),
      published: business.publishedAt
        ? new Date(business.publishedAt)
        : undefined,
      summary: truncateForFeed(
        `${business.category.name} in ${business.place.name}. ${business.summary}`,
      ),
    })),
  };
}

/**
 * Local stories, newest first. Sponsored stories say so in the summary, so a
 * feed reader never shows paid-for content unlabelled.
 */
export function buildStoriesAtom(
  stories: readonly PublicStory[],
  now: Date,
): AtomFeed {
  return {
    id: absolute("/news"),
    title: "OurValleys local news",
    subtitle: "Short local stories written by the OurValleys team.",
    selfUrl: absolute("/news/feed.xml"),
    alternateUrl: absolute("/news"),
    updated: latest(
      stories.map((story) => story.updatedAt).filter((date) => date <= now),
      stories.at(0)?.publishedAt ?? now,
    ),
    entries: stories.map((story) => ({
      id: absolute(`/news/${story.slug}`),
      title: story.title,
      url: absolute(`/news/${story.slug}`),
      updated: story.updatedAt,
      ...(story.publishedAt ? { published: story.publishedAt } : {}),
      summary: truncateForFeed(
        story.sponsorshipDisclosure
          ? `Sponsored. ${story.summary}`
          : story.summary,
      ),
    })),
  };
}
