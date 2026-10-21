import { weekdayKeys } from "@/lib/i18n/business-copy";
import type { Translator } from "@/lib/i18n/translate";
import type { OpeningStatus } from "./opening-status";

export type StatusTone = "open" | "soon" | "closed";

export type StatusLine = {
  tone: StatusTone;
  /** The full sentence, for example "Open now · closes at 17:30". */
  text: string;
  /** Owner-written reason for a special closure, shown in its own language. */
  note: string | null;
};

/** 0 = Sunday, as in the database; the label keys start on Monday. */
export function weekdayName(t: Translator, dayOfWeek: number): string {
  const key = weekdayKeys[(dayOfWeek + 6) % 7] ?? weekdayKeys[0];
  return t(`dash.day.${key}`);
}

/** From this many days away a bare weekday could mean either of two weeks. */
const DATE_FROM_DAYS_AWAY = 7;

function dayAndDate(date: string, locale: "en" | "cy"): string {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Intl.DateTimeFormat(locale === "cy" ? "cy-GB" : "en-GB", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** "opens tomorrow at 09:00", "opens Monday at 09:00" or, a week or more away, with its date. */
function nextOpeningPhrase(
  next: NonNullable<Extract<OpeningStatus, { kind: "closed" }>["next"]>,
  t: Translator,
  locale: "en" | "cy",
): string {
  if (next.daysAway === 1) {
    return t("hours.live.reopensTomorrow", { time: next.opensAt });
  }
  return next.daysAway >= DATE_FROM_DAYS_AWAY
    ? t("hours.live.reopensOn", {
        day: dayAndDate(next.date, locale),
        time: next.opensAt,
      })
    : t("hours.live.reopensOn", {
        day: weekdayName(t, next.dayOfWeek),
        time: next.opensAt,
      });
}

/** One plain sentence for the status, or null when nothing can be said. */
export function describeOpeningStatus(
  status: OpeningStatus,
  t: Translator,
  locale: "en" | "cy" = "en",
): StatusLine | null {
  switch (status.kind) {
    case "unknown":
      return null;
    case "open":
      return {
        tone: status.closingSoon ? "soon" : "open",
        text: t(
          status.closingSoon ? "hours.live.closingSoon" : "hours.live.open",
          { time: status.closesAt },
        ),
        note: null,
      };
    case "opens-later":
      return {
        tone: "closed",
        text: t("hours.live.opensLater", { time: status.opensAt }),
        note: null,
      };
    case "closed": {
      const next = status.next;
      const reopens = next ? nextOpeningPhrase(next, t, locale) : null;
      // Only a day with no opening interval at all is an all-day closure; a
      // special day that had hours and is now over is simply closed for now.
      const allDayClosure = status.today.special && !status.today.opens;
      if (allDayClosure && status.note) {
        return {
          tone: "closed",
          text: reopens
            ? `${t("hours.live.closedToday")} · ${reopens}`
            : t("hours.live.closedToday"),
          note: status.note,
        };
      }
      return {
        tone: "closed",
        text: reopens
          ? `${t("hours.live.closedNow")} · ${reopens}`
          : t("hours.live.closed"),
        note: status.today.special ? status.note : null,
      };
    }
  }
}
