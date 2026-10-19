import Link from "next/link";
import type { Route } from "next";
import type { Translator } from "@/lib/i18n/translate";
import { groupEventsByDay } from "@/modules/events/agenda";
import {
  eventsHref,
  withEventFilters,
  type EventFilters,
} from "@/modules/events/event-filters";
import { formatDayHeading } from "@/modules/events/format";
import {
  currentEventMonth,
  eventsByMonthDay,
  shiftEventMonth,
} from "@/modules/events/month";
import type { PublicEventMonthResult } from "@/modules/events/public";
import { EventRow } from "./event-row";
import { MonthCalendar } from "./month-calendar";
import styles from "./events.module.css";

function formatMonth(month: string, lang: string): string {
  return new Intl.DateTimeFormat(lang, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
}

/**
 * The month view of `/events`: month navigation, the grid, then the events
 * themselves as an agenda (the whole month, or the one day the visitor picked).
 * Past months are reachable by URL but the previous-month link stops at the
 * current month, because finished events are not public.
 */
export function MonthSection({
  t,
  lang,
  filters,
  result,
  month,
  now,
  today,
  hasFilters,
}: {
  t: Translator;
  lang: string;
  filters: EventFilters;
  result: PublicEventMonthResult;
  month: string;
  now: Date;
  today: string;
  hasFilters: boolean;
}) {
  const thisMonth = currentEventMonth(now);
  const previous = shiftEventMonth(month, -1);
  const next = shiftEventMonth(month, 1);
  const monthLabel = formatMonth(month, lang);
  const monthHref = (target: string) =>
    eventsHref(
      withEventFilters(filters, { view: "month", month: target, day: null }),
    ) as Route;
  const pastMonth = month < thisMonth;
  const events = result.state === "ready" ? result.events : [];
  const eventsByDay = eventsByMonthDay(events, month);
  const picked =
    filters.day && filters.day.startsWith(month) ? filters.day : null;
  const pickedEvents = picked ? (eventsByDay.get(picked) ?? []) : [];
  const listEvents = picked ? pickedEvents : events;
  const anchor = picked ?? (month === thisMonth ? today : `${month}-01`);
  const agenda = groupEventsByDay(listEvents, now, anchor);
  const heading = picked
    ? t("eventsCal.dayPanel", { day: formatDayHeading(picked, lang, today) })
    : events.length === 1
      ? t("eventsCal.monthCountOne", { month: monthLabel })
      : t("eventsCal.monthCount", { count: events.length, month: monthLabel });

  return (
    <section aria-labelledby="month-title" lang={lang}>
      <nav className={styles.monthNav} aria-label={t("eventsCal.monthNavAria")}>
        {pastMonth || month === thisMonth ? null : (
          <Link
            className="button"
            rel="prev"
            href={monthHref(previous)}
            aria-label={t("eventsCal.previous")}
          >
            <span aria-hidden="true">‹ </span>
            {formatMonth(previous, lang)}
          </Link>
        )}
        <h2 className={styles.monthTitle2} id="month-title">
          {monthLabel}
        </h2>
        <Link
          className="button"
          rel="next"
          href={monthHref(next)}
          aria-label={t("eventsCal.next")}
        >
          {formatMonth(next, lang)}
          <span aria-hidden="true"> ›</span>
        </Link>
        {month === thisMonth ? null : (
          <Link className="button" href={monthHref(thisMonth)}>
            {t("eventsCal.thisMonth")}
          </Link>
        )}
      </nav>

      {pastMonth ? (
        <p className={styles.monthNote}>{t("eventsCal.pastMonth")}</p>
      ) : null}
      {result.state === "ready" && result.truncated ? (
        <p className={styles.monthNote} role="status">
          {t("eventsCal.truncated")}
        </p>
      ) : null}

      {result.state === "unavailable" ? (
        <section className="state-panel" aria-live="polite">
          <h2>{t("eventsCal.unavailableTitle")}</h2>
          <p>{t("eventsCal.unavailableBody")}</p>
          <div className="actions">
            <Link
              className="button primary"
              href={
                eventsHref(
                  withEventFilters(filters, { view: "list", month: null }),
                ) as Route
              }
            >
              {t("eventsCal.listView")}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <MonthCalendar
            t={t}
            lang={lang}
            month={month}
            monthLabel={monthLabel}
            filters={filters}
            today={today}
            eventsByDay={eventsByDay}
          />
          <section id="month-events" aria-labelledby="month-events-title">
            <div className={styles.summary}>
              <h2 id="month-events-title">{heading}</h2>
              {picked ? (
                <Link
                  className="button"
                  href={`${monthHref(month)}#month-events` as Route}
                >
                  {t("eventsCal.showMonth")}
                </Link>
              ) : null}
            </div>
            {listEvents.length === 0 ? (
              <div className="state-panel" aria-live="polite">
                <h3>
                  {picked
                    ? t("eventsx.pickedDayEmpty", {
                        day: formatDayHeading(picked, lang, today),
                      })
                    : t("eventsCal.monthEmpty", { month: monthLabel })}
                </h3>
                <p>{t("eventsCal.monthEmptyHint")}</p>
                <div className="actions">
                  <Link className="button primary" href={monthHref(next)}>
                    {formatMonth(next, lang)}
                  </Link>
                  {hasFilters ? (
                    <Link
                      className="button"
                      href={`/events?view=month&month=${month}` as Route}
                    >
                      {t("events.clearFilters")}
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <div
                className={styles.agenda}
                role="group"
                aria-label={t("eventsx.agendaAria")}
              >
                {agenda.map((group) => {
                  const headingId = `month-day-${group.dayKey}`;
                  return (
                    <section
                      className={styles.day}
                      key={group.dayKey}
                      aria-labelledby={headingId}
                    >
                      <h3 className={styles.dayHeading} id={headingId}>
                        {group.kind === "today"
                          ? t("eventsx.today")
                          : group.kind === "tomorrow"
                            ? t("eventsx.tomorrow")
                            : formatDayHeading(group.dayKey, lang, today)}
                        {group.kind !== "date" ? (
                          <span className={styles.dayCount}>
                            {formatDayHeading(group.dayKey, lang, today)}
                          </span>
                        ) : null}
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
            )}
          </section>
        </>
      )}
    </section>
  );
}
