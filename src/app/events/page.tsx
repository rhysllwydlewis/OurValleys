import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listPublicEvents } from "@/modules/events/public";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listActivePlaces } from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local events",
  description:
    "Discover upcoming fictional events supplied by published local businesses and organisations.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  place?: string | string[];
  page?: string | string[];
}>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parsePage(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function buildFilterHref(filters: {
  q?: string;
  category?: string;
  place?: string;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.place) params.set("place", filters.place);
  if (filters.page && filters.page > 1)
    params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/events?${query}` : "/events";
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const values = await searchParams;
  const query = firstValue(values.q).slice(0, 80);
  const category = firstValue(values.category).slice(0, 80);
  const place = firstValue(values.place).slice(0, 80);
  const page = parsePage(firstValue(values.page));
  const [result, places, categories] = await Promise.all([
    listPublicEvents({ query, category, place, page }),
    listActivePlaces(),
    listActiveCategories(),
  ]);

  const selectedPlace = places.find((option) => option.slug === place);
  const selectedCategory = categories.find(
    (option) => option.slug === category,
  );
  const activeFilters = [
    query
      ? {
          label: `Search: ${query}`,
          removeHref: buildFilterHref({ category, place }),
          removeLabel: `Remove search term ${query}`,
        }
      : null,
    category
      ? {
          label: `Category: ${selectedCategory?.name ?? category}`,
          removeHref: buildFilterHref({ q: query, place }),
          removeLabel: `Remove category filter ${selectedCategory?.name ?? category}`,
        }
      : null,
    place
      ? {
          label: `Place: ${selectedPlace?.name ?? place}`,
          removeHref: buildFilterHref({ q: query, category }),
          removeLabel: `Remove place filter ${selectedPlace?.name ?? place}`,
        }
      : null,
  ].filter((filter) => filter !== null);

  return (
    <>
      <SiteHeader />
      <main className="businesses-page">
        <section className="businesses-hero" aria-labelledby="events-title">
          <p className="eyebrow">What is happening locally</p>
          <h1 id="events-title">Find your next local event.</h1>
          <p className="lead">
            Browse active event demonstrations from published local businesses.
            Events disappear automatically when they finish or are withdrawn.
          </p>
          <div className="actions">
            <Link className="button primary" href="/places">
              Explore local places
            </Link>
            <Link className="button" href="/businesses">
              Browse businesses
            </Link>
          </div>
        </section>

        <form className="search-panel ov-glass" action="/events" method="get">
          <div className="field">
            <label htmlFor="event-query">Search events</label>
            <input
              id="event-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Try carnival, half term or a venue name"
              maxLength={80}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="event-category">Category</label>
            <select
              id="event-category"
              name="category"
              defaultValue={selectedCategory ? category : ""}
            >
              <option value="">All categories</option>
              {categories.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="event-place">Place</label>
            <select
              id="event-place"
              name="place"
              defaultValue={selectedPlace ? place : ""}
            >
              <option value="">All covered areas</option>
              {places.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <button className="button primary" type="submit">
            Filter events
          </button>
        </form>

        {activeFilters.length > 0 ? (
          <div className="filter-row" aria-label="Active event filters">
            <span className="filter-row__label">Filtering by:</span>
            {activeFilters.map((filter) => (
              <Link
                className="filter-chip"
                href={filter.removeHref as Route}
                key={filter.label}
                aria-label={filter.removeLabel}
              >
                {filter.label}
                <span aria-hidden="true"> ×</span>
              </Link>
            ))}
            <Link className="filter-row__clear" href="/events">
              Clear all
            </Link>
          </div>
        ) : null}

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Temporary problem</p>
            <h2>Local events are temporarily unavailable.</h2>
            <p>
              The event service could not be reached. Business and place
              discovery remain available while it recovers.
            </p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                Browse businesses
              </Link>
              <Link className="button" href="/">
                Return home
              </Link>
            </div>
          </section>
        ) : result.events.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Developing local coverage</p>
            <h2>
              {activeFilters.length > 0
                ? "No upcoming events match these filters."
                : "No upcoming event demonstrations are published yet."}
            </h2>
            <p>
              This directory is ready for active events without inventing real
              local listings or displaying expired content.
            </p>
            <div className="actions">
              {activeFilters.length > 0 ? (
                <Link className="button primary" href="/events">
                  Clear filters
                </Link>
              ) : null}
              <Link className="button" href="/businesses">
                Discover local businesses
              </Link>
            </div>
          </section>
        ) : (
          <section
            className="business-results"
            aria-labelledby="event-results-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Upcoming demonstrations</p>
                <h2 id="event-results-title">
                  {result.total} upcoming event
                  {result.total === 1 ? "" : "s"}
                </h2>
              </div>
              <p>
                Active events from published businesses only · page{" "}
                {result.page}
                {result.totalPages > 0 ? ` of ${result.totalPages}` : ""}
              </p>
            </div>
            <div className="business-grid">
              {result.events.map((event) => (
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
                    <p className="eyebrow">{formatDate(event.startsAt)}</p>
                    <h3>{event.title}</h3>
                    <p>
                      By{" "}
                      <Link href={`/b/${event.businessSlug}` as Route}>
                        {event.businessName}
                      </Link>
                    </p>
                    {event.locationDisplay ? (
                      <p>{event.locationDisplay}</p>
                    ) : null}
                    <p>{event.description}</p>
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
            {result.hasPreviousPage || result.hasNextPage ? (
              <nav className="actions" aria-label="Event pages">
                {result.hasPreviousPage ? (
                  <Link
                    className="button"
                    rel="prev"
                    href={
                      buildFilterHref({
                        q: query,
                        category,
                        place,
                        page: result.page - 1,
                      }) as Route
                    }
                  >
                    ← Previous
                  </Link>
                ) : null}
                {result.hasNextPage ? (
                  <Link
                    className="button primary"
                    rel="next"
                    href={
                      buildFilterHref({
                        q: query,
                        category,
                        place,
                        page: result.page + 1,
                      }) as Route
                    }
                  >
                    Next →
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
