import { getTranslator } from "@/lib/i18n/server";
import { LiveOutlook, OpenStatusChip } from "@/components/live-opening-hours";
import {
  hasAnyHours,
  type OpeningSchedule,
} from "@/modules/businesses/opening-status";
import styles from "./operations.module.css";

/**
 * What a visitor would read on the business page right now, and what the next
 * seven days look like once special days are applied. Gives owners a way to
 * check bank holidays and one-off changes without opening the public page.
 * While the business is paused or closed the public page shows a notice
 * instead of a status, so the preview says that rather than "Open now".
 */
export async function HoursOutlook({
  schedule,
  active,
}: {
  schedule: OpeningSchedule;
  /** False while the business is paused, closed or awaiting deletion. */
  active: boolean;
}) {
  const { t } = await getTranslator();
  const initialNow = new Date().toISOString();
  return (
    <div className={`${styles.card} ${styles.hoursOutlook}`}>
      <h3>{t("hours.preview.title")}</h3>
      <p className={styles.meta}>{t("hours.preview.lead")}</p>
      {hasAnyHours(schedule) ? (
        <>
          {active ? (
            <OpenStatusChip schedule={schedule} initialNow={initialNow} />
          ) : (
            <p className={styles.meta}>{t("hours.preview.notActive")}</p>
          )}
          <h4>{t("hours.preview.week")}</h4>
          <LiveOutlook
            className={styles.outlookList}
            schedule={schedule}
            initialNow={initialNow}
            specialLabel={t("hours.preview.special")}
            todayLabel={t("hours.live.today")}
            closedLabel={t("ops.hours.closed")}
          />
        </>
      ) : (
        <p className={styles.empty}>{t("hours.preview.none")}</p>
      )}
    </div>
  );
}
