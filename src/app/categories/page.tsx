import type { Metadata, Route } from "next";
import Link from "next/link";
import { BrowseHeader } from "@/components/browse/browse-header";
import styles from "@/components/browse/browse.module.css";
import { SortLinks } from "@/components/browse/sort-links";
import { PlaceStats } from "@/components/places/place-stats";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { loadCategoryDirectory } from "@/modules/reference-data/category-directory";
import {
  categoriesHref,
  categoryStats,
  hasCategoryFilters,
  parseCategoryFilters,
  popularCategories,
  selectCategories,
  type RawCategoryParams,
} from "@/modules/reference-data/category-directory-model";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("categories.metaTitle"),
    description: t("categories.metaDescription"),
    robots: { index: false, follow: false },
  };
}

function countLabel(count: number, t: Translator): string {
  if (count === 0) return t("categoriesx.countNone");
  if (count === 1) return t("categoriesx.countOne");
  return t("categoriesx.countMany", { count });
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<RawCategoryParams>;
}) {
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const filters = parseCategoryFilters(await searchParams);
  const directory = await loadCategoryDirectory();
  const all = directory.categories;
  const shown = selectCategories(all, filters);
  const stats = categoryStats(all);
  const popular = hasCategoryFilters(filters) ? [] : popularCategories(all);

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <BrowseHeader
          lang={lang}
          eyebrow={t("categories.eyebrow")}
          title={t("categories.title")}
          lead={t("categoriesx.lead")}
        >
          <Link className="button primary" href="/businesses">
            {t("categories.searchBusinesses")}
          </Link>
          <Link className="button" href="/places">
            {t("events.explorePlaces")}
          </Link>
        </BrowseHeader>

        {directory.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("categories.unavailableEyebrow")}</p>
            <h2>{t("categories.unavailableTitle")}</h2>
            <p>{t("categories.unavailableBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("categories.searchBusinesses")}
              </Link>
              <Link className="button" href="/">
                {t("categories.returnHome")}
              </Link>
            </div>
          </section>
        ) : (
          <>
            <form
              className={`${styles.search} ${styles.searchTwo} ov-glass`}
              action="/categories"
              method="get"
              role="search"
              aria-label={t("categories.eyebrow")}
              lang={lang}
            >
              <div className="field">
                <label htmlFor="category-query">
                  {t("categoriesx.searchLabel")}
                </label>
                <input
                  id="category-query"
                  name="q"
                  type="search"
                  defaultValue={filters.q}
                  placeholder={t("categoriesx.searchPlaceholder")}
                  maxLength={80}
                  autoComplete="off"
                />
              </div>
              {filters.listed ? (
                <input type="hidden" name="listed" value="1" />
              ) : null}
              {filters.sort === "az" ? (
                <input type="hidden" name="sort" value="az" />
              ) : null}
              <button
                className={`button primary ${styles.submit}`}
                type="submit"
              >
                {t("categoriesx.searchSubmit")}
              </button>
            </form>

            <div className={styles.stack}>
              <PlaceStats
                label={t("categoriesx.statsAria")}
                items={[
                  {
                    label: t("categoriesx.statCategories"),
                    value: stats.categories,
                  },
                  {
                    label: t("categoriesx.statListed"),
                    value: stats.withBusinesses,
                  },
                  {
                    label: t("categoriesx.statBusinesses"),
                    value: stats.businesses,
                  },
                ]}
              />
            </div>

            {popular.length > 0 ? (
              <section aria-labelledby="popular-title" lang={lang}>
                <h2 id="popular-title" className="eyebrow">
                  {t("categoriesx.popularTitle")}
                </h2>
                <ul className={styles.popular}>
                  {popular.map((entry) => (
                    <li key={entry.slug}>
                      <Link
                        className={styles.pill}
                        href={`/categories/${entry.slug}` as Route}
                        aria-label={t("categoriesx.tileAria", {
                          name: entry.name,
                          count: countLabel(entry.businesses, t),
                        })}
                      >
                        {entry.name}
                        <span className={styles.pillCount} aria-hidden="true">
                          {entry.businesses}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section aria-labelledby="category-list-title">
              <div className={styles.toolbar} lang={lang}>
                <div>
                  <h2 id="category-list-title">
                    {hasCategoryFilters(filters)
                      ? t("categoriesx.matching", {
                          shown: shown.length,
                          total: all.length,
                        })
                      : t("categoriesx.allShown", { total: all.length })}
                  </h2>
                </div>
                <div className="actions">
                  <Link
                    className="filter-chip"
                    href={
                      categoriesHref(filters, {
                        listed: !filters.listed,
                      }) as Route
                    }
                    aria-current={filters.listed ? "true" : undefined}
                  >
                    {t("categoriesx.onlyListed")}
                  </Link>
                  <SortLinks
                    label={t("categoriesx.sortLabel")}
                    items={[
                      {
                        key: "most",
                        label: t("categoriesx.sortMost"),
                        href: categoriesHref(filters, { sort: "most" }),
                        current: filters.sort === "most",
                      },
                      {
                        key: "az",
                        label: t("categoriesx.sortAz"),
                        href: categoriesHref(filters, { sort: "az" }),
                        current: filters.sort === "az",
                      },
                    ]}
                  />
                </div>
              </div>

              {shown.length === 0 ? (
                <div className="state-panel" aria-live="polite" lang={lang}>
                  <h2>
                    {filters.q
                      ? t("categoriesx.emptyTitle", { query: filters.q })
                      : t("categoriesx.emptyListed")}
                  </h2>
                  <p>{t("categoriesx.emptyBody")}</p>
                  <div className="actions">
                    <Link
                      className="button primary"
                      href={"/categories" as Route}
                    >
                      {t("categoriesx.clear")}
                    </Link>
                    <Link
                      className="button"
                      href={
                        (filters.q
                          ? `/businesses?q=${encodeURIComponent(filters.q)}`
                          : "/businesses") as Route
                      }
                    >
                      {t("categoriesx.searchDirectory")}
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className={styles.grid}>
                  {shown.map((entry) => (
                    <li key={entry.slug}>
                      <article
                        className={`${styles.tile} ${
                          entry.businesses === 0 ? styles.tileEmpty : ""
                        }`}
                      >
                        <h3 className={styles.tileTitle}>
                          <Link
                            href={`/categories/${entry.slug}` as Route}
                            aria-label={t("categoriesx.tileAria", {
                              name: entry.name,
                              count: countLabel(entry.businesses, t),
                            })}
                          >
                            {entry.name}
                          </Link>
                        </h3>
                        {entry.welshLabel && entry.welshLabel !== entry.name ? (
                          <p className={styles.meta} lang="cy">
                            {entry.welshLabel}
                          </p>
                        ) : null}
                        <p className={styles.copy} lang="en-GB">
                          {entry.description}
                        </p>
                        <span className={styles.tileCount} lang={lang}>
                          {countLabel(entry.businesses, t)}
                        </span>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
