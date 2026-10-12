import Link from "next/link";
import type { Route } from "next";
import type { Translator } from "@/lib/i18n/translate";
import type { DayCount } from "@/modules/events/agenda";
import {
  eventsHref,
  withEventFilters,
  type EventFilters,
} from "@/modules/events/event-filters";
import { formatDayHeading, formatDayShort } from "@/modules/events/format";
import styles from "./events.module.css";

/**
 * Fourteen days starting today, each showing how many events fall on it. A
 * day with events is a link that sets the day filter; choosing the selected
 * day again clears it. Days with nothing are plain text, so there is no
 * route to an empty page. On narrow screens the strip scrolls sideways inside
 * itself, never the page.
 */
export function DateStrip({
  t,
  lang,
  days,
  filters,
  today,
}: {
  t: Translator;
  lang: string;
  days: DayCount[];
  filters: EventFilters;
  today: string;
}) {
  return (
    <nav className={styles.strip} aria-label={t("eventsx.stripAria")}>
      <ol className={styles.stripList}>
        {days.map(({ dayKey, count }) => {
          const short = formatDayShort(dayKey, lang);
          const full = formatDayHeading(dayKey, lang, today);
          const selected = filters.day === dayKey;
          const label =
            count === 0
              ? t("eventsx.dayNoEvents", { day: full })
              : count === 1
                ? t("eventsx.dayOneEvent", { day: full })
                : t("eventsx.dayEvents", { day: full, count });
          const body = (
            <>
              <span className={styles.stripWeekday} aria-hidden="true">
                {dayKey === today ? t("eventsx.stripToday") : short.weekday}
              </span>
              <span className={styles.stripDay} aria-hidden="true">
                {short.day}
              </span>
              <span className={styles.stripCount} aria-hidden="true">
                {count > 0 ? count : "·"}
              </span>
            </>
          );
          return (
            <li key={dayKey}>
              {count > 0 ? (
                <Link
                  className={styles.stripDayLink}
                  href={
                    eventsHref(
                      withEventFilters(filters, {
                        day: selected ? null : dayKey,
                        when: null,
                      }),
                    ) as Route
                  }
                  aria-label={label}
                  aria-current={selected ? "true" : undefined}
                  data-selected={selected ? "true" : undefined}
                >
                  {body}
                </Link>
              ) : (
                <span
                  className={`${styles.stripDayLink} ${styles.stripDayEmpty}`}
                  role="img"
                  aria-label={label}
                >
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
