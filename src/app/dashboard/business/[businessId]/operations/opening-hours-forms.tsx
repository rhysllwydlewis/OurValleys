"use client";

import { useActionState, useEffect, useRef } from "react";
import { weekdayLabel } from "@/lib/i18n/business-copy";
import { useLocale } from "@/lib/i18n/client";
import type { OwnerWeeklyDay } from "@/modules/businesses/opening-hours";
import {
  initialHoursFormState,
  type HoursFormState,
} from "@/modules/businesses/opening-hours-form";
import { saveOpeningHoursAction, saveSpecialDayAction } from "./actions";
import styles from "./operations.module.css";

/** Moves focus to the error summary when a submission is refused. */
function useFocusOnRefusal(state: HoursFormState) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "error") ref.current?.focus();
  }, [state.attempt, state.status]);
  return ref;
}

function ErrorSummary({
  id,
  state,
  alertRef,
}: {
  id: string;
  state: HoursFormState;
  alertRef: React.RefObject<HTMLParagraphElement | null>;
}) {
  const { locale } = useLocale();
  if (state.status !== "error") return null;
  return (
    <p
      id={id}
      ref={alertRef}
      role="alert"
      tabIndex={-1}
      className={styles.formError}
      lang={locale === "cy" ? "en-GB" : undefined}
    >
      {state.summary}
    </p>
  );
}

function FieldError({
  id,
  message,
}: {
  id: string;
  message: string | undefined;
}) {
  const { locale } = useLocale();
  if (!message) return null;
  return (
    <p
      id={id}
      className={styles.fieldError}
      lang={locale === "cy" ? "en-GB" : undefined}
    >
      {message}
    </p>
  );
}

/**
 * The weekly schedule. A refused submission keeps everything that was typed
 * and points at the exact day and field to fix.
 */
export function WeeklyHoursForm({
  businessId,
  weekly,
}: {
  businessId: string;
  weekly: OwnerWeeklyDay[];
}) {
  const { t } = useLocale();
  const [state, formAction, pending] = useActionState(
    saveOpeningHoursAction,
    initialHoursFormState,
  );
  const alertRef = useFocusOnRefusal(state);
  const refused = state.status === "error";

  return (
    <form
      className={styles.form}
      action={formAction}
      aria-label={t("ops.hours.formAria")}
    >
      <input type="hidden" name="businessId" value={businessId} />
      <ErrorSummary id="weekly-hours-error" state={state} alertRef={alertRef} />
      <div
        // A new key per refusal re-creates the inputs with the typed values.
        key={state.attempt}
        className={styles.hoursTable}
        role="presentation"
      >
        <div className={styles.hoursHead} aria-hidden="true">
          <span>{t("ops.hours.colDay")}</span>
          <span>{t("ops.hours.colClosed")}</span>
          <span>{t("ops.hours.colOpens")}</span>
          <span>{t("ops.hours.colCloses")}</span>
        </div>
        {weekly.map((day) => {
          const closedName = `closed-${day.day}`;
          const opensName = `opens-${day.day}`;
          const closesName = `closes-${day.day}`;
          const closed = refused
            ? state.values[closedName] === "on"
            : day.closed;
          const opens = refused
            ? (state.values[opensName] ?? "")
            : (day.opensAt ?? "");
          const closes = refused
            ? (state.values[closesName] ?? "")
            : (day.closesAt ?? "");
          const opensError = state.fieldErrors[opensName];
          const closesError = state.fieldErrors[closesName];
          return (
            <div
              key={day.day}
              className={styles.hoursRow}
              role="group"
              aria-labelledby={`hours-day-${day.day}`}
            >
              <strong id={`hours-day-${day.day}`}>
                {weekdayLabel(t, day.day)}
              </strong>
              <label className={styles.hoursClosed}>
                <input
                  type="checkbox"
                  name={closedName}
                  aria-label={t("ops.hours.dayClosedAria", {
                    day: weekdayLabel(t, day.day),
                  })}
                  defaultChecked={closed}
                />
                <span aria-hidden="true" className={styles.hoursCaption}>
                  {t("ops.hours.colClosed")}
                </span>
              </label>
              <label className={styles.hoursTime}>
                <span className="sr-only">
                  {t("ops.hours.dayOpensAria", {
                    day: weekdayLabel(t, day.day),
                  })}
                </span>
                <span aria-hidden="true" className={styles.hoursCaption}>
                  {t("ops.hours.colOpens")}
                </span>
                <input
                  id={opensName}
                  name={opensName}
                  type="time"
                  defaultValue={opens}
                  aria-invalid={opensError ? true : undefined}
                  aria-describedby={
                    opensError ? `error-${opensName}` : undefined
                  }
                />
              </label>
              <label className={styles.hoursTime}>
                <span className="sr-only">
                  {t("ops.hours.dayClosesAria", {
                    day: weekdayLabel(t, day.day),
                  })}
                </span>
                <span aria-hidden="true" className={styles.hoursCaption}>
                  {t("ops.hours.colCloses")}
                </span>
                <input
                  id={closesName}
                  name={closesName}
                  type="time"
                  defaultValue={closes}
                  aria-invalid={closesError ? true : undefined}
                  aria-describedby={
                    closesError ? `error-${closesName}` : undefined
                  }
                />
              </label>
              <FieldError id={`error-${opensName}`} message={opensError} />
              <FieldError id={`error-${closesName}`} message={closesError} />
            </div>
          );
        })}
      </div>
      <p className={styles.meta}>{t("ops.hours.weeklyNote")}</p>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? t("ops.hours.saving") : t("ops.hours.saveWeekly")}
      </button>
    </form>
  );
}

/** One special day. Keeps what was typed and marks the fields to fix. */
export function SpecialDayForm({
  businessId,
  today,
}: {
  businessId: string;
  today: string;
}) {
  const { t } = useLocale();
  const [state, formAction, pending] = useActionState(
    saveSpecialDayAction,
    initialHoursFormState,
  );
  const alertRef = useFocusOnRefusal(state);
  const refused = state.status === "error";
  const value = (name: string) => (refused ? (state.values[name] ?? "") : "");
  const error = (name: string) => state.fieldErrors[name];
  const describe = (name: string) =>
    error(name) ? `special-day-error-${name}` : undefined;

  return (
    <form
      key={state.attempt}
      className={styles.form}
      action={formAction}
      aria-label={t("ops.hours.specialFormTitle")}
    >
      <input type="hidden" name="businessId" value={businessId} />
      <h4>{t("ops.hours.specialFormTitle")}</h4>
      <ErrorSummary id="special-day-error" state={state} alertRef={alertRef} />
      <div className={styles.field}>
        <label htmlFor="special-day-date">{t("ops.hours.date")}</label>
        <input
          id="special-day-date"
          name="date"
          type="date"
          min={today}
          required
          defaultValue={value("date")}
          aria-invalid={error("date") ? true : undefined}
          aria-describedby={describe("date")}
        />
        <FieldError id="special-day-error-date" message={error("date")} />
      </div>
      <label className={styles.check}>
        <input
          type="checkbox"
          name="closed"
          defaultChecked={value("closed") === "on"}
        />{" "}
        {t("ops.hours.closedAllDay")}
      </label>
      <div className={styles.field}>
        <label htmlFor="special-day-opens">{t("ops.hours.colOpens")}</label>
        <input
          id="special-day-opens"
          name="opens"
          type="time"
          defaultValue={value("opens")}
          aria-invalid={error("opens") ? true : undefined}
          aria-describedby={describe("opens")}
        />
        <FieldError id="special-day-error-opens" message={error("opens")} />
      </div>
      <div className={styles.field}>
        <label htmlFor="special-day-closes">{t("ops.hours.colCloses")}</label>
        <input
          id="special-day-closes"
          name="closes"
          type="time"
          defaultValue={value("closes")}
          aria-invalid={error("closes") ? true : undefined}
          aria-describedby={describe("closes")}
        />
        <FieldError id="special-day-error-closes" message={error("closes")} />
      </div>
      <div className={styles.field}>
        <label htmlFor="special-day-note">{t("ops.hours.note")}</label>
        <input
          id="special-day-note"
          name="note"
          maxLength={120}
          placeholder={t("ops.hours.notePlaceholder")}
          defaultValue={value("note")}
          aria-invalid={error("note") ? true : undefined}
          aria-describedby={describe("note")}
        />
        <FieldError id="special-day-error-note" message={error("note")} />
      </div>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? t("ops.hours.saving") : t("ops.hours.saveSpecial")}
      </button>
    </form>
  );
}
