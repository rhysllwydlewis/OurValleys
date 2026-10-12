import Link from "next/link";
import type { Route } from "next";
import { ContentPicture } from "@/components/content-picture";
import type { Translator } from "@/lib/i18n/translate";
import { formatEventTimes } from "@/modules/events/format";
import type { PublicEvent } from "@/modules/events/public";
import styles from "./events.module.css";

/**
 * One event in the agenda. The title is the real link (the whole row is made
 * clickable by a stretched pseudo-element); "Add to calendar" sits above it
 * so it stays a separate, keyboard-reachable control. Owner-typed text
 * (title, venue, description, business name) is data and carries
 * `lang="en-GB"`.
 */
export function EventRow({
  t,
  lang,
  event,
  happeningNow,
}: {
  t: Translator;
  lang: string;
  event: PublicEvent;
  happeningNow: boolean;
}) {
  const times = formatEventTimes(event, lang, (when) =>
    t("eventsx.until", { when }),
  );
  return (
    <article
      className={styles.row}
      data-happening={happeningNow || undefined}
      data-no-picture={event.image ? undefined : true}
    >
      <div className={styles.rowTime}>
        <span className={styles.rowStart}>{times.start}</span>
        {times.until ? (
          <span className={styles.rowUntil}>{times.until}</span>
        ) : null}
      </div>
      {event.image ? (
        <div className={styles.rowPicture}>
          <ContentPicture
            image={event.image}
            sizes="(max-width: 700px) 30vw, 180px"
          />
        </div>
      ) : null}
      <div className={styles.rowBody}>
        <div className="tag-row">
          {happeningNow ? (
            <span className={`tag ${styles.nowTag}`}>
              {t("eventsx.happeningNow")}
            </span>
          ) : null}
          {event.fictional ? (
            <span className="tag">{t("events.fictionalDemo")}</span>
          ) : null}
        </div>
        <h3 className={styles.rowTitle} lang="en-GB">
          <Link
            className={styles.rowLink}
            href={`/events/${event.id}` as Route}
          >
            {event.title}
          </Link>
        </h3>
        <p className={styles.rowMeta} lang="en-GB">
          {event.businessName}
          {event.locationDisplay ? ` · ${event.locationDisplay}` : ""}
        </p>
        <p className={styles.rowDescription} lang="en-GB">
          {event.description}
        </p>
      </div>
      <a
        className={styles.rowCalendar}
        href={`/api/events/${event.id}/ics`}
        aria-label={t("eventsx.addToCalendarAria", { title: event.title })}
      >
        {t("eventsx.addToCalendar")}
      </a>
    </article>
  );
}
