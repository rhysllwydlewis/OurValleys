import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { DirectoryCard } from "@/components/directory/directory-card";
import { DirectoryPagination } from "@/components/directory/directory-pagination";
import { DirectorySearch } from "@/components/directory/directory-search";
import styles from "@/components/directory/directory.module.css";
import { SaveSearch } from "@/components/search/save-search";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { readDirectorySaveState } from "./directory-save-state";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { getPublicPageRobots } from "@/lib/release-stage";
import { suggestBusinessHref } from "@/lib/suggest-business-href";
import {
  recordSearchAppearances,
  recordZeroResultSearch,
} from "@/modules/businesses/analytics";
import {
  DIRECTORY_FLAG_FILTERS,
  activeFilterKinds,
  directoryHref,
  hrefWithoutFilter,
  parseDirectoryFilters,
  withFilters,
  type ActiveFilterKind,
  type RawDirectoryParams,
} from "@/modules/businesses/directory-filters";
import {
  directorySortOptions,
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
import { pageUrlMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t, locale } = await getTranslator();
  const title = t("dir.metaTitle");
  const description = t("dir.metaDescription");
  return {
    title,
    description,
    robots: getPublicPageRobots(),
    ...pageUrlMetadata("/businesses", {
      title,
      description,
      locale: LOCALE_DETAILS[locale].openGraph,
      types: { "application/atom+xml": "/businesses/feed.xml" },
    }),
  };
}

const directorySortKeys = {
  relevance: "dir.sortRelevance",
  az: "dir.sortAz",
  newest: "dir.sortNewest",
  "recently-updated": "dir.sortRecentlyUpdated",
} as const satisfies Record<DirectorySort, MessageKey>;

const flagChipKeys = {
  openNow: ["dir.openNow", "dir.removeOpenNow"],
  verified: ["dir.verifiedOnly", "dir.removeVerified"],
  accessible: ["dir.stepFree", "dir.removeStepFree"],
  welshSpeaking: ["dir.welshSpeaking", "dir.removeWelsh"],
  delivery: ["dir.delivery", "dir.removeDelivery"],
  collection: ["dir.collection", "dir.removeCollection"],
  emergency: ["dir.emergency", "dir.removeEmergency"],
} as const satisfies Record<string, readonly [MessageKey, MessageKey]>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

type SearchParams = Promise<RawDirectoryParams>;

const CATEGORY_RAIL_LIMIT = 12;

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { t, locale } = await getTranslator();
  const rawParams = await searchParams;
  const filters = parseDirectoryFilters(rawParams);
  const savedOutcome =
    first(rawParams.savedKind) === "search"
      ? first(rawParams.savedOutcome) || undefined
      : undefined;
  const { q: query, category, place, near, radius, sort, page } = filters;
  const [result, rawPlaces, rawCategories, railCategories] = await Promise.all([
    listPublishedBusinesses({
      query,
      category,
      place,
      openNow: filters.openNow,
      verifiedOnly: filters.verified,
      accessibleOnly: filters.accessible,
      welshSpeakingOnly: filters.welshSpeaking,
      deliveryOnly: filters.delivery,
      collectionOnly: filters.collection,
      emergencyOnly: filters.emergency,
      nearPlace: near,
      radiusKm: radius,
      sort,
      page,
    }),
    listActivePlaces(),
    listActiveCategories(),
    listCategoriesWithPublishedBusinesses({
      placeSlug: place || undefined,
      limit: CATEGORY_RAIL_LIMIT,
    }),
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

  const chipFor = (kind: ActiveFilterKind) => {
    const removeHref = hrefWithoutFilter(filters, kind);
    switch (kind) {
      case "q":
        return {
          label: t("dir.chipSearch", { value: query }),
          removeLabel: t("dir.removeSearch", { value: query }),
          removeHref,
        };
      case "category": {
        const value = selectedCategory?.name ?? category;
        return {
          label: t("dir.chipCategory", { value }),
          removeLabel: t("dir.removeCategory", { value }),
          removeHref,
        };
      }
      case "place": {
        const value = selectedPlace?.name ?? place;
        return {
          label: t("dir.chipPlace", { value }),
          removeLabel: t("dir.removePlace", { value }),
          removeHref,
        };
      }
      case "near": {
        const value = selectedNearPlace?.name ?? near;
        return {
          label: t("dir.chipNear", { value, radius }),
          removeLabel: t("dir.removeNear", { value }),
          removeHref,
        };
      }
      default: {
        const [label, removeLabel] = flagChipKeys[kind];
        return { label: t(label), removeLabel: t(removeLabel), removeHref };
      }
    }
  };
  const activeFilters = activeFilterKinds(filters).map(chipFor);

  if (result.state === "ready" && result.businesses.length > 0) {
    await recordSearchAppearances(result.businesses.map((item) => item.id));
  }

  const saveFilters = await readDirectorySaveState(
    directoryHref(filters).split("?")[1] ?? "",
    result.state === "ready" ? result.total : 0,
  );

  const hasZeroResults =
    result.state === "ready" && result.businesses.length === 0;
  const anyToggle = DIRECTORY_FLAG_FILTERS.some(({ key }) => filters[key]);
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
        ...DIRECTORY_FLAG_FILTERS.map(({ key }) => filters[key]),
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

  const railItems = railCategories.map((option) => ({
    slug: option.slug,
    name:
      (locale === "cy" && option.welshLabel) ||
      categoryNames.get(option.slug) ||
      option.name,
    count: option.count as number | null,
  }));
  // A category chosen by URL stays visible in the rail even when it is not
  // among the busiest ones the rail lists.
  if (selectedCategory && !railItems.some((item) => item.slug === category)) {
    railItems.push({
      slug: selectedCategory.slug,
      name: selectedCategory.name,
      count: null,
    });
  }
  const mapHref = (
    category ? `/map?category=${encodeURIComponent(category)}` : "/map"
  ) as Route;

  return (
    <>
      <SiteHeader />
      <main className="directory-shell" lang={LOCALE_DETAILS[locale].htmlLang}>
        <section className={styles.header} aria-labelledby="directory-title">
          <div>
            <p className="eyebrow">{t("dir.eyebrow")}</p>
            <h1 id="directory-title">{t("dir.title")}</h1>
            <p className="lead">{t("dir.lead")}</p>
          </div>
          <Link className="button" href={mapHref}>
            {selectedCategory
              ? t("dirx.viewMapCategory", { category: selectedCategory.name })
              : t("dirx.viewMap")}
          </Link>
        </section>

        <DirectorySearch
          t={t}
          filters={filters}
          categories={categories}
          places={places}
        />

        {railItems.length > 1 ? (
          <nav className={styles.rail} aria-label={t("dirx.categoryRail")}>
            <Link
              className={styles.pill}
              href={
                directoryHref(withFilters(filters, { category: "" })) as Route
              }
              aria-current={category ? undefined : "true"}
            >
              {t("dirx.allCategoriesPill")}
            </Link>
            {railItems.map((item) => (
              <Link
                className={styles.pill}
                key={item.slug}
                href={
                  directoryHref(
                    withFilters(filters, { category: item.slug }),
                  ) as Route
                }
                aria-current={category === item.slug ? "true" : undefined}
              >
                {item.name}
                {item.count != null ? (
                  <span className={styles.pillCount}>{item.count}</span>
                ) : null}
              </Link>
            ))}
          </nav>
        ) : null}

        {activeFilters.length > 0 ? (
          <div
            className="filter-row"
            style={{ margin: "1.25rem 0 0" }}
            aria-label={t("dir.activeFilters")}
          >
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

        {saveFilters.query ? (
          <SaveSearch
            t={t}
            query={saveFilters.query}
            type="directory"
            returnTo={`/businesses?${saveFilters.query}`}
            state={saveFilters.state}
            outcome={savedOutcome}
          />
        ) : null}

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">{t("dir.unavailableEyebrow")}</p>
            <h2>{t("dir.unavailableTitle")}</h2>
            <p>{t("dir.unavailableBody")}</p>
          </section>
        ) : result.businesses.length === 0 ? (
          <section
            className="state-panel"
            aria-live="polite"
            style={{ marginTop: "2rem" }}
          >
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
              <Link href={suggestBusinessHref(query)}>
                {t("dir.suggestLink")}
              </Link>
              .
            </p>
            {anyToggle &&
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
                      directoryHref({
                        q: query,
                        place,
                        near,
                        radius,
                        sort,
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
                      directoryHref({
                        q: query,
                        category,
                        sort,
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
            <div className={styles.toolbar}>
              <div>
                <p className="eyebrow">{t("dir.resultsEyebrow")}</p>
                <h2 id="results-title">
                  {result.total === 1
                    ? t("dir.resultCountOne")
                    : t("dir.resultCountMany", { count: result.total })}
                </h2>
                <p className={styles.range}>
                  {result.total > result.pageSize
                    ? t("dirx.showing", {
                        from: (result.page - 1) * result.pageSize + 1,
                        to: Math.min(
                          result.page * result.pageSize,
                          result.total,
                        ),
                        total: result.total,
                      })
                    : sort === "relevance" && near
                      ? t("dir.nearestFirst")
                      : sort === "relevance"
                        ? t("dir.organicRelevance")
                        : t(directorySortKeys[sort])}
                </p>
              </div>
              <nav aria-label={t("dir.sortLabel")}>
                <ul className={styles.sort}>
                  <li className={styles.sortLabel} aria-hidden="true">
                    {t("dir.sortLabel")}
                  </li>
                  {directorySortOptions.map((option) => (
                    <li key={option}>
                      {option === sort ? (
                        <span
                          className={styles.sortCurrent}
                          aria-current="true"
                        >
                          {t(directorySortKeys[option])}
                        </span>
                      ) : (
                        <Link
                          className={styles.sortLink}
                          href={
                            directoryHref(
                              withFilters(filters, { sort: option }),
                            ) as Route
                          }
                        >
                          {t(directorySortKeys[option])}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className={styles.results}>
              {result.businesses.map((business) => (
                <DirectoryCard
                  key={business.id}
                  t={t}
                  business={business}
                  welsh={locale === "cy"}
                  categoryName={
                    categoryNames.get(business.category.slug) ??
                    business.category.name
                  }
                  placeName={
                    placeNames.get(business.place.slug) ?? business.place.name
                  }
                />
              ))}
            </div>
            <DirectoryPagination
              t={t}
              filters={filters}
              page={result.page}
              totalPages={result.totalPages}
            />
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
