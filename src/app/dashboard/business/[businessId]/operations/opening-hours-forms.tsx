"use client";

import { useActionState, useEffect, useRef } from "react";
import type { OwnerWeeklyDay } from "@/modules/businesses/opening-hours";
import {
  initialHoursFormState,
  weekdayLabels,
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
  if (state.status !== "error") return null;
  return (
    <p
      id={id}
      ref={alertRef}
      role="alert"
      tabIndex={-1}
      className={styles.formError}
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
  if (!message) return null;
  return (
    <p id={id} className={styles.fieldError}>
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
      aria-label="Weekly opening hours"
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
          <span>Day</span>
          <span>Closed</span>
          <span>Opens</span>
          <span>Closes</span>
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
                {weekdayLabels[day.day]}
              </strong>
              <label className={styles.hoursClosed}>
                <input
                  type="checkbox"
                  name={closedName}
                  aria-label={`${weekdayLabels[day.day]} closed`}
                  defaultChecked={closed}
                />
                <span aria-hidden="true" className={styles.hoursCaption}>
                  Closed
                </span>
              </label>
              <label className={styles.hoursTime}>
                <span className="sr-only">{weekdayLabels[day.day]} opens</span>
                <span aria-hidden="true" className={styles.hoursCaption}>
                  Opens
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
                <span className="sr-only">{weekdayLabels[day.day]} closes</span>
                <span aria-hidden="true" className={styles.hoursCaption}>
                  Closes
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
      <p className={styles.meta}>
        Times for a day ticked as closed are ignored. Changes go live straight
        away.
      </p>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save weekly hours"}
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
      aria-label="Add or change a special day"
    >
      <input type="hidden" name="businessId" value={businessId} />
      <h4>Add or change a special day</h4>
      <ErrorSummary id="special-day-error" state={state} alertRef={alertRef} />
      <div className={styles.field}>
        <label htmlFor="special-day-date">Date</label>
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
        Closed all day
      </label>
      <div className={styles.field}>
        <label htmlFor="special-day-opens">Opens</label>
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
        <label htmlFor="special-day-closes">Closes</label>
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
        <label htmlFor="special-day-note">Note (optional)</label>
        <input
          id="special-day-note"
          name="note"
          maxLength={120}
          placeholder="For example, Christmas Eve"
          defaultValue={value("note")}
          aria-invalid={error("note") ? true : undefined}
          aria-describedby={describe("note")}
        />
        <FieldError id="special-day-error-note" message={error("note")} />
      </div>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save special day"}
      </button>
    </form>
  );
}
