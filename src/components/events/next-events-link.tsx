import Link from "next/link";
import type { Route } from "next";
import type { Translator } from "@/lib/i18n/translate";
import {
  eventsHref,
  withEventFilters,
  type EventFilters,
} from "@/modules/events/event-filters";
import { formatDayHeading } from "@/modules/events/format";
import { monthOfDay } from "@/modules/events/month";
import { weekStartOf } from "@/modules/events/week";

/**
 * "Jump to the next date with events": a plain link into the month or week
 * (whichever the visitor is in) that holds the next listed event, or a kind
 * note when nothing later is listed. Never rendered for the list view.
 */
export function NextEventsLink({
  t,
  lang,
  filters,
  today,
  nextDay,
  quiet = false,
}: {
  t: Translator;
  lang: string;
  filters: EventFilters;
  today: string;
  nextDay: string | null;
  /** Hides the "nothing later" note, for pages that already show events. */
  quiet?: boolean;
}) {
  if (!nextDay) {
    return quiet ? null : (
      <p className="muted" role="status">
        {t("eventsNext.none")}
      </p>
    );
  }
  const href = eventsHref(
    filters.view === "week"
      ? withEventFilters(filters, {
          view: "week",
          week: weekStartOf(nextDay),
          day: null,
        })
      : withEventFilters(filters, {
          view: "month",
          month: monthOfDay(nextDay),
          day: nextDay,
        }),
  );
  const label = formatDayHeading(nextDay, lang, today);
  return (
    <p>
      <Link
        className="button primary"
        href={href as Route}
        aria-label={t("eventsNext.jumpAria", { day: label })}
      >
        {t("eventsNext.jump", { day: label })}
      </Link>
    </p>
  );
}
