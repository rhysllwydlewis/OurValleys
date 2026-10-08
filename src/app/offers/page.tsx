import { ContentPicture } from "@/components/content-picture";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  daysUntilOfferEnds,
  listPublicOffers,
} from "@/modules/businesses/public-offers";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listActivePlaces } from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local offers",
  description:
    "Current offers supplied by published local businesses and organisations.",
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
  return query ? `/offers?${query}` : "/offers";
}

function endsLabel(endsAt: Date | null, now: Date): string {
  const days = daysUntilOfferEnds(endsAt, now);
  if (days === null) return "No end date";
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends in 1 day";
  return `Ends in ${days} days`;
}

export default async function OffersPage({
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
    listPublicOffers({ query, category, place, page }),
    listActivePlaces(),
    listActiveCategories(),
  ]);
  const now = new Date();

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
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="offers-title">
          <p className="eyebrow">Supplied by local businesses</p>
          <h1 id="offers-title">Find a local offer.</h1>
          <p className="lead">
            Current offers from published local businesses. Owners write their
            own offers; none are paid placements, and each disappears
            automatically when it ends or is withdrawn.
          </p>
          <div className="actions">
            <Link className="button primary" href="/businesses">
              Browse businesses
            </Link>
            <Link className="button" href="/events">
              Local events
            </Link>
          </div>
        </section>

        <form className="search-panel ov-glass" action="/offers" method="get">
          <div className="field">
            <label htmlFor="offer-query">Search offers</label>
            <input
              id="offer-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Service, product or business"
              maxLength={80}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="offer-category">Category</label>
            <select
              id="offer-category"
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
            <label htmlFor="offer-place">Place</label>
            <select
              id="offer-place"
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
            Filter offers
          </button>
        </form>

        {activeFilters.length > 0 ? (
          <div className="filter-row" aria-label="Active offer filters">
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
            <Link className="filter-row__clear" href="/offers">
              Clear all
            </Link>
          </div>
        ) : null}

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Temporary problem</p>
            <h2>Local offers are temporarily unavailable.</h2>
            <p>
              The offers service could not be reached. Business and place
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
        ) : result.offers.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Developing local coverage</p>
            <h2>
              {activeFilters.length > 0
                ? "No current offers match these filters."
                : "No offers are published yet."}
            </h2>
            <p>
              Businesses add offers from their dashboard. Check back soon, or
              browse businesses directly.
            </p>
            <div className="actions">
              {activeFilters.length > 0 ? (
                <Link className="button primary" href="/offers">
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
            aria-labelledby="offer-results-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Current offers</p>
                <h2 id="offer-results-title">
                  {result.total} current offer
                  {result.total === 1 ? "" : "s"}
                </h2>
              </div>
              <p>
                Active offers from published businesses only · page{" "}
                {result.page}
                {result.totalPages > 0 ? ` of ${result.totalPages}` : ""}
              </p>
            </div>
            <div className="business-grid">
              {result.offers.map((offer) => (
                <article
                  className="business-card business-card--simple"
                  key={offer.id}
                >
                  <ContentPicture image={offer.image} />
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">
                        {offer.fictional ? "Fictional demo" : "Local offer"}
                      </span>
                    </div>
                    <p className="eyebrow">{endsLabel(offer.endsAt, now)}</p>
                    <h3>{offer.title}</h3>
                    <p>
                      From{" "}
                      <Link href={`/b/${offer.businessSlug}` as Route}>
                        {offer.businessName}
                      </Link>
                    </p>
                    <p>{offer.description}</p>
                    {offer.terms ? (
                      <details>
                        <summary>Terms</summary>
                        <p>{offer.terms}</p>
                      </details>
                    ) : null}
                    <Link
                      className="text-link"
                      href={`/b/${offer.businessSlug}#offers` as Route}
                    >
                      View on the business page
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {result.hasPreviousPage || result.hasNextPage ? (
              <nav className="actions" aria-label="Offer pages">
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
