import { authoredTextLang } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import { OpenStatusChip } from "@/components/live-opening-hours";
import {
  hasAnyHours,
  weekOutlook,
  type OpeningSchedule,
} from "@/modules/businesses/opening-status";
import styles from "./operations.module.css";

/**
 * What a visitor would read on the business page right now, and what the next
 * seven days look like once special days are applied. Gives owners a way to
 * check bank holidays and one-off changes without opening the public page.
 */
export async function HoursOutlook({
  schedule,
}: {
  schedule: OpeningSchedule;
}) {
  const { locale, t } = await getTranslator();
  const dayLabel = new Intl.DateTimeFormat(
    locale === "cy" ? "cy-GB" : "en-GB",
    {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "short",
    },
  );
  const now = new Date();
  const days = weekOutlook(schedule, now, 7);
  const anyHours = hasAnyHours(schedule);
  return (
    <div className={`${styles.card} ${styles.hoursOutlook}`}>
      <h3>{t("hours.preview.title")}</h3>
      <p className={styles.meta}>{t("hours.preview.lead")}</p>
      {anyHours ? (
        <>
          <OpenStatusChip schedule={schedule} initialNow={now.toISOString()} />
          <h4>{t("hours.preview.week")}</h4>
          <ol className={styles.outlookList}>
            {days.map((day, index) => (
              <li
                key={day.date}
                data-special={day.special ? "true" : undefined}
              >
                <span>
                  <strong>
                    {index === 0 ? `${t("hours.live.today")} · ` : ""}
                    <time dateTime={day.date}>
                      {dayLabel.format(new Date(`${day.date}T00:00:00Z`))}
                    </time>
                  </strong>
                </span>
                <span>
                  {day.opens && day.closes
                    ? `${day.opens}–${day.closes}`
                    : t("ops.hours.closed")}
                  {day.special ? (
                    <span className={styles.outlookSpecial}>
                      {t("hours.preview.special")}
                      {day.note ? (
                        <>
                          {": "}
                          <span lang={authoredTextLang}>{day.note}</span>
                        </>
                      ) : null}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <p className={styles.empty}>{t("hours.preview.none")}</p>
      )}
    </div>
  );
}
