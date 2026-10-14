import type { Metadata, Route } from "next";
import Link from "next/link";
import { BrowseHeader } from "@/components/browse/browse-header";
import styles from "@/components/browse/browse.module.css";
import { NumberedPagination } from "@/components/browse/numbered-pagination";
import { OfferCard } from "@/components/browse/offer-card";
import { PillRail, type PillRailItem } from "@/components/browse/pill-rail";
import { SortLinks } from "@/components/browse/sort-links";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import {
  OFFER_WEEK_DAYS,
  hasOfferFilters,
  offerHref,
  parseOfferFilters,
  type RawOfferParams,
} from "@/modules/businesses/offer-filters";
import {
  listOfferCategoryCounts,
  listPublicOffers,
} from "@/modules/businesses/public-offers";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listActivePlaces } from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("offers.metaTitle"),
    description: t("offers.metaDescription"),
    robots: { index: false, follow: false },
    alternates: { types: { "application/atom+xml": "/offers/feed.xml" } },
  };
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<RawOfferParams>;
}) {
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const filters = parseOfferFilters(await searchParams);
  const listFilters = {
    query: filters.q,
    category: filters.category,
    place: filters.place,
    page: filters.page,
    sort: filters.sort,
    endingWithinDays: filters.when === "week" ? OFFER_WEEK_DAYS : undefined,
  };
  const [result, counts, places, categories] = await Promise.all([
    listPublicOffers(listFilters),
    listOfferCategoryCounts(listFilters),
    listActivePlaces(),
    listActiveCategories(),
  ]);
  const now = new Date();

  const selectedPlace = places.find((option) => option.slug === filters.place);
  const selectedCategory = categories.find(
    (option) => option.slug === filters.category,
  );
  const countBySlug = new Map(counts.map((item) => [item.slug, item.count]));
  const allCount = counts.reduce((sum, item) => sum + item.count, 0);
  const railItems: PillRailItem[] = [
    {
      key: "all",
      label: t("offersx.allOffers"),
      count: allCount,
      href: offerHref(filters, { category: "", page: 1 }),
      current: !filters.category,
    },
    ...categories
      .filter(
        (option) =>
          (countBySlug.get(option.slug) ?? 0) > 0 ||
          option.slug === filters.category,
      )
      .map((option) => ({
        key: option.slug,
        label: option.name,
        count: countBySlug.get(option.slug) ?? 0,
        href: offerHref(filters, { category: option.slug, page: 1 }),
        current: option.slug === filters.category,
        ariaLabel: `${option.name}, ${countBySlug.get(option.slug) ?? 0}`,
      })),
  ];

  const chips = [
    filters.q
      ? {
          label: t("offers.filterSearch", { value: filters.q }),
          removeHref: offerHref(filters, { q: "", page: 1 }),
          removeLabel: t("offers.removeSearch", { value: filters.q }),
        }
      : null,
    filters.category
      ? {
          label: t("offers.filterCategory", {
            value: selectedCategory?.name ?? filters.category,
          }),
          removeHref: offerHref(filters, { category: "", page: 1 }),
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
          removeHref: offerHref(filters, { place: "", page: 1 }),
          removeLabel: t("offers.removePlace", {
            value: selectedPlace?.name ?? filters.place,
          }),
        }
      : null,
    filters.when
      ? {
          label: t("offersx.filterWhen"),
          removeHref: offerHref(filters, { when: "", page: 1 }),
          removeLabel: t("offersx.removeWhen"),
        }
      : null,
  ].filter((chip) => chip !== null);

  const firstShown =
    result.state === "ready" ? (result.page - 1) * result.pageSize + 1 : 0;
  const lastShown =
    result.state === "ready" ? firstShown + result.offers.length - 1 : 0;

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <BrowseHeader
          lang={lang}
          eyebrow={t("offers.eyebrow")}
          title={t("offers.title")}
          lead={t("offersx.lead")}
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
          action="/offers"
          method="get"
          role="search"
          aria-label={t("offers.eyebrow")}
          lang={lang}
        >
          <div className="field">
            <label htmlFor="offer-query">{t("offers.searchLabel")}</label>
            <input
              id="offer-query"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder={t("offers.searchPlaceholder")}
              maxLength={80}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="offer-place">{t("offers.placeLabel")}</label>
            <select
              id="offer-place"
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
          {/* The rail and the range link own these; the form keeps them. */}
          {selectedCategory ? (
            <input type="hidden" name="category" value={filters.category} />
          ) : null}
          {filters.when ? (
            <input type="hidden" name="when" value={filters.when} />
          ) : null}
          {filters.sort !== "ending" ? (
            <input type="hidden" name="sort" value={filters.sort} />
          ) : null}
          <button className={`button primary ${styles.submit}`} type="submit">
            {t("offers.filterSubmit")}
          </button>
        </form>

        <div lang={lang}>
          <PillRail label={t("offersx.categoriesAria")} items={railItems} />
        </div>

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
            <Link className="filter-row__clear" href="/offers">
              {t("offers.clearAll")}
            </Link>
          </div>
        ) : null}

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("offers.unavailableEyebrow")}</p>
            <h2>{t("offers.unavailableTitle")}</h2>
            <p>{t("offers.unavailableBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("offers.browseBusinesses")}
              </Link>
              <Link className="button" href="/">
                {t("offers.returnHome")}
              </Link>
            </div>
          </section>
        ) : result.offers.length === 0 ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("offers.emptyEyebrow")}</p>
            <h2>
              {filters.when
                ? t("offersx.emptyWeek")
                : hasOfferFilters(filters)
                  ? t("offers.emptyFiltered")
                  : t("offers.emptyNone")}
            </h2>
            <p>
              {filters.when ? t("offersx.emptyWeekHint") : t("offers.emptyBody")}
            </p>
            <div className="actions">
              {hasOfferFilters(filters) ? (
                <Link className="button primary" href="/offers">
                  {t("offers.clearFilters")}
                </Link>
              ) : null}
              <Link className="button" href="/businesses">
                {t("offers.discoverBusinesses")}
              </Link>
              <Link className="button" href="/events">
                {t("offers.localEvents")}
              </Link>
            </div>
          </section>
        ) : (
          <section aria-labelledby="offer-results-title">
            <div className={styles.toolbar} lang={lang}>
              <div>
                <h2 id="offer-results-title">
                  {result.total === 1
                    ? t("offers.countOne")
                    : t("offers.countMany", { count: result.total })}
                </h2>
                {result.totalPages > 1 ? (
                  <p className={styles.range}>
                    {t("offersx.showing", {
                      from: firstShown,
                      to: lastShown,
                      total: result.total,
                    })}
                  </p>
                ) : null}
              </div>
              <div className="actions">
                <Link
                  className="filter-chip"
                  href={
                    offerHref(filters, {
                      when: filters.when ? "" : "week",
                      page: 1,
                    }) as Route
                  }
                  aria-current={filters.when ? "true" : undefined}
                  aria-label={t("offersx.endingWeekAria")}
                >
                  {t("offersx.endingWeek")}
                </Link>
                <SortLinks
                  label={t("offersx.sortLabel")}
                  items={[
                    {
                      key: "ending",
                      label: t("offersx.sortEnding"),
                      href: offerHref(filters, { sort: "ending", page: 1 }),
                      current: filters.sort === "ending",
                    },
                    {
                      key: "newest",
                      label: t("offersx.sortNewest"),
                      href: offerHref(filters, { sort: "newest", page: 1 }),
                      current: filters.sort === "newest",
                    },
                  ]}
                />
              </div>
            </div>
            <ul className={styles.grid}>
              {result.offers.map((offer) => (
                <li key={offer.id}>
                  <OfferCard t={t} offer={offer} now={now} />
                </li>
              ))}
            </ul>
            <NumberedPagination
              t={t}
              page={result.page}
              totalPages={result.totalPages}
              hrefFor={(page) => offerHref(filters, { page })}
            />
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
