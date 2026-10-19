import Link from "next/link";
import type { Route } from "next";
import type { Translator } from "@/lib/i18n/translate";
import {
  eventsHref,
  withEventFilters,
  type EventFilters,
} from "@/modules/events/event-filters";
import { formatDayHeading } from "@/modules/events/format";
import { buildMonthGrid } from "@/modules/events/month";
import type { PublicEvent } from "@/modules/events/public";
import styles from "./events.module.css";

const TITLES_SHOWN = 2;

/** A Monday-first run of weekday names in the reader's language. */
function weekdayNames(lang: string) {
  // 2026-11-02 is a Monday.
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 10, 2 + index, 12));
    const part = (weekday: "long" | "short") =>
      new Intl.DateTimeFormat(lang, {
        weekday: weekday,
        timeZone: "UTC",
      }).format(date);
    return { long: part("long"), short: part("short") };
  });
}

/**
 * One month as a table: a column per weekday, a row per week. A day with
 * events is a link that picks the day (choosing it again clears the pick), so
 * the grid works without JavaScript and by keyboard; the event titles inside a
 * cell are decoration for sighted readers, and the link's own label gives the
 * day and its count. The real event links are in the list below the grid.
 * Owner-typed titles carry their own language.
 */
export function MonthCalendar({
  t,
  lang,
  month,
  monthLabel,
  filters,
  today,
  eventsByDay,
}: {
  t: Translator;
  lang: string;
  month: string;
  monthLabel: string;
  filters: EventFilters;
  today: string;
  eventsByDay: Map<string, PublicEvent[]>;
}) {
  const weeks = buildMonthGrid(month);
  const names = weekdayNames(lang);
  return (
    <div className={styles.monthWrap}>
      <table className={styles.monthGrid}>
        <caption className="sr-only">
          {monthLabel}. {t("eventsCal.gridHint")}
        </caption>
        <thead>
          <tr>
            {names.map((name) => (
              <th key={name.long} scope="col" abbr={name.long}>
                <span aria-hidden="true">{name.short}</span>
                <span className="sr-only">{name.long}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week) => (
            <tr key={week[0]?.dayKey}>
              {week.map(({ dayKey, inMonth }) => {
                const events = eventsByDay.get(dayKey) ?? [];
                const count = events.length;
                const selected = filters.day === dayKey;
                const isToday = dayKey === today;
                const dayNumber = Number(dayKey.slice(8));
                const full = formatDayHeading(dayKey, lang, today);
                const label =
                  count === 0
                    ? t("eventsCal.dayEmpty", { day: full })
                    : count === 1
                      ? t("eventsx.dayOneEvent", { day: full })
                      : t("eventsx.dayEvents", { day: full, count });
                const body = (
                  <>
                    <span className={styles.monthNumber} aria-hidden="true">
                      {dayNumber}
                    </span>
                    {count > 0 ? (
                      <span className={styles.monthCount} aria-hidden="true">
                        {count}
                      </span>
                    ) : null}
                    {count > 0 ? (
                      <span className={styles.monthTitles} aria-hidden="true">
                        {events.slice(0, TITLES_SHOWN).map((event) => (
                          <span
                            key={event.id}
                            className={styles.monthTitle}
                            lang={event.welshTitle ? "cy-GB" : "en-GB"}
                          >
                            {event.title}
                          </span>
                        ))}
                        {count > TITLES_SHOWN ? (
                          <span className={styles.monthMore} lang={lang}>
                            {t("eventsCal.more", {
                              count: count - TITLES_SHOWN,
                            })}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </>
                );
                return (
                  <td
                    key={dayKey}
                    className={styles.monthCell}
                    data-outside={inMonth ? undefined : "true"}
                    data-today={isToday ? "true" : undefined}
                    data-selected={selected ? "true" : undefined}
                  >
                    {count > 0 ? (
                      <Link
                        className={styles.monthLink}
                        href={
                          `${eventsHref(
                            withEventFilters(filters, {
                              view: "month",
                              month,
                              day: selected ? null : dayKey,
                              when: null,
                            }),
                          )}#month-events` as Route
                        }
                        aria-label={label}
                        aria-current={
                          selected ? "true" : isToday ? "date" : undefined
                        }
                      >
                        {body}
                      </Link>
                    ) : (
                      <div
                        className={styles.monthLink}
                        role="img"
                        aria-label={label}
                        aria-current={isToday ? "date" : undefined}
                      >
                        {body}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
