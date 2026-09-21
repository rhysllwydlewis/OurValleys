import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BusinessRatingTag } from "@/components/business-rating-tag";
import { SavedPlaceControl } from "@/components/saved-place-control";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getInitials } from "@/lib/initials";
import { getPublicPageRobots } from "@/lib/release-stage";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import { listPublicEvents } from "@/modules/events/public";
import { listPublicGuidesForPlace } from "@/modules/guides/public";
import {
  getPlaceBySlug,
  listNearbyPlaces,
} from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

const coverageStatusLabel: Record<string, string> = {
  planned: "Planned coverage",
  seeding: "Growing coverage",
  pilot: "Pilot coverage",
  active: "Active coverage",
};

const KM_TO_MILES = 0.621371;

function formatEventDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const selectedPlace = await getPlaceBySlug(slug);

  return {
    title: selectedPlace
      ? `${selectedPlace.name} local businesses`
      : "Place not found",
    description: selectedPlace
      ? selectedPlace.editorialSummary
      : "The requested provisional place route is not available.",
    robots: getPublicPageRobots(),
  };
}

export default async function PlacePage({ params }: PageProps) {
  const { slug } = await params;
  const selectedPlace = await getPlaceBySlug(slug);
  if (!selectedPlace) notFound();

  const [result, eventsResult, guidesResult, nearbyPlaces] = await Promise.all([
    listPublishedBusinesses({ place: selectedPlace.slug }),
    listPublicEvents({ place: selectedPlace.slug, page: 1 }),
    listPublicGuidesForPlace(selectedPlace.id),
    listNearbyPlaces(selectedPlace.id),
  ]);

  const categoryCounts = new Map<
    string,
    { name: string; slug: string; count: number }
  >();
  if (result.state === "ready") {
    for (const business of result.businesses) {
      const existing = categoryCounts.get(business.category.slug);
      if (existing) {
        existing.count += 1;
      } else {
        categoryCounts.set(business.category.slug, {
          name: business.category.name,
          slug: business.category.slug,
          count: 1,
        });
      }
    }
  }
  const categories = [...categoryCounts.values()].sort(
    (a, b) => b.count - a.count,
  );

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="place-title">
          <p className="eyebrow">Explore a local area</p>
          <h1 id="place-title">{selectedPlace.name}</h1>
          {selectedPlace.welshName &&
          selectedPlace.welshName !== selectedPlace.name ? (
            <p className="body-copy">{selectedPlace.welshName}</p>
          ) : null}
          <p className="lead">{selectedPlace.editorialSummary}</p>
          <div className="tag-row">
            <span className="tag tag--quiet">
              {coverageStatusLabel[selectedPlace.coverageStatus] ??
                selectedPlace.coverageStatus}
            </span>
          </div>
          <div className="actions">
            <Link
              className="button primary"
              href={`/businesses?place=${selectedPlace.slug}` as Route}
            >
              Search in {selectedPlace.name}
            </Link>
            <Link className="button" href="/places">
              Browse all places
            </Link>
          </div>
        </section>

        <SavedPlaceControl
          placeId={selectedPlace.id}
          returnTo={`/places/${selectedPlace.slug}`}
        />

        {categories.length > 0 ? (
          <section aria-labelledby="place-categories-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">What is here</p>
                <h2 id="place-categories-title">Categories represented</h2>
              </div>
            </div>
            <div className="filter-row">
              {categories.map((entry) => (
                <Link
                  className="filter-chip"
                  key={entry.slug}
                  href={
                    `/businesses?place=${selectedPlace.slug}&category=${entry.slug}` as Route
                  }
                >
                  {entry.name} ({entry.count})
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Temporary problem</p>
            <h2>Local results are temporarily unavailable.</h2>
            <p>Please return after the data service has recovered.</p>
          </section>
        ) : result.businesses.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">No published demonstrations yet</p>
            <h2>No fictional businesses are listed here yet.</h2>
            <p>
              The place route is ready for future published businesses, events
              and guides without inventing real local content.
            </p>
            <Link className="button primary" href="/businesses">
              Explore all businesses
            </Link>
          </section>
        ) : (
          <section aria-labelledby="place-results-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Published demonstrations</p>
                <h2 id="place-results-title">
                  {result.businesses.length} local{" "}
                  {result.businesses.length === 1 ? "business" : "businesses"}
                </h2>
              </div>
              <p>Organic results · no paid placement</p>
            </div>
            <div className="business-grid">
              {result.businesses.map((business) => (
                <article className="business-card" key={business.id}>
                  <div className="business-card__art" aria-hidden="true">
                    <span className="business-card__initials">
                      {getInitials(business.tradingName)}
                    </span>
                    <span>{business.category.name}</span>
                  </div>
                  <div className="business-card__body">
                    <div className="tag-row">
                      {business.isDemo ? (
                        <span className="tag">Fictional demo</span>
                      ) : null}
                      <BusinessRatingTag rating={business.rating} />
                    </div>
                    <h3>{business.tradingName}</h3>
                    {business.welshName &&
                    business.welshName !== business.tradingName ? (
                      <p className="body-copy" lang="cy">
                        {business.welshName}
                      </p>
                    ) : null}
                    <p>{business.summary}</p>
                    <Link
                      className="text-link"
                      href={`/b/${business.slug}` as Route}
                    >
                      View generated website
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {eventsResult.state === "ready" && eventsResult.events.length > 0 ? (
          <section aria-labelledby="place-events-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">What is happening locally</p>
                <h2 id="place-events-title">
                  Upcoming events in {selectedPlace.name}
                </h2>
              </div>
              <Link
                className="text-link"
                href={`/events?place=${selectedPlace.slug}` as Route}
              >
                View all events
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
            <div className="business-grid">
              {eventsResult.events.slice(0, 4).map((event) => (
                <article
                  className="business-card business-card--simple"
                  key={event.id}
                >
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">
                        {event.fictional ? "Fictional demo" : "Local event"}
                      </span>
                    </div>
                    <p className="eyebrow">{formatEventDate(event.startsAt)}</p>
                    <h3>{event.title}</h3>
                    <p>By {event.businessName}</p>
                    <Link
                      className="text-link"
                      href={`/events/${event.id}` as Route}
                    >
                      View event details
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {guidesResult.state === "ready" && guidesResult.guides.length > 0 ? (
          <section aria-labelledby="place-guides-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Plan a local day</p>
                <h2 id="place-guides-title">
                  Guides covering {selectedPlace.name}
                </h2>
              </div>
              <Link className="text-link" href="/guides">
                Browse all guides
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
            <div className="business-grid">
              {guidesResult.guides.map((guide) => (
                <article
                  className="business-card business-card--simple"
                  key={guide.slug}
                >
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">{guide.readingTime}</span>
                    </div>
                    <h3>{guide.title}</h3>
                    <p>{guide.summary}</p>
                    <Link
                      className="text-link"
                      href={`/guides/${guide.slug}` as Route}
                    >
                      Read the guide
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {nearbyPlaces.length > 0 ? (
          <section aria-labelledby="place-nearby-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Close by</p>
                <h2 id="place-nearby-title">Nearby places</h2>
              </div>
            </div>
            <div className="filter-row">
              {nearbyPlaces.map((nearby) => (
                <Link
                  className="filter-chip"
                  key={nearby.slug}
                  href={`/places/${nearby.slug}` as Route}
                >
                  {nearby.name} · {(nearby.distanceKm * KM_TO_MILES).toFixed(1)}{" "}
                  mi
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
