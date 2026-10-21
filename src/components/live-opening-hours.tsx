"use client";

import { useEffect, useState } from "react";
import { useLocale, useT } from "@/lib/i18n/client";
import { weekdayLabel } from "@/lib/i18n/business-copy";
import {
  openingStatus,
  resolveDay,
  londonClock,
  type OpeningSchedule,
} from "@/modules/businesses/opening-status";
import { describeOpeningStatus } from "@/modules/businesses/opening-status-copy";
import styles from "./live-opening-hours.module.css";

/**
 * "Open now" status and a today-aware hours list for the business website.
 * The server renders the first answer from the time it was asked; the browser
 * then takes over and re-checks every 30 seconds and whenever the tab becomes
 * visible again, so a page left open overnight never says "open" at midnight.
 * Without script the server's answer simply stays on screen.
 */

const REFRESH_MS = 30_000;

function useNow(initialIso: string): Date {
  const [now, setNow] = useState(() => new Date(initialIso));
  useEffect(() => {
    const update = () => {
      console.log("LIVE update", new Date().toISOString());
      setNow(new Date());
    };
    update();
    const timer = window.setInterval(update, REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return now;
}

export function OpenStatusChip({
  schedule,
  initialNow,
}: {
  schedule: OpeningSchedule;
  /** ISO time the server rendered at, so first paint matches the markup. */
  initialNow: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const now = useNow(initialNow);
  const line = describeOpeningStatus(openingStatus(schedule, now), t);
  if (!line) return null;
  return (
    <p
      className={`${styles.chip} ${styles[line.tone]}`}
      data-status={line.tone}
      data-testid="open-status"
    >
      <span className={styles.dot} aria-hidden="true" />
      <span>
        {line.text}
        {line.note ? (
          <>
            {" · "}
            <span lang={locale === "cy" ? "en-GB" : undefined}>
              {line.note}
            </span>
          </>
        ) : null}
      </span>
    </p>
  );
}

const ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
const DAY_NAME = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

/** Monday to Sunday with today picked out and any special day for it applied. */
export function LiveHoursList({
  schedule,
  initialNow,
}: {
  schedule: OpeningSchedule;
  initialNow: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const now = useNow(initialNow);
  const clock = londonClock(now);
  return (
    <dl className={styles.list}>
      {ORDER.map((dayOfWeek) => {
        const isToday = dayOfWeek === clock.dayOfWeek;
        const today = isToday ? resolveDay(schedule, clock.date) : null;
        const rule = schedule.weekly[dayOfWeek];
        const opens = today ? today.opens : (rule?.opens ?? null);
        const closes = today ? today.closes : (rule?.closes ?? null);
        const hours =
          opens && closes ? `${opens}–${closes}` : t("site.hours.closed");
        return (
          <div
            key={dayOfWeek}
            className={isToday ? styles.today : undefined}
            aria-current={isToday ? "date" : undefined}
          >
            <dt>
              {weekdayLabel(t, DAY_NAME[dayOfWeek]!)}
              {isToday ? (
                <span className={styles.todayTag}>{t("hours.live.today")}</span>
              ) : null}
            </dt>
            <dd>
              {hours}
              {today?.special && today.note ? (
                <span
                  className={styles.dayNote}
                  lang={locale === "cy" ? "en-GB" : undefined}
                >
                  {today.note}
                </span>
              ) : null}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}
