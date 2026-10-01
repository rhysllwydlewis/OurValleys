import type { Route } from "next";
import Link from "next/link";
import type { BankHoliday } from "@/modules/businesses/bank-holidays";
import type { OwnerOpeningHours } from "@/modules/businesses/opening-hours";
import { weekdayLabels } from "@/modules/businesses/opening-hours-form";
import { toPublicOpeningException } from "@/modules/businesses/opening-hours-exceptions";
import { removeSpecialDayAction, saveBankHolidayAction } from "./actions";
import { SpecialDayForm, WeeklyHoursForm } from "./opening-hours-forms";
import styles from "./operations.module.css";

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
export function OpeningHoursSection({
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
  return (
    <section
      className={styles.section}
      id="hours"
      aria-labelledby="hours-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">Keep it accurate</p>
          <h2 id="hours-title">Opening hours</h2>
        </div>
      </div>

      {hours.state === "unavailable" ? (
        <p className={styles.empty}>
          Opening hours are temporarily unavailable. Nothing was changed.
        </p>
      ) : !hours.hasLocation ? (
        <p className={styles.empty}>
          Opening hours can be changed here once your business is published.
          Until then, set them in the opening hours step of your{" "}
          <Link href={`/dashboard/business/${businessId}` as Route}>
            business details
          </Link>
          .
        </p>
      ) : (
        <div className={styles.grid}>
          <div className={`${styles.card} ${styles.hoursCard}`}>
            <h3>Weekly hours</h3>
            {canEdit ? (
              <WeeklyHoursForm businessId={businessId} weekly={hours.weekly} />
            ) : (
              <dl>
                {hours.weekly.map((day) => (
                  <div key={day.day}>
                    <dt>{weekdayLabels[day.day]}</dt>
                    <dd>
                      {day.closed ? "Closed" : `${day.opensAt}–${day.closesAt}`}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className={`${styles.card} ${styles.hoursCard}`}>
            <h3>Bank holidays and special days</h3>
            <p className={styles.meta}>
              A special day replaces your weekly hours for that date. It shows
              on your page for the fortnight before.
            </p>
            {hours.specialDays.length > 0 ? (
              <ul className={styles.list}>
                {hours.specialDays.map((day) => {
                  const described = describeSpecialDay(day);
                  return (
                    <li key={day.date} className={styles.specialDay}>
                      <span>
                        <strong>
                          <time dateTime={day.date}>{described.label}</time>
                        </strong>
                        : {described.display}
                        {day.note ? ` (${day.note})` : ""}
                      </span>
                      {canEdit ? (
                        <form action={removeSpecialDayAction}>
                          {hidden("businessId", businessId)}
                          {hidden("date", day.date)}
                          <button
                            className={`button ${styles.danger}`}
                            type="submit"
                            aria-label={`Remove special day ${described.label}`}
                          >
                            Remove
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className={styles.empty}>No upcoming special days.</p>
            )}

            {canEdit ? (
              <>
                <SpecialDayForm businessId={businessId} today={today} />

                {suggestions.length > 0 ? (
                  <div>
                    <h4>Upcoming bank holidays</h4>
                    <p className={styles.meta}>
                      One click marks a bank holiday as closed. Nothing is
                      applied until you choose it.
                    </p>
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
                                Close on {holiday.title} ({described.label})
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
