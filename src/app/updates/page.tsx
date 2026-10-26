import type { Metadata, Route } from "next";
import Link from "next/link";
import { BrowseHeader } from "@/components/browse/browse-header";
import styles from "@/components/browse/browse.module.css";
import { NumberedPagination } from "@/components/browse/numbered-pagination";
import { UpdateCard } from "@/components/browse/update-card";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { listPublicUpdateFeed } from "@/modules/businesses/public-updates";
import {
  hasUpdateFilters,
  parseUpdateFilters,
  updateHref,
  type RawUpdateParams,
} from "@/modules/businesses/update-filters";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listActivePlaces } from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("upd.feed.metaTitle"),
    description: t("upd.feed.metaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function UpdatesFeedPage({
  searchParams,
}: {
  searchParams: Promise<RawUpdateParams>;
}) {
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const filters = parseUpdateFilters(await searchParams);
  const [result, places, categories] = await Promise.all([
    listPublicUpdateFeed({
      query: filters.q,
      category: filters.category,
      place: filters.place,
      page: filters.page,
      locale,
    }),
    listActivePlaces(),
    listActiveCategories(),
  ]);
  const selectedPlace = places.find((option) => option.slug === filters.place);
  const selectedCategory = categories.find(
    (option) => option.slug === filters.category,
  );
  const chips = [
    filters.q
      ? {
          label: t("offers.filterSearch", { value: filters.q }),
          removeHref: updateHref(filters, { q: "", page: 1 }),
          removeLabel: t("offers.removeSearch", { value: filters.q }),
        }
      : null,
    filters.category
      ? {
          label: t("offers.filterCategory", {
            value: selectedCategory?.name ?? filters.category,
          }),
          removeHref: updateHref(filters, { category: "", page: 1 }),
          removeLabel: t("offers.removeCategory", {
            value: selectedCategory?.name ?? filters.category,
          }),
        }
      : null,
    filters.place
      ? {
          label: t("offers.filterPlace", {
            value: selectedPlace?.name ?? filters.place,
          }),
          removeHref: updateHref(filters, { place: "", page: 1 }),
          removeLabel: t("offers.removePlace", {
            value: selectedPlace?.name ?? filters.place,
          }),
        }
      : null,
  ].filter((chip) => chip !== null);

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <BrowseHeader
          lang={lang}
          eyebrow={t("upd.feed.eyebrow")}
          title={t("upd.feed.title")}
          lead={t("upd.feed.lead")}
        >
          <Link className="button primary" href="/businesses">
            {t("offers.browseBusinesses")}
          </Link>
          <Link className="button" href="/events">
            {t("offers.localEvents")}
          </Link>
        </BrowseHeader>

        <form
          className={`${styles.search} ${styles.searchThree} ov-glass`}
          action="/updates"
          method="get"
          role="search"
          aria-label={t("upd.feed.eyebrow")}
          lang={lang}
        >
          <div className="field">
            <label htmlFor="update-query">{t("upd.feed.searchLabel")}</label>
            <input
              id="update-query"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder={t("upd.feed.searchPlaceholder")}
              maxLength={80}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="update-place">{t("offers.placeLabel")}</label>
            <select
              id="update-place"
              name="place"
              defaultValue={selectedPlace ? filters.place : ""}
            >
              <option value="">{t("offers.allPlaces")}</option>
              {places.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="update-category">
              {t("upd.feed.categoryLabel")}
            </label>
            <select
              id="update-category"
              name="category"
              defaultValue={selectedCategory ? filters.category : ""}
            >
              <option value="">{t("upd.feed.allCategories")}</option>
              {categories.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <button className={`button primary ${styles.submit}`} type="submit">
            {t("offers.filterSubmit")}
          </button>
        </form>

        {chips.length > 0 ? (
          <div
            className="filter-row"
            aria-label={t("offers.activeFiltersAria")}
            lang={lang}
          >
            <span className="filter-row__label">{t("offers.filteringBy")}</span>
            {chips.map((chip) => (
              <Link
                className="filter-chip"
                href={chip.removeHref as Route}
                key={chip.label}
                aria-label={chip.removeLabel}
              >
                {chip.label}
                <span aria-hidden="true"> ×</span>
              </Link>
            ))}
            <Link className="filter-row__clear" href="/updates">
              {t("offers.clearAll")}
            </Link>
          </div>
        ) : null}

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("offers.unavailableEyebrow")}</p>
            <h2>{t("upd.feed.unavailableTitle")}</h2>
            <p>{t("upd.feed.unavailableBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("offers.browseBusinesses")}
              </Link>
              <Link className="button" href="/">
                {t("offers.returnHome")}
              </Link>
            </div>
          </section>
        ) : result.updates.length === 0 ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("offers.emptyEyebrow")}</p>
            <h2>
              {hasUpdateFilters(filters)
                ? t("upd.feed.emptyFiltered")
                : t("upd.feed.emptyNone")}
            </h2>
            <p>{t("upd.feed.emptyBody")}</p>
            <div className="actions">
              {hasUpdateFilters(filters) ? (
                <Link className="button primary" href="/updates">
                  {t("offers.clearFilters")}
                </Link>
              ) : null}
              <Link className="button" href="/businesses">
                {t("offers.discoverBusinesses")}
              </Link>
            </div>
          </section>
        ) : (
          <section aria-labelledby="update-results-title">
            <div className={styles.toolbar} lang={lang}>
              <h2 id="update-results-title">
                {result.total === 1
                  ? t("upd.feed.countOne")
                  : t("upd.feed.countMany", { count: result.total })}
              </h2>
            </div>
            <ul className={styles.grid}>
              {result.updates.map((update) => (
                <li key={update.id}>
                  <UpdateCard t={t} locale={locale} update={update} />
                </li>
              ))}
            </ul>
            <NumberedPagination
              t={t}
              page={result.page}
              totalPages={result.totalPages}
              hrefFor={(page) => updateHref(filters, { page })}
            />
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
