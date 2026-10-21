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

/** One plain sentence for the status, or null when nothing can be said. */
export function describeOpeningStatus(
  status: OpeningStatus,
  t: Translator,
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
      if (status.today.special && status.note) {
        return {
          tone: "closed",
          text: t("hours.live.closedToday"),
          note: status.note,
        };
      }
      if (!next) {
        return { tone: "closed", text: t("hours.live.closed"), note: null };
      }
      return {
        tone: "closed",
        text:
          next.daysAway === 1
            ? t("hours.live.opensTomorrow", { time: next.opensAt })
            : t("hours.live.opensOn", {
                day: weekdayName(t, next.dayOfWeek),
                time: next.opensAt,
              }),
        note: null,
      };
    }
  }
}
