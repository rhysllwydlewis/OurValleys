import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { BusinessRatingTag } from "@/components/business-rating-tag";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getInitials } from "@/lib/initials";
import { getPublicPageRobots } from "@/lib/release-stage";
import { recordSearchAppearances } from "@/modules/businesses/analytics";
import { listPublishedBusinesses } from "@/modules/businesses/public";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listActivePlaces } from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local businesses",
  description:
    "Search local businesses and services across Rhondda Cynon Taf by need, category and place.",
  robots: getPublicPageRobots(),
};

type SearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  place?: string | string[];
  openNow?: string | string[];
  verified?: string | string[];
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
  openNow?: boolean;
  verified?: boolean;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.place) params.set("place", filters.place);
  if (filters.openNow) params.set("openNow", "1");
  if (filters.verified) params.set("verified", "1");
  if (filters.page && filters.page > 1)
    params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/businesses?${query}` : "/businesses";
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const values = await searchParams;
  const query = firstValue(values.q).slice(0, 80);
  const category = firstValue(values.category).slice(0, 80);
  const place = firstValue(values.place).slice(0, 80);
  const openNow = firstValue(values.openNow) === "1";
  const verified = firstValue(values.verified) === "1";
  const page = parsePage(firstValue(values.page));
  const [result, places, categories] = await Promise.all([
    listPublishedBusinesses({
      query,
      category,
      place,
      openNow,
      verifiedOnly: verified,
      page,
    }),
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
          removeHref: buildFilterHref({ category, place, openNow, verified }),
          removeLabel: `Remove search term ${query}`,
        }
      : null,
    category
      ? {
          label: `Category: ${selectedCategory?.name ?? category}`,
          removeHref: buildFilterHref({ q: query, place, openNow, verified }),
          removeLabel: `Remove category filter ${selectedCategory?.name ?? category}`,
        }
      : null,
    place
      ? {
          label: `Place: ${selectedPlace?.name ?? place}`,
          removeHref: buildFilterHref({
            q: query,
            category,
            openNow,
            verified,
          }),
          removeLabel: `Remove place filter ${selectedPlace?.name ?? place}`,
        }
      : null,
    openNow
      ? {
          label: "Open now",
          removeHref: buildFilterHref({ q: query, category, place, verified }),
          removeLabel: "Remove open now filter",
        }
      : null,
    verified
      ? {
          label: "Verified only",
          removeHref: buildFilterHref({ q: query, category, place, openNow }),
          removeLabel: "Remove verified only filter",
        }
      : null,
  ].filter((filter) => filter !== null);

  if (result.state === "ready" && result.businesses.length > 0) {
    await recordSearchAppearances(result.businesses.map((item) => item.id));
  }

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="directory-title">
          <p className="eyebrow">Local business discovery</p>
          <h1 id="directory-title">Find something useful nearby.</h1>
          <p className="lead">
            Search business names, services and everyday terms. Welsh and
            English category aliases help useful local results surface without
            hidden paid ranking.
          </p>
        </section>

        <form
          className="search-panel ov-glass"
          action="/businesses"
          method="get"
        >
          <div className="field">
            <label htmlFor="business-query">What do you need?</label>
            <input
              id="business-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Try boiler repair, café or plymwr"
              maxLength={80}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="business-category">Category</label>
            <select
              id="business-category"
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
            <label htmlFor="business-place">Place</label>
            <select
              id="business-place"
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
          <label
            className="checkbox-field search-panel__checkbox"
            htmlFor="business-open-now"
          >
            <input
              id="business-open-now"
              name="openNow"
              type="checkbox"
              value="1"
              defaultChecked={openNow}
            />
            Open now
          </label>
          <label
            className="checkbox-field search-panel__checkbox"
            htmlFor="business-verified"
          >
            <input
              id="business-verified"
              name="verified"
              type="checkbox"
              value="1"
              defaultChecked={verified}
            />
            Verified only
          </label>
          <button className="button primary" type="submit">
            Search businesses
          </button>
        </form>

        {activeFilters.length > 0 ? (
          <div className="filter-row" aria-label="Active search filters">
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
            <Link className="filter-row__clear" href="/businesses">
              Clear all
            </Link>
          </div>
        ) : null}

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Temporary problem</p>
            <h2>Business discovery is temporarily unavailable.</h2>
            <p>
              The public site is still available. Please try this search again
              after the data service has recovered.
            </p>
          </section>
        ) : result.businesses.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">No exact matches</p>
            <h2>No businesses match these filters.</h2>
            <p>
              {selectedPlace
                ? `No published businesses are listed in ${selectedPlace.name} for this search yet. `
                : ""}
              Try a service synonym, remove one filter or explore a nearby
              place.
            </p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                Clear search
              </Link>
              <Link className="button" href="/places">
                Explore places
              </Link>
            </div>
          </section>
        ) : (
          <section aria-labelledby="results-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Search results</p>
                <h2 id="results-title">
                  {result.total} local{" "}
                  {result.total === 1 ? "business" : "businesses"}
                </h2>
              </div>
              <p>
                Organic relevance · page {result.page}
                {result.totalPages > 0 ? ` of ${result.totalPages}` : ""}
              </p>
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
                      <span className="tag tag--quiet">
                        {business.verificationStatus === "verified"
                          ? "Verified"
                          : "Not verified"}
                      </span>
                      <BusinessRatingTag rating={business.rating} />
                    </div>
                    <h3>{business.tradingName}</h3>
                    <p>{business.summary}</p>
                    <dl className="compact-facts">
                      <div>
                        <dt>Category</dt>
                        <dd>{business.category.name}</dd>
                      </div>
                      <div>
                        <dt>Area</dt>
                        <dd>{business.place.name}</dd>
                      </div>
                    </dl>
                    <Link className="text-link" href={`/b/${business.slug}`}>
                      View business website
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {result.hasPreviousPage || result.hasNextPage ? (
              <nav className="actions" aria-label="Business search pages">
                {result.hasPreviousPage ? (
                  <Link
                    className="button"
                    rel="prev"
                    href={
                      buildFilterHref({
                        q: query,
                        category,
                        place,
                        openNow,
                        verified,
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
                        openNow,
                        verified,
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
