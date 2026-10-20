"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import {
  eventLimits,
  initialEventFormState,
  parseLondonInput,
  readEventValues,
  type EventFieldName,
  type EventFormState,
  type EventFormValues,
} from "@/modules/businesses/event-studio-model";
import { MAX_EVENT_OCCURRENCES } from "@/modules/events/recurrence";
import { saveEventStudioAction } from "./actions";
import styles from "./events.module.css";

type StatusChoice = "draft" | "active" | "hidden" | "cancelled";

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  const { t } = useLocale();
  return (
    <button
      className="button primary"
      type="submit"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? t("evstudio.form.saving") : label}
    </button>
  );
}

/** A typed UK date for the preview card, or null when blank or not real. */
function previewDate(raw: string, htmlLang: string): string | null {
  const parsed = parseLondonInput(raw);
  if (!(parsed instanceof Date)) return null;
  return new Intl.DateTimeFormat(htmlLang, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(parsed);
}

/**
 * The create and edit form for one event, with a live sketch of the public
 * event card beside it. The server re-validates every field and returns error
 * codes; this component only translates them and keeps what was typed.
 */
export function EventEditor({
  businessId,
  eventId,
  expectedUpdatedAt,
  initial,
  imageUrl,
  imageAlt,
  canEdit,
  idPrefix,
  picture,
  submitLabel,
  statusOptions,
  allowRepeat,
  seriesDates,
}: {
  businessId: string;
  eventId?: string;
  expectedUpdatedAt?: number;
  initial: EventFormValues;
  imageUrl: string | null;
  imageAlt: string;
  canEdit: boolean;
  idPrefix: string;
  /** The server-rendered picture controls, placed inside the form. */
  picture: ReactNode;
  submitLabel: string;
  /** Which visibility choices to offer. */
  statusOptions: StatusChoice[];
  /** A new event may repeat; an existing date may not. */
  allowRepeat?: boolean;
  /** Other upcoming dates of this event's series, for the apply-to-all choice. */
  seriesDates?: number;
}) {
  const { t, locale } = useLocale();
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;
  const lang = authoredTextLang || undefined;
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(
    saveEventStudioAction,
    initialEventFormState,
  );
  const refused = state.status === "error";
  const start: EventFormValues = refused
    ? { ...initial, ...state.values }
    : initial;
  const [live, setLive] = useState<EventFormValues>(start);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "error") summaryRef.current?.focus();
  }, [state.attempt, state.status]);

  const errorFor = (field: EventFieldName) => state.errors[field];
  const message = (code: string | undefined) =>
    code ? t(`evstudio.err.${code}` as MessageKey) : undefined;
  const describedBy = (field: EventFieldName, hint: boolean) =>
    [
      errorFor(field) ? `${idPrefix}-${field}-err` : null,
      hint ? `${idPrefix}-${field}-hint` : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const hasErrors = Object.keys(state.errors).length > 0;
  const startText = previewDate(live.startsAt, htmlLang);
  const endText = previewDate(live.endsAt, htmlLang);
  const repeating =
    allowRepeat && live.repeatFrequency && live.repeatFrequency !== "never";

  return (
    <div className={styles.editorGrid}>
      <form
        className={styles.form}
        action={formAction}
        onChange={(event) =>
          setLive(
            readEventValues((name) =>
              new FormData(event.currentTarget).get(name),
            ),
          )
        }
        onSubmit={(event) => {
          // Submit from here so React does not reset the form afterwards:
          // everything typed, including a chosen picture, stays after a refusal.
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          startTransition(() => formAction(data));
        }}
        noValidate
      >
        <input type="hidden" name="businessId" value={businessId} />
        {eventId ? (
          <>
            <input type="hidden" name="eventId" value={eventId} />
            <input
              type="hidden"
              name="expectedUpdatedAt"
              value={expectedUpdatedAt ?? 0}
            />
          </>
        ) : null}

        {refused && (state.formError || hasErrors) ? (
          <p
            ref={summaryRef}
            role="alert"
            tabIndex={-1}
            className={styles.formError}
          >
            {state.formError
              ? t(`evstudio.formError.${state.formError}` as MessageKey)
              : t("evstudio.form.errorsIntro")}
            {!state.formError ? (
              <span className={styles.errorList}>
                {(Object.keys(state.errors) as EventFieldName[]).map(
                  (field) => (
                    <a key={field} href={`#${idPrefix}-${field}`}>
                      {message(state.errors[field])}
                    </a>
                  ),
                )}
              </span>
            ) : null}
          </p>
        ) : null}

        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-title`}>
            {t("evstudio.form.title")}
          </label>
          <input
            id={`${idPrefix}-title`}
            name="title"
            defaultValue={start.title}
            maxLength={eventLimits.titleMax + 40}
            required
            disabled={!canEdit}
            aria-invalid={errorFor("title") ? true : undefined}
            aria-describedby={describedBy("title", true)}
            autoComplete="off"
          />
          <p id={`${idPrefix}-title-hint`} className={styles.hint}>
            {t("evstudio.form.titleHint")}
          </p>
          {errorFor("title") ? (
            <p id={`${idPrefix}-title-err`} className={styles.fieldError}>
              {message(errorFor("title"))}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-description`}>
            {t("evstudio.form.description")}
          </label>
          <textarea
            id={`${idPrefix}-description`}
            name="description"
            rows={5}
            defaultValue={start.description}
            required
            disabled={!canEdit}
            aria-invalid={errorFor("description") ? true : undefined}
            aria-describedby={describedBy("description", true)}
          />
          <p id={`${idPrefix}-description-hint`} className={styles.hint}>
            {t("evstudio.form.descriptionHint")}{" "}
            <span aria-hidden="true">
              {live.description.trim().length}/{eventLimits.descriptionMax}
            </span>
          </p>
          {errorFor("description") ? (
            <p id={`${idPrefix}-description-err`} className={styles.fieldError}>
              {message(errorFor("description"))}
            </p>
          ) : null}
        </div>

        <div className={styles.twoUp}>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-startsAt`}>
              {t("evstudio.form.starts")}
            </label>
            <input
              id={`${idPrefix}-startsAt`}
              name="startsAt"
              type="datetime-local"
              defaultValue={start.startsAt}
              required
              disabled={!canEdit}
              aria-invalid={errorFor("startsAt") ? true : undefined}
              aria-describedby={describedBy("startsAt", false)}
            />
            {errorFor("startsAt") ? (
              <p id={`${idPrefix}-startsAt-err`} className={styles.fieldError}>
                {message(errorFor("startsAt"))}
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-endsAt`}>
              {t("evstudio.form.ends")}
            </label>
            <input
              id={`${idPrefix}-endsAt`}
              name="endsAt"
              type="datetime-local"
              defaultValue={start.endsAt}
              disabled={!canEdit}
              aria-invalid={errorFor("endsAt") ? true : undefined}
              aria-describedby={describedBy("endsAt", false)}
            />
            {errorFor("endsAt") ? (
              <p id={`${idPrefix}-endsAt-err`} className={styles.fieldError}>
                {message(errorFor("endsAt"))}
              </p>
            ) : null}
          </div>
        </div>
        <p className={styles.hint}>
          {t("evstudio.form.datesHint")} {t("evstudio.times")}
        </p>

        {allowRepeat ? (
          <fieldset className={styles.fieldset}>
            <legend>{t("evstudio.form.repeatLegend")}</legend>
            <div className={styles.twoUp}>
              <div className={styles.field}>
                <label htmlFor={`${idPrefix}-repeatFrequency`}>
                  {t("evstudio.form.repeats")}
                </label>
                <select
                  id={`${idPrefix}-repeatFrequency`}
                  name="repeatFrequency"
                  defaultValue={start.repeatFrequency || "never"}
                  disabled={!canEdit}
                >
                  <option value="never">{t("evstudio.form.never")}</option>
                  <option value="weekly">{t("evstudio.form.weekly")}</option>
                  <option value="fortnightly">
                    {t("evstudio.form.fortnightly")}
                  </option>
                  <option value="monthly">{t("evstudio.form.monthly")}</option>
                </select>
              </div>
              <div className={styles.field}>
                <label htmlFor={`${idPrefix}-repeatOccurrences`}>
                  {t("evstudio.form.occurrences")}
                </label>
                <input
                  id={`${idPrefix}-repeatOccurrences`}
                  name="repeatOccurrences"
                  type="number"
                  min={2}
                  max={MAX_EVENT_OCCURRENCES}
                  defaultValue={start.repeatOccurrences || "4"}
                  disabled={!canEdit || !repeating}
                  aria-invalid={
                    errorFor("repeatOccurrences") ? true : undefined
                  }
                  aria-describedby={describedBy("repeatOccurrences", true)}
                />
                <p
                  id={`${idPrefix}-repeatOccurrences-hint`}
                  className={styles.hint}
                >
                  {t("evstudio.form.repeatHint", {
                    max: MAX_EVENT_OCCURRENCES,
                  })}
                </p>
                {errorFor("repeatOccurrences") ? (
                  <p
                    id={`${idPrefix}-repeatOccurrences-err`}
                    className={styles.fieldError}
                  >
                    {message(errorFor("repeatOccurrences"))}
                  </p>
                ) : null}
              </div>
            </div>
          </fieldset>
        ) : null}

        <div className={styles.twoUp}>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-locationDisplay`}>
              {t("evstudio.form.location")}
            </label>
            <input
              id={`${idPrefix}-locationDisplay`}
              name="locationDisplay"
              defaultValue={start.locationDisplay}
              disabled={!canEdit}
              aria-invalid={errorFor("locationDisplay") ? true : undefined}
              aria-describedby={describedBy("locationDisplay", true)}
              autoComplete="off"
            />
            <p id={`${idPrefix}-locationDisplay-hint`} className={styles.hint}>
              {t("evstudio.form.locationHint")}
            </p>
            {errorFor("locationDisplay") ? (
              <p
                id={`${idPrefix}-locationDisplay-err`}
                className={styles.fieldError}
              >
                {message(errorFor("locationDisplay"))}
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-bookingUrl`}>
              {t("evstudio.form.url")}
            </label>
            <input
              id={`${idPrefix}-bookingUrl`}
              name="bookingUrl"
              type="url"
              inputMode="url"
              defaultValue={start.bookingUrl}
              disabled={!canEdit}
              aria-invalid={errorFor("bookingUrl") ? true : undefined}
              aria-describedby={describedBy("bookingUrl", true)}
              autoComplete="off"
            />
            <p id={`${idPrefix}-bookingUrl-hint`} className={styles.hint}>
              {t("evstudio.form.urlHint")}
            </p>
            {errorFor("bookingUrl") ? (
              <p
                id={`${idPrefix}-bookingUrl-err`}
                className={styles.fieldError}
              >
                {message(errorFor("bookingUrl"))}
              </p>
            ) : null}
          </div>
        </div>

        {picture}

        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-status`}>
            {t("evstudio.form.status")}
          </label>
          <select
            id={`${idPrefix}-status`}
            name="status"
            defaultValue={
              statusOptions.includes(start.status as StatusChoice)
                ? start.status
                : statusOptions[0]
            }
            disabled={!canEdit}
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {t(`evstudio.form.status.${status}` as MessageKey)}
              </option>
            ))}
          </select>
        </div>

        {seriesDates && seriesDates > 0 ? (
          <div className={styles.checkRow}>
            <input
              id={`${idPrefix}-applyToSeries`}
              type="checkbox"
              name="applyToSeries"
              defaultChecked={start.applyToSeries === "on"}
              disabled={!canEdit}
              aria-describedby={`${idPrefix}-applyToSeries-hint`}
            />
            <div>
              <label htmlFor={`${idPrefix}-applyToSeries`}>
                {t("evstudio.form.applyToSeries", { count: seriesDates })}
              </label>
              <p id={`${idPrefix}-applyToSeries-hint`} className={styles.hint}>
                {t("evstudio.form.applyToSeriesHint")}
              </p>
            </div>
          </div>
        ) : null}

        {canEdit ? (
          <div className={styles.saveRow}>
            <SubmitButton label={submitLabel} pending={pending} />
          </div>
        ) : (
          <p className={styles.hint}>{t("evstudio.form.readOnly")}</p>
        )}
      </form>

      <aside
        className={styles.previewColumn}
        aria-label={t("evstudio.preview.title")}
      >
        <h3 className={styles.previewHeading}>{t("evstudio.preview.title")}</h3>
        <article className={styles.previewCard}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.previewImage}
              src={imageUrl}
              alt={imageAlt}
            />
          ) : null}
          <div className={styles.previewBody}>
            <p className={styles.previewMeta}>
              {startText ?? (
                <span className={styles.placeholder}>
                  {t("evstudio.preview.placeholderDate")}
                </span>
              )}
              {startText && endText ? (
                <> {t("evstudio.preview.until", { date: endText })}</>
              ) : null}
            </p>
            <h4 lang={lang}>
              {live.title.trim() || (
                <span className={styles.placeholder}>
                  {t("evstudio.preview.placeholderTitle")}
                </span>
              )}
            </h4>
            {live.locationDisplay.trim() ? (
              <p className={styles.previewMeta} lang={lang}>
                {live.locationDisplay.trim()}
              </p>
            ) : null}
            <p className={styles.previewText} lang={lang}>
              {live.description.trim() || (
                <span className={styles.placeholder}>
                  {t("evstudio.preview.placeholderBody")}
                </span>
              )}
            </p>
            {repeating ? (
              <p className={styles.previewMeta}>
                {t("evstudio.preview.repeats", {
                  count: Number(live.repeatOccurrences) || 0,
                })}
              </p>
            ) : null}
            {live.bookingUrl.trim() ? (
              <span className={styles.previewButton}>
                {t("evstudio.preview.button")}
              </span>
            ) : null}
          </div>
        </article>
        <p className={styles.hint}>{t("evstudio.preview.note")}</p>
      </aside>
    </div>
  );
}
