import type { Route } from "next";
import Link from "next/link";
import type { BankHoliday } from "@/modules/businesses/bank-holidays";
import type { OwnerOpeningHours } from "@/modules/businesses/opening-hours";
import { authoredTextLang, weekdayLabel } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import { toPublicOpeningException } from "@/modules/businesses/opening-hours-exceptions";
import { removeSpecialDayAction, saveBankHolidayAction } from "./actions";
import { SpecialDayForm, WeeklyHoursForm } from "./opening-hours-forms";
import styles from "./operations.module.css";
import { englishLang } from "./sections/shared";

function hidden(name: string, value: string) {
  return <input type="hidden" name={name} value={value} />;
}

function describeSpecialDay(day: {
  date: string;
  closed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  note: string | null;
}) {
  return toPublicOpeningException({
    date: day.date,
    isClosed: day.closed,
    opensAt: day.opensAt,
    closesAt: day.closesAt,
    note: day.note,
  });
}

/**
 * Weekly opening hours and special days (bank holidays, closures, one-off
 * hours) for a published business. Edits are live: they change the canonical
 * record immediately, so "open now" and the public page stay accurate. Only
 * members who may edit the profile see the forms; everyone else sees the
 * current hours read-only.
 */
export async function OpeningHoursSection({
  businessId,
  canEdit,
  hours,
  today,
  suggestions,
}: {
  businessId: string;
  canEdit: boolean;
  hours: OwnerOpeningHours;
  today: string;
  suggestions: BankHoliday[];
}) {
  const { locale, t } = await getTranslator();
  // The public opening-hours wording and bank-holiday names are English only.
  const publicLang = englishLang(locale);
  return (
    <section
      className={styles.section}
      id="hours"
      aria-labelledby="hours-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.hours.eyebrow")}</p>
          <h2 id="hours-title">{t("ops.hours.title")}</h2>
        </div>
      </div>

      {hours.state === "unavailable" ? (
        <p className={styles.empty}>{t("ops.hours.unavailable")}</p>
      ) : !hours.hasLocation ? (
        <p className={styles.empty}>
          {t("ops.hours.noLocationBefore")}{" "}
          <Link href={`/dashboard/business/${businessId}` as Route}>
            {t("ops.hours.noLocationLink")}
          </Link>
          .
        </p>
      ) : (
        <div className={styles.grid}>
          <div className={`${styles.card} ${styles.hoursCard}`}>
            <h3>{t("ops.hours.weekly")}</h3>
            {canEdit ? (
              <WeeklyHoursForm businessId={businessId} weekly={hours.weekly} />
            ) : (
              <dl>
                {hours.weekly.map((day) => (
                  <div key={day.day}>
                    <dt>{weekdayLabel(t, day.day)}</dt>
                    <dd>
                      {day.closed
                        ? t("ops.hours.closed")
                        : `${day.opensAt}–${day.closesAt}`}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className={`${styles.card} ${styles.hoursCard}`}>
            <h3>{t("ops.hours.specialTitle")}</h3>
            <p className={styles.meta}>{t("ops.hours.specialMeta")}</p>
            {hours.specialDays.length > 0 ? (
              <ul className={styles.list}>
                {hours.specialDays.map((day) => {
                  const described = describeSpecialDay(day);
                  return (
                    <li key={day.date} className={styles.specialDay}>
                      <span lang={publicLang}>
                        <strong>
                          <time dateTime={day.date}>{described.label}</time>
                        </strong>
                        : {described.display}
                        {day.note ? (
                          <>
                            {" ("}
                            <span lang={authoredTextLang}>{day.note}</span>
                            {")"}
                          </>
                        ) : null}
                      </span>
                      {canEdit ? (
                        <form action={removeSpecialDayAction}>
                          {hidden("businessId", businessId)}
                          {hidden("date", day.date)}
                          <button
                            className={`button ${styles.danger}`}
                            type="submit"
                            aria-label={t("ops.hours.removeSpecialAria", {
                              label: described.label,
                            })}
                          >
                            {t("ops.common.remove")}
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.empty}>{t("ops.hours.noSpecial")}</p>
            )}

            {canEdit ? (
              <>
                <SpecialDayForm businessId={businessId} today={today} />

                {suggestions.length > 0 ? (
                  <div>
                    <h4>{t("ops.hours.upcomingHolidays")}</h4>
                    <p className={styles.meta}>{t("ops.hours.holidayHelp")}</p>
                    <ul className={styles.list}>
                      {suggestions.map((holiday) => {
                        const described = describeSpecialDay({
                          date: holiday.date,
                          closed: true,
                          opensAt: null,
                          closesAt: null,
                          note: null,
                        });
                        return (
                          <li key={holiday.date}>
                            <form action={saveBankHolidayAction}>
                              {hidden("businessId", businessId)}
                              {hidden("date", holiday.date)}
                              {hidden("closed", "on")}
                              {hidden("note", holiday.title)}
                              <button className="button" type="submit">
                                {t("ops.hours.closeOnPrefix")}{" "}
                                <span lang={publicLang}>
                                  {holiday.title} ({described.label})
                                </span>
                              </button>
                            </form>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
