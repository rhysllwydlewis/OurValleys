import Link from "next/link";
import type { Route } from "next";
import type { Translator } from "@/lib/i18n/translate";
import { isHappeningNow } from "@/modules/events/agenda";
import {
  eventsHref,
  eventsPeriodFeedQuery,
  withEventFilters,
  type EventFilters,
} from "@/modules/events/event-filters";
import { formatDayHeading } from "@/modules/events/format";
import type { PublicEventWeekResult } from "@/modules/events/public";
import {
  currentEventWeek,
  eventsByWeekDay,
  shiftEventWeek,
  weekDayKeys,
} from "@/modules/events/week";
import { EventRow } from "./event-row";
import { NextEventsLink } from "./next-events-link";
import styles from "./events.module.css";

function shortDay(dayKey: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${dayKey}T12:00:00Z`));
}

/**
 * The week view of `/events`: week navigation, then one card per day
 * (Monday first) with that day's events, so a visitor planning the week can see
 * every day, including the quiet ones, at a glance. Finished days are not
 * public, so the previous-week link stops at the current week. Everything is
 * plain links, so it works without JavaScript.
 */
export function WeekSection({
  t,
  lang,
  filters,
  result,
  week,
  now,
  today,
  nextDay,
}: {
  t: Translator;
  lang: string;
  filters: EventFilters;
  result: PublicEventWeekResult;
  week: string;
  now: Date;
  today: string;
  /** The day of the first event after this week, or null. */
  nextDay: string | null;
}) {
  const thisWeek = currentEventWeek(now);
  const days = weekDayKeys(week);
  const first = days[0] as string;
  const last = days[6] as string;
  const weekHref = (target: string) =>
    eventsHref(
      withEventFilters(filters, { view: "week", week: target, day: null }),
    ) as Route;
  const pastWeek = week < thisWeek;
  const events = result.state === "ready" ? result.events : [];
  const byDay = eventsByWeekDay(events, week, today);
  const distinct = new Set(
    Array.from(byDay.values()).flatMap((list) => list.map((e) => e.id)),
  ).size;
  const range = t("eventsWeek.range", {
    from: shortDay(first, lang),
    to: shortDay(last, lang),
  });
  const previous = shiftEventWeek(week, -1);
  const next = shiftEventWeek(week, 1);

  return (
    <section aria-labelledby="week-title" lang={lang}>
      <nav className={styles.monthNav} aria-label={t("eventsWeek.navAria")}>
        {pastWeek || week === thisWeek ? null : (
          <Link className="button" rel="prev" href={weekHref(previous)}>
            <span aria-hidden="true">‹ </span>
            {t("eventsWeek.previous")}
          </Link>
        )}
        <h2 className={styles.monthTitle2} id="week-title">
          {range}
        </h2>
        <Link className="button" rel="next" href={weekHref(next)}>
          {t("eventsWeek.next")}
          <span aria-hidden="true"> ›</span>
        </Link>
        {week === thisWeek ? null : (
          <Link className="button" href={weekHref(thisWeek)}>
            {t("eventsWeek.thisWeek")}
          </Link>
        )}
      </nav>

      {pastWeek ? (
        <p className={styles.monthNote}>{t("eventsWeek.pastWeek")}</p>
      ) : null}
      {result.state === "ready" && result.truncated ? (
        <p className={styles.monthNote} role="status">
          {t("eventsWeek.truncated")}
        </p>
      ) : null}

      {result.state === "unavailable" ? (
        <section className="state-panel">
          <h2>{t("eventsWeek.unavailableTitle")}</h2>
          <p>{t("eventsWeek.unavailableBody")}</p>
          <div className="actions">
            <Link
              className="button primary"
              href={
                eventsHref(
                  withEventFilters(filters, {
                    view: "list",
                    week: null,
                  }),
                ) as Route
              }
            >
              {t("eventsCal.listView")}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className={styles.summary}>
            <h3 id="week-count">
              {distinct === 1
                ? t("eventsWeek.countOne")
                : t("eventsWeek.count", { count: distinct })}
            </h3>
            <p>
              <a
                href={`/api/events/feed.ics${eventsPeriodFeedQuery(filters, { week })}`}
              >
                {t("eventsSub.week")}
              </a>
            </p>
          </div>
          {distinct === 0 ? (
            <div className="state-panel">
              <h3>{t("eventsWeek.weekEmpty")}</h3>
              <p>{t("eventsCal.monthEmptyHint")}</p>
              <NextEventsLink
                t={t}
                lang={lang}
                filters={filters}
                today={today}
                nextDay={nextDay}
              />
            </div>
          ) : null}
          <ol
            className={styles.weekDays}
            aria-label={t("eventsWeek.weekAgenda")}
          >
            {days.map((dayKey) => {
              const list = byDay.get(dayKey) ?? [];
              const finished = dayKey < today;
              const headingId = `week-day-${dayKey}`;
              return (
                <li
                  key={dayKey}
                  className={styles.weekDay}
                  data-today={dayKey === today ? "true" : undefined}
                  data-empty={list.length === 0 ? "true" : undefined}
                  data-past={finished ? "true" : undefined}
                >
                  <section aria-labelledby={headingId}>
                    <h3 className={styles.weekDayHeading} id={headingId}>
                      {dayKey === today
                        ? `${t("eventsx.today")} · ${formatDayHeading(dayKey, lang, today)}`
                        : formatDayHeading(dayKey, lang, today)}
                      <span className={styles.dayCount}>
                        {list.length === 0
                          ? finished
                            ? t("eventsWeek.dayFinished")
                            : t("eventsWeek.dayNothing")
                          : t("eventsWeek.dayCount", { count: list.length })}
                      </span>
                    </h3>
                    {list.length > 0 ? (
                      <ul className={styles.dayList}>
                        {list.map((event) => (
                          <li key={event.id}>
                            <EventRow
                              t={t}
                              lang={lang}
                              event={event}
                              happeningNow={isHappeningNow(event, now)}
                            />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
