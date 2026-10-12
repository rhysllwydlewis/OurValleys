import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { DateStrip } from "@/components/events/date-strip";
import { EventRow } from "@/components/events/event-row";
import { EventsPagination } from "@/components/events/events-pagination";
import styles from "@/components/events/events.module.css";
import { groupEventsByDay } from "@/modules/events/agenda";
import {
  EVENT_WHEN_VALUES,
  londonDayKey,
  type EventWhen,
} from "@/modules/events/date-window";
import {
  eventsFeedQuery,
  eventsHref,
  parseEventFilters,
  withEventFilters,
  type RawEventParams,
} from "@/modules/events/event-filters";
import { formatDayHeading } from "@/modules/events/format";
import { listEventDayCounts, listPublicEvents } from "@/modules/events/public";
import { listActiveCategories } from "@/modules/reference-data/categories";
import { listActivePlaces } from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("events.metaTitle"),
    description: t("events.metaDescription"),
    robots: { index: false, follow: false },
    alternates: { types: { "application/atom+xml": "/events/feed.xml" } },
  };
}

type SearchParams = Promise<RawEventParams>;

export default async function EventsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const whenLabel = (option: EventWhen) => t(`events.when.${option}`);
  const filters = parseEventFilters(await searchParams);
  const { q: query, category, place, when, day, page } = filters;
  const now = new Date();
  const today = londonDayKey(now);
  const [result, dayCounts, places, categories] = await Promise.all([
    listPublicEvents({
      query,
      category,
      place,
      when: when ?? undefined,
      day: day ?? undefined,
      page,
    }),
    listEventDayCounts({ query, category, place }, now),
    listActivePlaces(),
    listActiveCategories(),
  ]);

  const selectedPlace = places.find((option) => option.slug === place);
  const selectedCategory = categories.find(
    (option) => option.slug === category,
  );
  const without = (change: Partial<typeof filters>) =>
    eventsHref(withEventFilters(filters, change));
  const activeFilters = [
    query
      ? {
          label: t("events.filterSearch", { value: query }),
          removeHref: without({ q: "" }),
          removeLabel: t("events.removeSearch", { value: query }),
        }
      : null,
    category
      ? {
          label: t("events.filterCategory", {
            value: selectedCategory?.name ?? category,
          }),
          removeHref: without({ category: "" }),
          removeLabel: t("events.removeCategory", {
            value: selectedCategory?.name ?? category,
          }),
        }
      : null,
    when
      ? {
          label: t("events.filterWhen", { value: whenLabel(when) }),
          removeHref: without({ when: null }),
          removeLabel: t("events.removeWhen", { value: whenLabel(when) }),
        }
      : null,
    day
      ? {
          label: t("eventsx.filterDay", {
            value: formatDayHeading(day, lang, today),
          }),
          removeHref: without({ day: null }),
          removeLabel: t("eventsx.removeDay", {
            value: formatDayHeading(day, lang, today),
          }),
        }
      : null,
    place
      ? {
          label: t("events.filterPlace", {
            value: selectedPlace?.name ?? place,
          }),
          removeHref: without({ place: "" }),
          removeLabel: t("events.removePlace", {
            value: selectedPlace?.name ?? place,
          }),
        }
      : null,
  ].filter((filter) => filter !== null);

  const agenda =
    result.state === "ready"
      ? groupEventsByDay(result.events, now, day ?? today)
      : [];
  const firstShown =
    result.state === "ready" ? (result.page - 1) * result.pageSize + 1 : 0;
  const lastShown =
    result.state === "ready" ? firstShown + result.events.length - 1 : 0;

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <header className={styles.header} lang={lang}>
          <div>
            <p className="eyebrow">{t("events.eyebrow")}</p>
            <h1 id="events-title">{t("events.title")}</h1>
            <p className={styles.lead + " lead"}>{t("eventsx.lead")}</p>
          </div>
          <div className="actions">
            <Link className="button primary" href="/places">
              {t("events.explorePlaces")}
            </Link>
            <Link className="button" href={"/offers" as Route}>
              {t("events.localOffers")}
            </Link>
          </div>
        </header>

        <form
          className={`${styles.search} ov-glass`}
          action="/events"
          method="get"
          lang={lang}
        >
          {when ? <input type="hidden" name="when" value={when} /> : null}
          {day ? <input type="hidden" name="day" value={day} /> : null}
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
          <button className={`button primary ${styles.submit}`} type="submit">
            {t("events.filterSubmit")}
          </button>
        </form>

        <nav
          className={styles.ranges}
          aria-label={t("events.quickDateAria")}
          lang={lang}
        >
          <span className="filter-row__label">{t("events.whenLabel")}</span>
          {EVENT_WHEN_VALUES.map((option) => (
            <Link
              className="filter-chip"
              href={
                eventsHref(
                  withEventFilters(filters, {
                    when: when === option ? null : option,
                    day: null,
                  }),
                ) as Route
              }
              key={option}
              aria-current={when === option ? "true" : undefined}
            >
              {whenLabel(option)}
            </Link>
          ))}
        </nav>

        {dayCounts && dayCounts.some((entry) => entry.count > 0) ? (
          <div lang={lang}>
            <h2 className="sr-only">{t("eventsx.stripTitle")}</h2>
            <DateStrip
              t={t}
              lang={lang}
              days={dayCounts}
              filters={filters}
              today={today}
            />
          </div>
        ) : null}

        {activeFilters.length > 0 ? (
          <div
            className="filter-row"
            role="group"
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
              {day
                ? t("eventsx.pickedDayEmpty", {
                    day: formatDayHeading(day, lang, today),
                  })
                : activeFilters.length > 0
                  ? t("events.emptyFiltered")
                  : t("events.emptyNone")}
            </h2>
            <p>{day ? t("eventsx.pickedDayHint") : t("events.emptyBody")}</p>
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
          <section aria-labelledby="event-results-title">
            <div className={styles.summary} lang={lang}>
              <h2 id="event-results-title">
                {result.total === 1
                  ? t("events.countOne")
                  : t("events.countMany", { count: result.total })}
              </h2>
              <p>
                {t("eventsx.showing", {
                  from: firstShown,
                  to: lastShown,
                  total: result.total,
                })}{" "}
                ·{" "}
                <a href={`/api/events/feed.ics${eventsFeedQuery(filters)}`}>
                  {t("eventsx.subscribe")}
                </a>
              </p>
            </div>
            <div
              className={styles.agenda}
              role="group"
              aria-label={t("eventsx.agendaAria")}
            >
              {agenda.map((group) => {
                const headingId = `day-${group.dayKey}`;
                const heading =
                  group.kind === "today"
                    ? t("eventsx.today")
                    : group.kind === "tomorrow"
                      ? t("eventsx.tomorrow")
                      : formatDayHeading(group.dayKey, lang, today);
                return (
                  <section
                    className={styles.day}
                    key={group.dayKey}
                    aria-labelledby={headingId}
                    lang={lang}
                  >
                    <h3 className={styles.dayHeading} id={headingId}>
                      {heading}
                      {group.kind !== "date" ? (
                        <span className={styles.dayCount}>
                          {formatDayHeading(group.dayKey, lang, today)}
                        </span>
                      ) : null}
                      <span className={styles.dayCount}>
                        {group.events.length === 1
                          ? t("eventsx.dayCountOne")
                          : t("eventsx.dayCountMany", {
                              count: group.events.length,
                            })}
                      </span>
                    </h3>
                    <ul className={styles.dayList}>
                      {group.events.map(({ event, happeningNow }) => (
                        <li key={event.id}>
                          <EventRow
                            t={t}
                            lang={lang}
                            event={event}
                            happeningNow={happeningNow}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              })}
            </div>
            <EventsPagination
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
