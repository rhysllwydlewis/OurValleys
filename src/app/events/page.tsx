import { ContentPicture } from "@/components/content-picture";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import {
  EVENT_WHEN_VALUES,
  parseEventWhen,
  type EventWhen,
} from "@/modules/events/date-window";
import { listPublicEvents } from "@/modules/events/public";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listActivePlaces } from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("events.metaTitle"),
    description: t("events.metaDescription"),
    robots: { index: false, follow: false },
  };
}

type SearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  place?: string | string[];
  when?: string | string[];
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
  when?: EventWhen | null;
  page?: number;
}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.place) params.set("place", filters.place);
  if (filters.when) params.set("when", filters.when);
  if (filters.page && filters.page > 1)
    params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/events?${query}` : "/events";
}

function buildFeedQuery(filters: {
  q?: string;
  category?: string;
  place?: string;
  when?: EventWhen | null;
}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.place) params.set("place", filters.place);
  if (filters.when) params.set("when", filters.when);
  const query = params.toString();
  return query ? `?${query}` : "";
}

function formatDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const whenLabel = (option: EventWhen) => t(`events.when.${option}`);
  const values = await searchParams;
  const query = firstValue(values.q).slice(0, 80);
  const category = firstValue(values.category).slice(0, 80);
  const place = firstValue(values.place).slice(0, 80);
  const when = parseEventWhen(firstValue(values.when));
  const page = parsePage(firstValue(values.page));
  const [result, places, categories] = await Promise.all([
    listPublicEvents({ query, category, place, when: when ?? undefined, page }),
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
          label: t("events.filterSearch", { value: query }),
          removeHref: buildFilterHref({ category, place, when }),
          removeLabel: t("events.removeSearch", { value: query }),
        }
      : null,
    category
      ? {
          label: t("events.filterCategory", {
            value: selectedCategory?.name ?? category,
          }),
          removeHref: buildFilterHref({ q: query, place, when }),
          removeLabel: t("events.removeCategory", {
            value: selectedCategory?.name ?? category,
          }),
        }
      : null,
    when
      ? {
          label: t("events.filterWhen", { value: whenLabel(when) }),
          removeHref: buildFilterHref({ q: query, category, place }),
          removeLabel: t("events.removeWhen", { value: whenLabel(when) }),
        }
      : null,
    place
      ? {
          label: t("events.filterPlace", {
            value: selectedPlace?.name ?? place,
          }),
          removeHref: buildFilterHref({ q: query, category, when }),
          removeLabel: t("events.removePlace", {
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
          aria-labelledby="events-title"
          lang={lang}
        >
          <p className="eyebrow">{t("events.eyebrow")}</p>
          <h1 id="events-title">{t("events.title")}</h1>
          <p className="lead">{t("events.lead")}</p>
          <div className="actions">
            <Link className="button primary" href="/places">
              {t("events.explorePlaces")}
            </Link>
            <Link className="button" href="/businesses">
              {t("events.browseBusinesses")}
            </Link>
            <Link className="button" href={"/offers" as Route}>
              {t("events.localOffers")}
            </Link>
          </div>
        </section>

        <nav
          className="filter-row"
          aria-label={t("events.quickDateAria")}
          lang={lang}
        >
          <span className="filter-row__label">{t("events.whenLabel")}</span>
          {EVENT_WHEN_VALUES.map((option) => (
            <Link
              className="filter-chip"
              href={
                buildFilterHref({
                  q: query,
                  category,
                  place,
                  when: when === option ? null : option,
                }) as Route
              }
              key={option}
              aria-current={when === option ? "true" : undefined}
            >
              {whenLabel(option)}
            </Link>
          ))}
        </nav>

        <form
          className="search-panel ov-glass"
          action="/events"
          method="get"
          lang={lang}
        >
          {when ? <input type="hidden" name="when" value={when} /> : null}
          <div className="field">
            <label htmlFor="event-query">{t("events.searchLabel")}</label>
            <input
              id="event-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder={t("events.searchPlaceholder")}
              maxLength={80}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="event-category">{t("events.categoryLabel")}</label>
            <select
              id="event-category"
              name="category"
              defaultValue={selectedCategory ? category : ""}
            >
              <option value="">{t("events.allCategories")}</option>
              {categories.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="event-place">{t("events.placeLabel")}</label>
            <select
              id="event-place"
              name="place"
              defaultValue={selectedPlace ? place : ""}
            >
              <option value="">{t("events.allPlaces")}</option>
              {places.map((option) => (
                <option key={option.id} value={option.slug}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>
          <button className="button primary" type="submit">
            {t("events.filterSubmit")}
          </button>
        </form>

        <p>
          <a
            href={`/api/events/feed.ics${buildFeedQuery({ q: query, category, place, when })}`}
          >
            {t("events.subscribeLink")}
          </a>{" "}
          {t("events.subscribeNote")}
        </p>

        {activeFilters.length > 0 ? (
          <div
            className="filter-row"
            aria-label={t("events.activeFiltersAria")}
            lang={lang}
          >
            <span className="filter-row__label">{t("events.filteringBy")}</span>
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
            <Link className="filter-row__clear" href="/events">
              {t("events.clearAll")}
            </Link>
          </div>
        ) : null}

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("events.unavailableEyebrow")}</p>
            <h2>{t("events.unavailableTitle")}</h2>
            <p>{t("events.unavailableBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                {t("events.browseBusinesses")}
              </Link>
              <Link className="button" href="/">
                {t("events.returnHome")}
              </Link>
            </div>
          </section>
        ) : result.events.length === 0 ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("events.emptyEyebrow")}</p>
            <h2>
              {activeFilters.length > 0
                ? t("events.emptyFiltered")
                : t("events.emptyNone")}
            </h2>
            <p>{t("events.emptyBody")}</p>
            <div className="actions">
              {activeFilters.length > 0 ? (
                <Link className="button primary" href="/events">
                  {t("events.clearFilters")}
                </Link>
              ) : null}
              <Link className="button" href="/businesses">
                {t("events.discoverBusinesses")}
              </Link>
            </div>
          </section>
        ) : (
          <section
            className="business-results"
            aria-labelledby="event-results-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">{t("events.resultsEyebrow")}</p>
                <h2 id="event-results-title">
                  {result.total === 1
                    ? t("events.countOne")
                    : t("events.countMany", { count: result.total })}
                </h2>
              </div>
              <p>
                {result.totalPages > 0
                  ? t("events.resultsNoteOf", {
                      page: result.page,
                      total: result.totalPages,
                    })
                  : t("events.resultsNote", { page: result.page })}
              </p>
            </div>
            <div className="business-grid">
              {result.events.map((event) => (
                <article
                  className="business-card business-card--simple"
                  key={event.id}
                >
                  <ContentPicture image={event.image} />
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">
                        {event.fictional
                          ? t("events.fictionalDemo")
                          : t("events.localEvent")}
                      </span>
                    </div>
                    <p className="eyebrow">
                      {formatDate(event.startsAt, locale)}
                    </p>
                    <h3>{event.title}</h3>
                    <p>
                      {t("events.by")}{" "}
                      <Link href={`/b/${event.businessSlug}` as Route}>
                        {event.businessName}
                      </Link>
                    </p>
                    {event.locationDisplay ? (
                      <p>{event.locationDisplay}</p>
                    ) : null}
                    <p>{event.description}</p>
                    <Link
                      className="text-link"
                      href={`/events/${event.id}` as Route}
                    >
                      {t("events.viewDetails")}
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            {result.hasPreviousPage || result.hasNextPage ? (
              <nav className="actions" aria-label={t("events.pagesAria")}>
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
                    {t("events.previous")}
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
                    {t("events.next")}
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
