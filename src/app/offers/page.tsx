import { ContentPicture } from "@/components/content-picture";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import {
  daysUntilOfferEnds,
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
  };
}

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

function endsLabel(endsAt: Date | null, now: Date, t: Translator): string {
  const days = daysUntilOfferEnds(endsAt, now);
  if (days === null) return t("offers.noEnd");
  if (days === 0) return t("offers.endsToday");
  if (days === 1) return t("offers.endsTomorrow");
  return t("offers.endsInDays", { days });
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
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
          label: t("offers.filterSearch", { value: query }),
          removeHref: buildFilterHref({ category, place }),
          removeLabel: t("offers.removeSearch", { value: query }),
        }
      : null,
    category
      ? {
          label: t("offers.filterCategory", {
            value: selectedCategory?.name ?? category,
          }),
          removeHref: buildFilterHref({ q: query, place }),
          removeLabel: t("offers.removeCategory", {
            value: selectedCategory?.name ?? category,
          }),
        }
      : null,
    place
      ? {
          label: t("offers.filterPlace", {
            value: selectedPlace?.name ?? place,
          }),
          removeHref: buildFilterHref({ q: query, category }),
          removeLabel: t("offers.removePlace", {
            value: selectedPlace?.name ?? place,
          }),
        }
      : null,
  ].filter((filter) => filter !== null);

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section
          className="directory-intro"
          aria-labelledby="offers-title"
          lang={lang}
        >
          <p className="eyebrow">{t("offers.eyebrow")}</p>
          <h1 id="offers-title">{t("offers.title")}</h1>
          <p className="lead">{t("offers.lead")}</p>
          <div className="actions">
            <Link className="button primary" href="/businesses">
              {t("offers.browseBusinesses")}
            </Link>
            <Link className="button" href="/events">
              {t("offers.localEvents")}
            </Link>
          </div>
        </section>

        <form
          className="search-panel ov-glass"
          action="/offers"
          method="get"
          lang={lang}
        >
          <div className="field">
            <label htmlFor="offer-query">{t("offers.searchLabel")}</label>
            <input
              id="offer-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder={t("offers.searchPlaceholder")}
              maxLength={80}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="offer-category">{t("offers.categoryLabel")}</label>
            <select
              id="offer-category"
              name="category"
              defaultValue={selectedCategory ? category : ""}
            >
              <option value="">{t("offers.allCategories")}</option>
              {categories.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="offer-place">{t("offers.placeLabel")}</label>
            <select
              id="offer-place"
              name="place"
              defaultValue={selectedPlace ? place : ""}
            >
              <option value="">{t("offers.allPlaces")}</option>
              {places.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <button className="button primary" type="submit">
            {t("offers.filterSubmit")}
          </button>
        </form>

        {activeFilters.length > 0 ? (
          <div
            className="filter-row"
            aria-label={t("offers.activeFiltersAria")}
            lang={lang}
          >
            <span className="filter-row__label">{t("offers.filteringBy")}</span>
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
              {activeFilters.length > 0
                ? t("offers.emptyFiltered")
                : t("offers.emptyNone")}
            </h2>
            <p>{t("offers.emptyBody")}</p>
            <div className="actions">
              {activeFilters.length > 0 ? (
                <Link className="button primary" href="/offers">
                  {t("offers.clearFilters")}
                </Link>
              ) : null}
              <Link className="button" href="/businesses">
                {t("offers.discoverBusinesses")}
              </Link>
            </div>
          </section>
        ) : (
          <section
            className="business-results"
            aria-labelledby="offer-results-title"
          >
            <div className="section-heading" lang={lang}>
              <div>
                <p className="eyebrow">{t("offers.resultsEyebrow")}</p>
                <h2 id="offer-results-title">
                  {result.total === 1
                    ? t("offers.countOne")
                    : t("offers.countMany", { count: result.total })}
                </h2>
              </div>
              <p>
                {result.totalPages > 0
                  ? t("offers.resultsNoteOf", {
                      page: result.page,
                      total: result.totalPages,
                    })
                  : t("offers.resultsNote", { page: result.page })}
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
                        {offer.fictional
                          ? t("offers.fictionalDemo")
                          : t("offers.localOffer")}
                      </span>
                    </div>
                    <p className="eyebrow">{endsLabel(offer.endsAt, now, t)}</p>
                    <h3>{offer.title}</h3>
                    <p>
                      {t("offers.from")}{" "}
                      <Link href={`/b/${offer.businessSlug}` as Route}>
                        {offer.businessName}
                      </Link>
                    </p>
                    <p>{offer.description}</p>
                    {offer.terms ? (
                      <details>
                        <summary>{t("offers.terms")}</summary>
                        <p>{offer.terms}</p>
                      </details>
                    ) : null}
                    <Link
                      className="text-link"
                      href={`/b/${offer.businessSlug}#offers` as Route}
                    >
                      {t("offers.viewOnBusiness")}
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {result.hasPreviousPage || result.hasNextPage ? (
              <nav className="actions" aria-label={t("offers.pagesAria")}>
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
                    {t("offers.previous")}
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
                    {t("offers.next")}
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
