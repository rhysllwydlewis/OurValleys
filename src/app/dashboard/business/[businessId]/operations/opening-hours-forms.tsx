"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FieldError as BaseFieldError } from "@/components/form-field-error";
import { fieldA11yProps, fieldErrorId } from "@/lib/form-field-a11y";
import { weekdayLabel } from "@/lib/i18n/business-copy";
import { useLocale } from "@/lib/i18n/client";
import type { OwnerWeeklyDay } from "@/modules/businesses/opening-hours";
import {
  initialHoursFormState,
  type HoursFormState,
} from "@/modules/businesses/opening-hours-form";
import {
  applyHoursPreset,
  type HoursPreset,
  type WeekEntries,
} from "@/modules/businesses/opening-hours-presets";
import { weekdayOrder } from "@/modules/businesses/opening-hours-form";
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
  return (
    <BaseFieldError id={id} message={message} className={styles.fieldError} />
  );
}

function readEntries(form: HTMLFormElement): WeekEntries {
  const field = (name: string) =>
    form.elements.namedItem(name) as HTMLInputElement | null;
  return Object.fromEntries(
    weekdayOrder.map((day) => [
      day,
      {
        closed: field(`closed-${day}`)?.checked ?? false,
        opens: field(`opens-${day}`)?.value ?? "",
        closes: field(`closes-${day}`)?.value ?? "",
        opens2: field(`opens2-${day}`)?.value ?? "",
        closes2: field(`closes2-${day}`)?.value ?? "",
      },
    ]),
  ) as WeekEntries;
}

function writeEntries(form: HTMLFormElement, entries: WeekEntries) {
  const field = (name: string) =>
    form.elements.namedItem(name) as HTMLInputElement | null;
  for (const day of weekdayOrder) {
    const closed = field(`closed-${day}`);
    const opens = field(`opens-${day}`);
    const closes = field(`closes-${day}`);
    if (closed) closed.checked = entries[day].closed;
    if (opens) opens.value = entries[day].opens;
    if (closes) closes.value = entries[day].closes;
    const opens2 = field(`opens2-${day}`);
    const closes2 = field(`closes2-${day}`);
    if (opens2) opens2.value = entries[day].opens2;
    if (closes2) closes2.value = entries[day].closes2;
    // Tell the row, which owns whether its second opening is on show.
    for (const input of [opens2, closes2]) {
      input?.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
}

/**
 * Quick fills for the form below. They only change what is on screen; the
 * owner still reviews and presses save, and the result is announced.
 */
function HoursPresets({
  formRef,
}: {
  formRef: React.RefObject<HTMLFormElement | null>;
}) {
  const { t } = useLocale();
  const [message, setMessage] = useState("");
  const [announcements, setAnnouncements] = useState(0);
  const presets: Array<{ preset: HoursPreset; label: string; done: string }> = [
    {
      preset: "monday-to-weekdays",
      label: t("hours.preset.weekdays"),
      done: t("hours.preset.weekdaysDone"),
    },
    {
      preset: "monday-to-all",
      label: t("hours.preset.all"),
      done: t("hours.preset.allDone"),
    },
    {
      preset: "close-weekend",
      label: t("hours.preset.weekend"),
      done: t("hours.preset.weekendDone"),
    },
  ];
  function run(preset: HoursPreset, done: string) {
    const form = formRef.current;
    if (!form) return;
    // A new key re-creates the live region so a repeated outcome is read again.
    setAnnouncements((count) => count + 1);
    const result = applyHoursPreset(preset, readEntries(form));
    if (!result.ok) {
      setMessage(t("hours.preset.mondayIncomplete"));
      return;
    }
    if (result.changed.length === 0) {
      setMessage(t("hours.preset.nothing"));
      return;
    }
    writeEntries(form, result.entries);
    setMessage(done);
  }
  return (
    <div className={styles.hoursPresets}>
      <p className={styles.meta} id="hours-presets-label">
        {t("hours.preset.label")}
      </p>
      <div role="group" aria-labelledby="hours-presets-label">
        {presets.map((item) => (
          <button
            key={item.preset}
            className="button"
            type="button"
            onClick={() => run(item.preset, item.done)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p
        key={announcements}
        className={styles.meta}
        role="status"
        aria-live="polite"
      >
        {message}
      </p>
    </div>
  );
}

/**
 * One weekday. The optional second opening (an evening session after a lunch
 * break) stays tucked behind a button until it is wanted, but its inputs are
 * always in the form so the quick fills can set them; hidden and empty, they
 * save as "no second opening".
 */
function HoursDayRow({
  day,
  refused,
  state,
}: {
  day: OwnerWeeklyDay;
  refused: boolean;
  state: HoursFormState;
}) {
  const { t } = useLocale();
  const closedName = `closed-${day.day}`;
  const opensName = `opens-${day.day}`;
  const closesName = `closes-${day.day}`;
  const opens2Name = `opens2-${day.day}`;
  const closes2Name = `closes2-${day.day}`;
  const closed = refused ? state.values[closedName] === "on" : day.closed;
  const opens = refused ? (state.values[opensName] ?? "") : (day.opensAt ?? "");
  const closes = refused
    ? (state.values[closesName] ?? "")
    : (day.closesAt ?? "");
  const opens2 = refused
    ? (state.values[opens2Name] ?? "")
    : (day.secondOpensAt ?? "");
  const closes2 = refused
    ? (state.values[closes2Name] ?? "")
    : (day.secondClosesAt ?? "");
  const opensError = state.fieldErrors[opensName];
  const closesError = state.fieldErrors[closesName];
  const opens2Error = state.fieldErrors[opens2Name];
  const closes2Error = state.fieldErrors[closes2Name];
  const dayName = weekdayLabel(t, day.day);
  const [showSecond, setShowSecond] = useState(Boolean(opens2 || closes2));
  const secondRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  function clearSecond() {
    for (const input of secondRef.current?.querySelectorAll("input") ?? []) {
      input.value = "";
    }
    setShowSecond(false);
    toggleRef.current?.focus();
  }

  return (
    <div
      className={styles.hoursRow}
      role="group"
      aria-labelledby={`hours-day-${day.day}`}
    >
      <strong id={`hours-day-${day.day}`}>{dayName}</strong>
      <label className={styles.hoursClosed}>
        <input
          type="checkbox"
          name={closedName}
          aria-label={t("ops.hours.dayClosedAria", { day: dayName })}
          defaultChecked={closed}
        />
        <span aria-hidden="true" className={styles.hoursCaption}>
          {t("ops.hours.colClosed")}
        </span>
      </label>
      <label className={styles.hoursTime}>
        <span className="sr-only">
          {t("ops.hours.dayOpensAria", { day: dayName })}
        </span>
        <span aria-hidden="true" className={styles.hoursCaption}>
          {t("ops.hours.colOpens")}
        </span>
        <input
          id={opensName}
          name={opensName}
          type="time"
          defaultValue={opens}
          {...fieldA11yProps(`error-${opensName}`, opensError)}
        />
      </label>
      <label className={styles.hoursTime}>
        <span className="sr-only">
          {t("ops.hours.dayClosesAria", { day: dayName })}
        </span>
        <span aria-hidden="true" className={styles.hoursCaption}>
          {t("ops.hours.colCloses")}
        </span>
        <input
          id={closesName}
          name={closesName}
          type="time"
          defaultValue={closes}
          {...fieldA11yProps(`error-${closesName}`, closesError)}
        />
      </label>
      <FieldError id={`error-${opensName}`} message={opensError} />
      <FieldError id={`error-${closesName}`} message={closesError} />
      <div
        ref={secondRef}
        className={styles.hoursSecond}
        hidden={!showSecond}
        role="group"
        aria-label={t("ops.hours.secondGroupAria", { day: dayName })}
        onInput={(event) => {
          if ((event.target as HTMLInputElement).value) setShowSecond(true);
        }}
      >
        <label className={styles.hoursTime}>
          <span className="sr-only">
            {t("ops.hours.secondOpensAria", { day: dayName })}
          </span>
          <span aria-hidden="true" className={styles.hoursCaption}>
            {t("ops.hours.colReopens")}
          </span>
          <input
            id={opens2Name}
            name={opens2Name}
            type="time"
            defaultValue={opens2}
            {...fieldA11yProps(`error-${opens2Name}`, opens2Error)}
          />
        </label>
        <label className={styles.hoursTime}>
          <span className="sr-only">
            {t("ops.hours.secondClosesAria", { day: dayName })}
          </span>
          <span aria-hidden="true" className={styles.hoursCaption}>
            {t("ops.hours.colClosesAgain")}
          </span>
          <input
            id={closes2Name}
            name={closes2Name}
            type="time"
            defaultValue={closes2}
            {...fieldA11yProps(`error-${closes2Name}`, closes2Error)}
          />
        </label>
        <button
          className={`button ${styles.hoursRemoveSecond}`}
          type="button"
          onClick={clearSecond}
          aria-label={t("ops.hours.removeSecondAria", { day: dayName })}
        >
          {t("ops.common.remove")}
        </button>
        <FieldError id={`error-${opens2Name}`} message={opens2Error} />
        <FieldError id={`error-${closes2Name}`} message={closes2Error} />
      </div>
      {showSecond ? null : (
        <button
          ref={toggleRef}
          className={`button ${styles.hoursAddSecond}`}
          type="button"
          onClick={() => setShowSecond(true)}
          aria-label={t("ops.hours.addSecondAria", { day: dayName })}
        >
          {t("ops.hours.addSecond")}
        </button>
      )}
    </div>
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
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className={styles.form}
      action={formAction}
      aria-label={t("ops.hours.formAria")}
    >
      <input type="hidden" name="businessId" value={businessId} />
      <ErrorSummary id="weekly-hours-error" state={state} alertRef={alertRef} />
      <HoursPresets formRef={formRef} />
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
        {weekly.map((day) => (
          <HoursDayRow
            key={day.day}
            day={day}
            refused={refused}
            state={state}
          />
        ))}
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
          {...fieldA11yProps(
            fieldErrorId("special-day", "date"),
            error("date"),
          )}
        />
        <FieldError
          id={fieldErrorId("special-day", "date")}
          message={error("date")}
        />
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
          {...fieldA11yProps(
            fieldErrorId("special-day", "opens"),
            error("opens"),
          )}
        />
        <FieldError
          id={fieldErrorId("special-day", "opens")}
          message={error("opens")}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="special-day-closes">{t("ops.hours.colCloses")}</label>
        <input
          id="special-day-closes"
          name="closes"
          type="time"
          defaultValue={value("closes")}
          {...fieldA11yProps(
            fieldErrorId("special-day", "closes"),
            error("closes"),
          )}
        />
        <FieldError
          id={fieldErrorId("special-day", "closes")}
          message={error("closes")}
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="special-day-note">{t("ops.hours.note")}</label>
        <input
          id="special-day-note"
          name="note"
          maxLength={120}
          placeholder={t("ops.hours.notePlaceholder")}
          defaultValue={value("note")}
          {...fieldA11yProps(
            fieldErrorId("special-day", "note"),
            error("note"),
          )}
        />
        <FieldError
          id={fieldErrorId("special-day", "note")}
          message={error("note")}
        />
      </div>
      <button className="button primary" type="submit" disabled={pending}>
        {pending ? t("ops.hours.saving") : t("ops.hours.saveSpecial")}
      </button>
    </form>
  );
}
