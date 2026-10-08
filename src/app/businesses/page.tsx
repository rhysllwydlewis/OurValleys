import { SearchSuggestInput } from "@/components/search-suggest-input";
import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { BusinessRatingTag } from "@/components/business-rating-tag";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { businessCardArtStyle } from "@/lib/business-card-art";
import { getInitials } from "@/lib/initials";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { getPublicPageRobots } from "@/lib/release-stage";
import {
  recordSearchAppearances,
  recordZeroResultSearch,
} from "@/modules/businesses/analytics";
import {
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

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("dir.metaTitle"),
    description: t("dir.metaDescription"),
    robots: getPublicPageRobots(),
  };
}

const directorySortKeys = {
  relevance: "dir.sortRelevance",
  az: "dir.sortAz",
  newest: "dir.sortNewest",
  "recently-updated": "dir.sortRecentlyUpdated",
} as const satisfies Record<DirectorySort, MessageKey>;

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
  const { t, locale } = await getTranslator();
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
  const [result, rawPlaces, rawCategories] = await Promise.all([
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

  // Reference data carries Welsh labels; show them to Welsh visitors and fall
  // back to the canonical English name where none is stored.
  const places = rawPlaces.map((option) => ({
    ...option,
    name: (locale === "cy" && option.welshName) || option.name,
  }));
  const categories = rawCategories.map((option) => ({
    ...option,
    name: (locale === "cy" && option.welshLabel) || option.name,
  }));
  const placeNames = new Map(
    places.map((option) => [option.slug, option.name]),
  );
  const categoryNames = new Map(
    categories.map((option) => [option.slug, option.name]),
  );
  const selectedPlace = places.find((option) => option.slug === place);
  const selectedCategory = categories.find(
    (option) => option.slug === category,
  );
  const selectedNearPlace = places.find((option) => option.slug === near);
  const activeFilters = [
    query
      ? {
          label: t("dir.chipSearch", { value: query }),
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
          removeLabel: t("dir.removeSearch", { value: query }),
        }
      : null,
    category
      ? {
          label: t("dir.chipCategory", {
            value: selectedCategory?.name ?? category,
          }),
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
          removeLabel: t("dir.removeCategory", {
            value: selectedCategory?.name ?? category,
          }),
        }
      : null,
    place
      ? {
          label: t("dir.chipPlace", { value: selectedPlace?.name ?? place }),
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
          removeLabel: t("dir.removePlace", {
            value: selectedPlace?.name ?? place,
          }),
        }
      : null,
    near
      ? {
          label: t("dir.chipNear", {
            value: selectedNearPlace?.name ?? near,
            radius,
          }),
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
          removeLabel: t("dir.removeNear", {
            value: selectedNearPlace?.name ?? near,
          }),
        }
      : null,
    openNow
      ? {
          label: t("dir.openNow"),
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
          removeLabel: t("dir.removeOpenNow"),
        }
      : null,
    verified
      ? {
          label: t("dir.verifiedOnly"),
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
          removeLabel: t("dir.removeVerified"),
        }
      : null,
    accessible
      ? {
          label: t("dir.stepFree"),
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
          removeLabel: t("dir.removeStepFree"),
        }
      : null,
    welshSpeaking
      ? {
          label: t("dir.welshSpeaking"),
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
          removeLabel: t("dir.removeWelsh"),
        }
      : null,
    delivery
      ? {
          label: t("dir.delivery"),
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
          removeLabel: t("dir.removeDelivery"),
        }
      : null,
    collection
      ? {
          label: t("dir.collection"),
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
          removeLabel: t("dir.removeCollection"),
        }
      : null,
    emergency
      ? {
          label: t("dir.emergency"),
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
          removeLabel: t("dir.removeEmergency"),
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
      <main className="directory-shell" lang={LOCALE_DETAILS[locale].htmlLang}>
        <section className="directory-intro" aria-labelledby="directory-title">
          <p className="eyebrow">{t("dir.eyebrow")}</p>
          <h1 id="directory-title">{t("dir.title")}</h1>
          <p className="lead">{t("dir.lead")}</p>
        </section>

        <form
          className="search-panel ov-glass"
          action="/businesses"
          method="get"
        >
          <div className="field">
            <label htmlFor="business-query">{t("dir.queryLabel")}</label>
            <SearchSuggestInput
              id="business-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder={t("dir.queryPlaceholder")}
              maxLength={80}
            />
          </div>
          <div className="field">
            <label htmlFor="business-category">{t("dir.categoryLabel")}</label>
            <select
              id="business-category"
              name="category"
              defaultValue={selectedCategory ? category : ""}
            >
              <option value="">{t("dir.allCategories")}</option>
              {categories.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="business-place">{t("dir.placeLabel")}</label>
            <select
              id="business-place"
              name="place"
              defaultValue={selectedPlace ? place : ""}
            >
              <option value="">{t("hero.allAreas")}</option>
              {places.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="business-near">{t("dir.nearLabel")}</label>
            <select
              id="business-near"
              name="near"
              defaultValue={selectedNearPlace ? near : ""}
            >
              <option value="">{t("dir.anyDistance")}</option>
              {places.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="business-radius">{t("dir.withinLabel")}</label>
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
            {t("dir.openNow")}
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
            {t("dir.verifiedOnly")}
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
            {t("dir.stepFree")}
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
            {t("dir.welshSpeaking")}
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
            {t("dir.delivery")}
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
            {t("dir.collection")}
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
            {t("dir.emergency")}
          </label>
          <div className="field">
            <label htmlFor="business-sort">{t("dir.sortLabel")}</label>
            <select id="business-sort" name="sort" defaultValue={sort}>
              {directorySortOptions.map((option) => (
                <option key={option} value={option}>
                  {t(directorySortKeys[option])}
                </option>
              ))}
            </select>
          </div>
          <button className="button primary" type="submit">
            {t("dir.submit")}
          </button>
        </form>

        {activeFilters.length > 0 ? (
          <div className="filter-row" aria-label={t("dir.activeFilters")}>
            <span className="filter-row__label">{t("dir.filteringBy")}</span>
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
              {t("dir.clearAll")}
            </Link>
          </div>
        ) : null}

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">{t("dir.unavailableEyebrow")}</p>
            <h2>{t("dir.unavailableTitle")}</h2>
            <p>{t("dir.unavailableBody")}</p>
          </section>
        ) : result.businesses.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">{t("dir.noMatchEyebrow")}</p>
            <h2>{t("dir.noMatchTitle")}</h2>
            <p>
              {selectedPlace
                ? `${t("dir.noneInPlace", { place: selectedPlace.name })} `
                : ""}
              {t("dir.noMatchHint")}
            </p>
            <p className="body-copy">
              {t("dir.suggestPrompt")}{" "}
              <Link
                href={
                  (query
                    ? `/suggest-a-business?q=${encodeURIComponent(query.slice(0, 120))}`
                    : "/suggest-a-business") as Route
                }
              >
                {t("dir.suggestLink")}
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
              <p className="body-copy">{t("dir.suggestionsIgnoreFilters")}</p>
            ) : null}
            {suggestedCategories.length > 0 ? (
              <div className="filter-row" aria-label={t("dir.categoriesAria")}>
                <span className="filter-row__label">
                  {selectedCategory
                    ? t("dir.tryDifferentCategory")
                    : t("dir.browseCategory")}
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
                    {categoryNames.get(option.slug) ?? option.name} (
                    {option.count})
                  </Link>
                ))}
              </div>
            ) : null}
            {nearbyPlaces.length > 0 ? (
              <div className="filter-row" aria-label={t("dir.nearbyAria")}>
                <span className="filter-row__label">
                  {t("dir.orNearbyPlace")}
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
                    {placeNames.get(option.slug) ?? option.name}
                  </Link>
                ))}
              </div>
            ) : null}
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("dir.clearSearch")}
              </Link>
              <Link className="button" href="/places">
                {t("footer.explorePlaces")}
              </Link>
            </div>
          </section>
        ) : (
          <section aria-labelledby="results-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t("dir.resultsEyebrow")}</p>
                <h2 id="results-title">
                  {result.total === 1
                    ? t("dir.resultCountOne")
                    : t("dir.resultCountMany", { count: result.total })}
                </h2>
              </div>
              <p>
                {sort === "relevance"
                  ? near
                    ? t("dir.nearestFirst")
                    : t("dir.organicRelevance")
                  : t(directorySortKeys[sort])}{" "}
                ·{" "}
                {result.totalPages > 0
                  ? t("dir.pageOf", {
                      page: result.page,
                      total: result.totalPages,
                    })
                  : t("dir.page", { page: result.page })}
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
                    <span>
                      {categoryNames.get(business.category.slug) ??
                        business.category.name}
                    </span>
                  </div>
                  <div className="business-card__body">
                    <div className="tag-row">
                      {business.isDemo ? (
                        <span className="tag">{t("dir.fictionalDemo")}</span>
                      ) : null}
                      {isNewListing(business.publishedAt) ? (
                        <span className="tag tag--new">{t("dir.new")}</span>
                      ) : null}
                      <span className="tag tag--quiet">
                        {business.verificationStatus === "verified"
                          ? t("dir.verified")
                          : t("dir.notVerified")}
                      </span>
                      <BusinessRatingTag rating={business.rating} />
                      {business.distanceKm != null ? (
                        <span className="tag tag--quiet">
                          {business.distanceKm < 1
                            ? t("dir.under1km")
                            : t("dir.kmAway", {
                                km: business.distanceKm.toFixed(1),
                              })}
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
                        <dt>{t("dir.categoryLabel")}</dt>
                        <dd>
                          {categoryNames.get(business.category.slug) ??
                            business.category.name}
                        </dd>
                      </div>
                      <div>
                        <dt>{t("dir.area")}</dt>
                        <dd>
                          {placeNames.get(business.place.slug) ??
                            business.place.name}
                        </dd>
                      </div>
                    </dl>
                    <Link className="text-link" href={`/b/${business.slug}`}>
                      {t("dir.viewWebsite")}
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {result.hasPreviousPage || result.hasNextPage ? (
              <nav className="actions" aria-label={t("dir.pagesAria")}>
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
                    {t("dir.previous")}
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
                    {t("dir.next")}
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
