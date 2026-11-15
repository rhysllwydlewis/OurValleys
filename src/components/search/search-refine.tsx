import Link from "next/link";
import type { Route } from "next";
import type { Translator } from "@/lib/i18n/translate";
import {
  directorySortOptions,
  type DirectorySort,
} from "@/modules/businesses/directory-sort";
import {
  humaniseSlug,
  searchHref,
  type SearchRefinements,
  type SearchType,
} from "@/modules/search/search-filters";
import type { SearchRefineOptions } from "@/modules/search/site-search";
import styles from "./search.module.css";

const sortLabelKeys = {
  relevance: "dir.sortRelevance",
  az: "dir.sortAz",
  newest: "dir.sortNewest",
  "recently-updated": "dir.sortRecentlyUpdated",
} as const satisfies Record<DirectorySort, string>;

/** How many of the four refinements are on, for the disclosure's summary. */
export function countRefinements(refine: SearchRefinements): number {
  return [
    refine.place,
    refine.category,
    refine.openNow,
    refine.sort !== "relevance",
  ].filter(Boolean).length;
}

type Chip = { label: string; removeLabel: string; href: Route };

/**
 * Narrows the whole-site search by area, category, open now and the order of
 * business results. A plain GET form inside a native disclosure, so it works
 * without JavaScript and opens by itself while a refinement is on. Each
 * active refinement is also a removable chip, so nothing is hidden state.
 */
export function SearchRefine({
  t,
  welsh,
  query,
  type,
  refinements,
  options,
}: {
  t: Translator;
  welsh: boolean;
  query: string;
  type: SearchType;
  refinements: SearchRefinements;
  options: SearchRefineOptions;
}) {
  const count = countRefinements(refinements);
  const places = options.places.map((option) => ({
    slug: option.slug,
    name: (welsh && option.welshName) || option.name,
  }));
  const categories = options.categories.map((option) => ({
    slug: option.slug,
    name: (welsh && option.welshLabel) || option.name,
  }));
  // A refinement the lists no longer offer (a stale link) is shown as nothing
  // chosen rather than as a value the form cannot hold.
  const place = places.find((option) => option.slug === refinements.place);
  const category = categories.find(
    (option) => option.slug === refinements.category,
  );

  const without = (change: Partial<SearchRefinements>) =>
    searchHref({ q: query, type, ...refinements, ...change }) as Route;
  const chips: Chip[] = [];
  if (refinements.category) {
    const value = category?.name ?? humaniseSlug(refinements.category);
    chips.push({
      label: t("dir.chipCategory", { value }),
      removeLabel: t("dir.removeCategory", { value }),
      href: without({ category: "" }),
    });
  }
  if (refinements.place) {
    const value = place?.name ?? humaniseSlug(refinements.place);
    chips.push({
      label: t("dir.chipPlace", { value }),
      removeLabel: t("dir.removePlace", { value }),
      href: without({ place: "" }),
    });
  }
  if (refinements.openNow) {
    chips.push({
      label: t("dir.openNow"),
      removeLabel: t("dir.removeOpenNow"),
      href: without({ openNow: false }),
    });
  }
  if (refinements.sort !== "relevance") {
    const value = t(sortLabelKeys[refinements.sort]);
    chips.push({
      label: t("searchx.chipSort", { value }),
      removeLabel: t("searchx.removeSort", { value }),
      href: without({ sort: "relevance" }),
    });
  }

  return (
    <section className={styles.refine} aria-label={t("searchx.refineAria")}>
      <form
        action="/search"
        method="get"
        // Uncontrolled fields keep their DOM across client navigation, so a
        // removed chip would leave the old choice showing. A new key resets them.
        key={`${query}|${type}|${refinements.place}|${refinements.category}|${refinements.openNow}|${refinements.sort}`}
      >
        <input type="hidden" name="q" value={query} />
        {type !== "all" ? (
          <input type="hidden" name="type" value={type} />
        ) : null}
        <details className={styles.refineBody} open={count > 0}>
          <summary>
            {count > 0
              ? t("searchx.refineCount", { count })
              : t("searchx.refine")}
          </summary>
          <div className={styles.refineFields}>
            <div className="field">
              <label htmlFor="search-refine-category">
                {t("dir.categoryLabel")}
              </label>
              <select
                id="search-refine-category"
                name="category"
                defaultValue={category?.slug ?? ""}
              >
                <option value="">{t("dir.allCategories")}</option>
                {categories.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="search-refine-place">{t("dir.placeLabel")}</label>
              <select
                id="search-refine-place"
                name="place"
                defaultValue={place?.slug ?? ""}
              >
                <option value="">{t("hero.allAreas")}</option>
                {places.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="search-refine-sort">
                {t("searchx.sortBusinesses")}
              </label>
              <select
                id="search-refine-sort"
                name="sort"
                defaultValue={refinements.sort}
              >
                {directorySortOptions.map((option) => (
                  <option key={option} value={option}>
                    {t(sortLabelKeys[option])}
                  </option>
                ))}
              </select>
            </div>
            <label className={styles.refineCheck}>
              <input
                type="checkbox"
                name="openNow"
                value="1"
                defaultChecked={refinements.openNow}
              />
              <span>{t("searchx.openNowOnly")}</span>
            </label>
            <button className="button primary" type="submit">
              {t("searchx.refineApply")}
            </button>
          </div>
          <p className={styles.note}>{t("searchx.refineScope")}</p>
        </details>
      </form>
      {chips.length > 0 ? (
        <div
          className="filter-row"
          role="group"
          aria-label={t("dir.activeFilters")}
        >
          <span className="filter-row__label">{t("dir.filteringBy")}</span>
          {chips.map((chip) => (
            <Link
              className="filter-chip"
              href={chip.href}
              key={chip.label}
              aria-label={chip.removeLabel}
            >
              {chip.label}
              <span aria-hidden="true"> ×</span>
            </Link>
          ))}
          <Link
            className="filter-row__clear"
            href={searchHref({ q: query, type }) as Route}
          >
            {t("dir.clearAll")}
          </Link>
        </div>
      ) : null}
    </section>
  );
}
