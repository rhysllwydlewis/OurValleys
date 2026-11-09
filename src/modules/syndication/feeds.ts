import { getSiteUrl } from "@/lib/site";
import type { AtomFeed } from "@/lib/atom";
import { truncateForFeed } from "@/lib/atom";
import type { PublicOffer } from "@/modules/businesses/public-offers";
import type { PublicBusinessSummary } from "@/modules/businesses/types";
import type { PublicEvent } from "@/modules/events/public";
import type { PublicStory } from "@/modules/stories/public";
import type {
  PublicFeedUpdate,
  PublicUpdate,
} from "@/modules/businesses/public-updates";
import { EVENT_COST_WORDS_EN, eventCostSummary } from "@/modules/events/cost";

/** " (Free · Step-free access)" for a feed summary; empty when nothing was stated. */
function costNote(event: Parameters<typeof eventCostSummary>[0]): string {
  const summary = eventCostSummary(event, EVENT_COST_WORDS_EN);
  return summary ? ` (${summary})` : "";
}

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
          `${event.businessName}, ${when}${where}${costNote(event)}. ${event.description}`,
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

function updateEntry(
  update: PublicUpdate,
  businessName: string,
  businessSlug: string,
  fictional: boolean,
  now: Date,
) {
  const url = absolute(`/b/${businessSlug}/updates/${update.id}`);
  const edited = update.updatedAt <= now ? update.updatedAt : now;
  return {
    // The entry's identity must survive a business slug change.
    id: `urn:uuid:${update.id}`,
    title: `${fictional ? DEMO_PREFIX : ""}${update.title} – ${businessName}`,
    url,
    updated: edited,
    published: update.publishedAt,
    summary: truncateForFeed(update.body),
  };
}

/** Published updates from every local business, newest first. */
export function buildUpdatesAtom(
  updates: readonly PublicFeedUpdate[],
  now: Date,
): AtomFeed {
  return {
    id: absolute("/updates"),
    title: "OurValleys local updates",
    subtitle: "News and notices posted by local businesses.",
    selfUrl: absolute("/updates/feed.xml"),
    alternateUrl: absolute("/updates"),
    updated: latest(
      updates.map((u) => u.updatedAt).filter((d) => d <= now),
      new Date(0),
    ),
    entries: updates.map((u) =>
      updateEntry(u, u.businessName, u.businessSlug, u.fictional, now),
    ),
  };
}

/** One business's published updates, newest first. */
export function buildBusinessUpdatesAtom(
  business: { name: string; slug: string; fictional: boolean },
  updates: readonly PublicUpdate[],
  now: Date,
): AtomFeed {
  const base = `/b/${business.slug}/updates`;
  return {
    id: absolute(base),
    title: `${business.fictional ? DEMO_PREFIX : ""}Updates from ${business.name}`,
    subtitle: `News and notices posted by ${business.name}.`,
    selfUrl: absolute(`${base}/feed.xml`),
    alternateUrl: absolute(base),
    updated: latest(
      updates.map((u) => u.updatedAt).filter((d) => d <= now),
      new Date(0),
    ),
    entries: updates.map((u) =>
      updateEntry(u, business.name, business.slug, business.fictional, now),
    ),
  };
}

type FeedBusiness = { name: string; slug: string; fictional: boolean };

/** One business's live offers. Entry identity survives a slug change. */
export function buildBusinessOffersAtom(
  business: FeedBusiness,
  offers: readonly PublicOffer[],
  now: Date,
): AtomFeed {
  const base = `/b/${business.slug}`;
  return {
    id: absolute(`${base}/offers`),
    title: `${business.fictional ? DEMO_PREFIX : ""}Offers from ${business.name}`,
    subtitle: `Current offers from ${business.name}.`,
    selfUrl: absolute(`${base}/offers/feed.xml`),
    alternateUrl: absolute(base),
    updated: now,
    entries: offers.map((offer) => ({
      id: `urn:uuid:${offer.id}`,
      title: `${business.fictional ? DEMO_PREFIX : ""}${offer.title} – ${business.name}`,
      url: absolute(`/offers/${offer.id}`),
      updated: now,
      summary: truncateForFeed(
        offer.terms
          ? `${offer.description} Terms: ${offer.terms}`
          : offer.description,
      ),
    })),
  };
}

/** One business's upcoming events, soonest first. */
export function buildBusinessEventsAtom(
  business: FeedBusiness,
  events: readonly PublicEvent[],
  now: Date,
): AtomFeed {
  const base = `/b/${business.slug}`;
  return {
    id: absolute(`${base}/events`),
    title: `${business.fictional ? DEMO_PREFIX : ""}Events from ${business.name}`,
    subtitle: `Upcoming events from ${business.name}.`,
    selfUrl: absolute(`${base}/events/feed.xml`),
    alternateUrl: absolute(base),
    updated: latest(
      events.map((e) => e.startsAt).filter((d) => d <= now),
      now,
    ),
    entries: events.map((event) => {
      const where = event.locationDisplay ? ` at ${event.locationDisplay}` : "";
      return {
        id: `urn:uuid:${event.id}`,
        title: `${business.fictional ? DEMO_PREFIX : ""}${event.title}`,
        url: absolute(`/events/${event.id}`),
        updated: now,
        summary: truncateForFeed(
          `${event.startsAt.toUTCString()}${where}${costNote(event)}. ${event.description}`,
        ),
      };
    }),
  };
}
