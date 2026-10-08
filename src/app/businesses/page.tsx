import { SearchSuggestInput } from "@/components/search-suggest-input";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { BusinessRatingTag } from "@/components/business-rating-tag";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { businessCardArtStyle } from "@/lib/business-card-art";
import { getInitials } from "@/lib/initials";
import { getPublicPageRobots } from "@/lib/release-stage";
import {
  recordSearchAppearances,
  recordZeroResultSearch,
} from "@/modules/businesses/analytics";
import {
  directorySortLabels,
  directorySortOptions,
  isNewListing,
  parseDirectorySort,
  type DirectorySort,
} from "@/modules/businesses/directory-sort";
import {
  listCategoriesWithPublishedBusinesses,
  listPublishedBusinesses,
} from "@/modules/businesses/public";
import { listActiveCategories } from "@/modules/reference-data/categories";
import {
  listActivePlaces,
  listNearbyPlaces,
} from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local businesses",
  description:
    "Search local businesses and services across the South Wales Valleys by need, category and place.",
  robots: getPublicPageRobots(),
};

const RADIUS_OPTIONS_KM = [3, 8, 15, 30] as const;
const DEFAULT_RADIUS_KM = 8;

type SearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  place?: string | string[];
  openNow?: string | string[];
  verified?: string | string[];
  accessible?: string | string[];
  welshSpeaking?: string | string[];
  delivery?: string | string[];
  collection?: string | string[];
  emergency?: string | string[];
  near?: string | string[];
  radius?: string | string[];
  sort?: string | string[];
  page?: string | string[];
}>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parsePage(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parseRadius(value: string): number {
  const parsed = Number.parseInt(value, 10);
  return RADIUS_OPTIONS_KM.includes(
    parsed as (typeof RADIUS_OPTIONS_KM)[number],
  )
    ? parsed
    : DEFAULT_RADIUS_KM;
}

function buildFilterHref(filters: {
  q?: string;
  category?: string;
  place?: string;
  openNow?: boolean;
  verified?: boolean;
  accessible?: boolean;
  welshSpeaking?: boolean;
  delivery?: boolean;
  collection?: boolean;
  emergency?: boolean;
  near?: string;
  radius?: number;
  sort?: DirectorySort;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.place) params.set("place", filters.place);
  if (filters.openNow) params.set("openNow", "1");
  if (filters.verified) params.set("verified", "1");
  if (filters.accessible) params.set("accessible", "1");
  if (filters.welshSpeaking) params.set("welshSpeaking", "1");
  if (filters.delivery) params.set("delivery", "1");
  if (filters.collection) params.set("collection", "1");
  if (filters.emergency) params.set("emergency", "1");
  if (filters.near) {
    params.set("near", filters.near);
    if (filters.radius && filters.radius !== DEFAULT_RADIUS_KM) {
      params.set("radius", String(filters.radius));
    }
  }
  if (filters.sort && filters.sort !== "relevance") {
    params.set("sort", filters.sort);
  }
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
  const accessible = firstValue(values.accessible) === "1";
  const welshSpeaking = firstValue(values.welshSpeaking) === "1";
  const delivery = firstValue(values.delivery) === "1";
  const collection = firstValue(values.collection) === "1";
  const emergency = firstValue(values.emergency) === "1";
  const near = firstValue(values.near).slice(0, 80);
  const radius = parseRadius(firstValue(values.radius));
  const sort = parseDirectorySort(firstValue(values.sort));
  const hrefWithSort = (filters: Parameters<typeof buildFilterHref>[0]) =>
    buildFilterHref({ sort, ...filters });
  const page = parsePage(firstValue(values.page));
  const [result, places, categories] = await Promise.all([
    listPublishedBusinesses({
      query,
      category,
      place,
      openNow,
      verifiedOnly: verified,
      accessibleOnly: accessible,
      welshSpeakingOnly: welshSpeaking,
      deliveryOnly: delivery,
      collectionOnly: collection,
      emergencyOnly: emergency,
      nearPlace: near,
      radiusKm: radius,
      sort,
      page,
    }),
    listActivePlaces(),
    listActiveCategories(),
  ]);

  const selectedPlace = places.find((option) => option.slug === place);
  const selectedCategory = categories.find(
    (option) => option.slug === category,
  );
  const selectedNearPlace = places.find((option) => option.slug === near);
  const activeFilters = [
    query
      ? {
          label: `Search: ${query}`,
          removeHref: hrefWithSort({
            category,
            place,
            openNow,
            verified,
            accessible,
            welshSpeaking,
            delivery,
            collection,
            emergency,
            near,
            radius,
          }),
          removeLabel: `Remove search term ${query}`,
        }
      : null,
    category
      ? {
          label: `Category: ${selectedCategory?.name ?? category}`,
          removeHref: hrefWithSort({
            q: query,
            place,
            openNow,
            verified,
            accessible,
            welshSpeaking,
            delivery,
            collection,
            emergency,
            near,
            radius,
          }),
          removeLabel: `Remove category filter ${selectedCategory?.name ?? category}`,
        }
      : null,
    place
      ? {
          label: `Place: ${selectedPlace?.name ?? place}`,
          removeHref: hrefWithSort({
            q: query,
            category,
            openNow,
            verified,
            accessible,
            welshSpeaking,
            delivery,
            collection,
            emergency,
            near,
            radius,
          }),
          removeLabel: `Remove place filter ${selectedPlace?.name ?? place}`,
        }
      : null,
    near
      ? {
          label: `Near ${selectedNearPlace?.name ?? near} (within ${radius}km)`,
          removeHref: hrefWithSort({
            q: query,
            category,
            place,
            openNow,
            verified,
            accessible,
            welshSpeaking,
            delivery,
            collection,
            emergency,
          }),
          removeLabel: `Remove near ${selectedNearPlace?.name ?? near} filter`,
        }
      : null,
    openNow
      ? {
          label: "Open now",
          removeHref: hrefWithSort({
            q: query,
            category,
            place,
            verified,
            accessible,
            welshSpeaking,
            delivery,
            collection,
            emergency,
            near,
            radius,
          }),
          removeLabel: "Remove open now filter",
        }
      : null,
    verified
      ? {
          label: "Verified only",
          removeHref: hrefWithSort({
            q: query,
            category,
            place,
            openNow,
            accessible,
            welshSpeaking,
            delivery,
            collection,
            emergency,
            near,
            radius,
          }),
          removeLabel: "Remove verified only filter",
        }
      : null,
    accessible
      ? {
          label: "Step-free access",
          removeHref: hrefWithSort({
            q: query,
            category,
            place,
            openNow,
            verified,
            welshSpeaking,
            delivery,
            collection,
            emergency,
            near,
            radius,
          }),
          removeLabel: "Remove step-free access filter",
        }
      : null,
    welshSpeaking
      ? {
          label: "Welsh-speaking",
          removeHref: hrefWithSort({
            q: query,
            category,
            place,
            openNow,
            verified,
            accessible,
            delivery,
            collection,
            emergency,
            near,
            radius,
          }),
          removeLabel: "Remove Welsh-speaking filter",
        }
      : null,
    delivery
      ? {
          label: "Delivery",
          removeHref: hrefWithSort({
            q: query,
            category,
            place,
            openNow,
            verified,
            accessible,
            welshSpeaking,
            collection,
            emergency,
            near,
            radius,
          }),
          removeLabel: "Remove delivery filter",
        }
      : null,
    collection
      ? {
          label: "Collection",
          removeHref: hrefWithSort({
            q: query,
            category,
            place,
            openNow,
            verified,
            accessible,
            welshSpeaking,
            delivery,
            emergency,
            near,
            radius,
          }),
          removeLabel: "Remove collection filter",
        }
      : null,
    emergency
      ? {
          label: "Emergency or out-of-hours",
          removeHref: hrefWithSort({
            q: query,
            category,
            place,
            openNow,
            verified,
            accessible,
            welshSpeaking,
            delivery,
            collection,
            near,
            radius,
          }),
          removeLabel: "Remove emergency or out-of-hours filter",
        }
      : null,
  ].filter((filter) => filter !== null);

  if (result.state === "ready" && result.businesses.length > 0) {
    await recordSearchAppearances(result.businesses.map((item) => item.id));
  }

  const hasZeroResults =
    result.state === "ready" && result.businesses.length === 0;
  if (hasZeroResults && page === 1) {
    await recordZeroResultSearch({
      query,
      categorySlug: category,
      placeSlug: place,
      filterCount: [
        query,
        category,
        place,
        near,
        openNow,
        verified,
        accessible,
        welshSpeaking,
        delivery,
        collection,
        emergency,
      ].filter(Boolean).length,
    });
  }
  const [nearbyPlaces, relatedCategories] = hasZeroResults
    ? await Promise.all([
        selectedPlace
          ? listNearbyPlaces(selectedPlace.id)
          : Promise.resolve([]),
        listCategoriesWithPublishedBusinesses({
          placeSlug: selectedPlace?.slug,
          limit: 6,
        }),
      ])
    : [[], []];
  const suggestedCategories = relatedCategories.filter(
    (option) => option.slug !== category,
  );

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
            <SearchSuggestInput
              id="business-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Try boiler repair, café or plymwr"
              maxLength={80}
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
          <div className="field">
            <label htmlFor="business-near">Near</label>
            <select
              id="business-near"
              name="near"
              defaultValue={selectedNearPlace ? near : ""}
            >
              <option value="">Any distance</option>
              {places.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="business-radius">Within</label>
            <select
              id="business-radius"
              name="radius"
              defaultValue={String(radius)}
            >
              {RADIUS_OPTIONS_KM.map((option) => (
                <option key={option} value={option}>
                  {option}km
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
          <label
            className="checkbox-field search-panel__checkbox"
            htmlFor="business-accessible"
          >
            <input
              id="business-accessible"
              name="accessible"
              type="checkbox"
              value="1"
              defaultChecked={accessible}
            />
            Step-free access
          </label>
          <label
            className="checkbox-field search-panel__checkbox"
            htmlFor="business-welsh-speaking"
          >
            <input
              id="business-welsh-speaking"
              name="welshSpeaking"
              type="checkbox"
              value="1"
              defaultChecked={welshSpeaking}
            />
            Welsh-speaking
          </label>
          <label
            className="checkbox-field search-panel__checkbox"
            htmlFor="business-delivery"
          >
            <input
              id="business-delivery"
              name="delivery"
              type="checkbox"
              value="1"
              defaultChecked={delivery}
            />
            Delivery
          </label>
          <label
            className="checkbox-field search-panel__checkbox"
            htmlFor="business-collection"
          >
            <input
              id="business-collection"
              name="collection"
              type="checkbox"
              value="1"
              defaultChecked={collection}
            />
            Collection
          </label>
          <label
            className="checkbox-field search-panel__checkbox"
            htmlFor="business-emergency"
          >
            <input
              id="business-emergency"
              name="emergency"
              type="checkbox"
              value="1"
              defaultChecked={emergency}
            />
            Emergency or out-of-hours
          </label>
          <div className="field">
            <label htmlFor="business-sort">Sort by</label>
            <select id="business-sort" name="sort" defaultValue={sort}>
              {directorySortOptions.map((option) => (
                <option key={option} value={option}>
                  {directorySortLabels[option]}
                </option>
              ))}
            </select>
          </div>
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
            <p className="body-copy">
              Know a local business that should be here?{" "}
              <Link
                href={
                  (query
                    ? `/suggest-a-business?q=${encodeURIComponent(query.slice(0, 120))}`
                    : "/suggest-a-business") as Route
                }
              >
                Suggest it to us
              </Link>
              .
            </p>
            {(openNow ||
              verified ||
              accessible ||
              welshSpeaking ||
              delivery ||
              collection ||
              emergency) &&
            (suggestedCategories.length > 0 || nearbyPlaces.length > 0) ? (
              <p className="body-copy">
                Suggestions below ignore your open now, verified only, step-free
                access, Welsh-speaking, delivery, collection and emergency
                filters, so double-check a listing before visiting.
              </p>
            ) : null}
            {suggestedCategories.length > 0 ? (
              <div
                className="filter-row"
                aria-label="Categories with local businesses"
              >
                <span className="filter-row__label">
                  {selectedCategory
                    ? "Try a different category:"
                    : "Browse a category with local businesses:"}
                </span>
                {suggestedCategories.map((option) => (
                  <Link
                    className="filter-chip"
                    key={option.slug}
                    href={
                      hrefWithSort({
                        q: query,
                        place,
                        near,
                        radius,
                        category: option.slug,
                      }) as Route
                    }
                  >
                    {option.name} ({option.count})
                  </Link>
                ))}
              </div>
            ) : null}
            {nearbyPlaces.length > 0 ? (
              <div className="filter-row" aria-label="Nearby places to try">
                <span className="filter-row__label">
                  Or search a nearby place:
                </span>
                {nearbyPlaces.map((option) => (
                  <Link
                    className="filter-chip"
                    key={option.slug}
                    href={
                      hrefWithSort({
                        q: query,
                        category,
                        place: option.slug,
                      }) as Route
                    }
                  >
                    {option.name}
                  </Link>
                ))}
              </div>
            ) : null}
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
                {sort === "relevance"
                  ? near
                    ? "Nearest first"
                    : "Organic relevance"
                  : directorySortLabels[sort]}{" "}
                · page {result.page}
                {result.totalPages > 0 ? ` of ${result.totalPages}` : ""}
              </p>
            </div>
            <div className="business-grid">
              {result.businesses.map((business) => (
                <article className="business-card" key={business.id}>
                  <div
                    className="business-card__art"
                    aria-hidden="true"
                    style={businessCardArtStyle(business.cardImage)}
                  >
                    {business.cardImage ? null : (
                      <span className="business-card__initials">
                        {getInitials(business.tradingName)}
                      </span>
                    )}
                    <span>{business.category.name}</span>
                  </div>
                  <div className="business-card__body">
                    <div className="tag-row">
                      {business.isDemo ? (
                        <span className="tag">Fictional demo</span>
                      ) : null}
                      {isNewListing(business.publishedAt) ? (
                        <span className="tag tag--new">New</span>
                      ) : null}
                      <span className="tag tag--quiet">
                        {business.verificationStatus === "verified"
                          ? "Verified"
                          : "Not verified"}
                      </span>
                      <BusinessRatingTag rating={business.rating} />
                      {business.distanceKm != null ? (
                        <span className="tag tag--quiet">
                          {business.distanceKm < 1
                            ? "Under 1km away"
                            : `${business.distanceKm.toFixed(1)}km away`}
                        </span>
                      ) : null}
                    </div>
                    <h3>{business.tradingName}</h3>
                    {business.welshName &&
                    business.welshName !== business.tradingName ? (
                      <p className="body-copy" lang="cy">
                        {business.welshName}
                      </p>
                    ) : null}
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
                      hrefWithSort({
                        q: query,
                        category,
                        place,
                        openNow,
                        verified,
                        accessible,
                        welshSpeaking,
                        delivery,
                        collection,
                        emergency,
                        near,
                        radius,
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
                      hrefWithSort({
                        q: query,
                        category,
                        place,
                        openNow,
                        verified,
                        accessible,
                        welshSpeaking,
                        delivery,
                        collection,
                        emergency,
                        near,
                        radius,
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
