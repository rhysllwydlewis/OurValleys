"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import {
  initialOfferFormState,
  offerLimits,
  parseLondonInput,
  readOfferValues,
  type OfferFieldName,
  type OfferFormState,
  type OfferFormValues,
} from "@/modules/businesses/offer-studio-model";
import { saveOfferStudioAction } from "./actions";
import styles from "./offers.module.css";

function SubmitButton({
  label,
  disabled,
}: {
  label: string;
  disabled: boolean;
}) {
  const { pending } = useFormStatus();
  const { t } = useLocale();
  return (
    <button
      className="button primary"
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? t("ostudio.form.saving") : label}
    </button>
  );
}

/** A typed UK date for the preview card, or null when blank or not real. */
function previewDate(raw: string, htmlLang: string): string | null {
  const parsed = parseLondonInput(raw);
  if (!(parsed instanceof Date)) return null;
  return new Intl.DateTimeFormat(htmlLang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(parsed);
}

/**
 * The create and edit form for one offer, with a live sketch of the public
 * card beside it. The server re-validates every field and returns error
 * codes; this component only translates them and keeps what was typed.
 */
export function OfferEditor({
  businessId,
  offerId,
  expectedUpdatedAt,
  initial,
  imageUrl,
  imageAlt,
  canEdit,
  idPrefix,
  picture,
  submitLabel,
  defaultStatusOptions,
}: {
  businessId: string;
  offerId?: string;
  expectedUpdatedAt?: number;
  initial: OfferFormValues;
  imageUrl: string | null;
  imageAlt: string;
  canEdit: boolean;
  idPrefix: string;
  /** The server-rendered picture controls, placed inside the form. */
  picture: ReactNode;
  submitLabel: string;
  /** Which visibility choices to offer. */
  defaultStatusOptions: ("draft" | "active" | "hidden")[];
}) {
  const { t, locale } = useLocale();
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;
  const [state, formAction] = useActionState<OfferFormState, FormData>(
    saveOfferStudioAction,
    initialOfferFormState,
  );
  const refused = state.status === "error";
  const start: OfferFormValues = refused
    ? { ...initial, ...state.values }
    : initial;
  const [live, setLive] = useState<OfferFormValues>(start);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  const chosePicture = useRef(false);
  const [lostPicture, setLostPicture] = useState(false);
  useEffect(() => {
    if (state.status === "error") {
      summaryRef.current?.focus();
      // A refused save rebuilds the form, and a browser cannot refill a file
      // input, so say so rather than silently dropping the chosen picture.
      setLostPicture(chosePicture.current);
    }
  }, [state.attempt, state.status]);

  const errorFor = (field: OfferFieldName) => state.errors[field];
  const message = (code: string | undefined) =>
    code ? t(`ostudio.err.${code}` as MessageKey) : undefined;
  const describedBy = (field: OfferFieldName, hint: boolean) =>
    [
      errorFor(field) ? `${idPrefix}-${field}-err` : null,
      hint ? `${idPrefix}-${field}-hint` : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const hasErrors = Object.keys(state.errors).length > 0;
  const endText = previewDate(live.endsAt, htmlLang);
  const startText = previewDate(live.startsAt, htmlLang);

  return (
    <div className={styles.editorGrid}>
      <form
        // A new key per refusal re-creates the inputs with what was typed.
        key={state.attempt}
        className={styles.form}
        action={formAction}
        onChange={(event) =>
          setLive(
            readOfferValues((name) =>
              new FormData(event.currentTarget).get(name),
            ),
          )
        }
        onSubmit={(event) => {
          const file = new FormData(event.currentTarget).get("image");
          chosePicture.current = file instanceof File && file.size > 0;
        }}
        noValidate
      >
        <input type="hidden" name="businessId" value={businessId} />
        {offerId ? (
          <>
            <input type="hidden" name="offerId" value={offerId} />
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
              ? t(`ostudio.formError.${state.formError}` as MessageKey)
              : t("ostudio.form.errorsIntro")}
          </p>
        ) : null}

        {refused && lostPicture ? (
          <p className={styles.hint} role="status">
            {t("ostudio.form.pictureAgain")}
          </p>
        ) : null}

        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-title`}>{t("ostudio.form.title")}</label>
          <input
            id={`${idPrefix}-title`}
            name="title"
            defaultValue={start.title}
            maxLength={offerLimits.titleMax + 40}
            required
            disabled={!canEdit}
            aria-invalid={errorFor("title") ? true : undefined}
            aria-describedby={describedBy("title", true)}
            autoComplete="off"
          />
          <p id={`${idPrefix}-title-hint`} className={styles.hint}>
            {t("ostudio.form.titleHint")}
          </p>
          {errorFor("title") ? (
            <p id={`${idPrefix}-title-err`} className={styles.fieldError}>
              {message(errorFor("title"))}
            </p>
          ) : null}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-description`}>
            {t("ostudio.form.description")}
          </label>
          <textarea
            id={`${idPrefix}-description`}
            name="description"
            rows={4}
            defaultValue={start.description}
            required
            disabled={!canEdit}
            aria-invalid={errorFor("description") ? true : undefined}
            aria-describedby={describedBy("description", true)}
          />
          <p id={`${idPrefix}-description-hint`} className={styles.hint}>
            {t("ostudio.form.descriptionHint")}{" "}
            <span aria-hidden="true">
              {live.description.trim().length}/{offerLimits.descriptionMax}
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
              {t("ostudio.form.starts")}
            </label>
            <input
              id={`${idPrefix}-startsAt`}
              name="startsAt"
              type="datetime-local"
              defaultValue={start.startsAt}
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
              {t("ostudio.form.ends")}
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
          {t("ostudio.form.datesHint")} {t("ostudio.times")}
        </p>

        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-terms`}>{t("ostudio.form.terms")}</label>
          <textarea
            id={`${idPrefix}-terms`}
            name="terms"
            rows={3}
            defaultValue={start.terms}
            disabled={!canEdit}
            aria-invalid={errorFor("terms") ? true : undefined}
            aria-describedby={describedBy("terms", true)}
          />
          <p id={`${idPrefix}-terms-hint`} className={styles.hint}>
            {t("ostudio.form.termsHint")}
          </p>
          {errorFor("terms") ? (
            <p id={`${idPrefix}-terms-err`} className={styles.fieldError}>
              {message(errorFor("terms"))}
            </p>
          ) : null}
        </div>

        <div className={styles.twoUp}>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-actionUrl`}>
              {t("ostudio.form.url")}
            </label>
            <input
              id={`${idPrefix}-actionUrl`}
              name="actionUrl"
              type="url"
              inputMode="url"
              defaultValue={start.actionUrl}
              disabled={!canEdit}
              aria-invalid={errorFor("actionUrl") ? true : undefined}
              aria-describedby={describedBy("actionUrl", true)}
              autoComplete="off"
            />
            <p id={`${idPrefix}-actionUrl-hint`} className={styles.hint}>
              {t("ostudio.form.urlHint")}
            </p>
            {errorFor("actionUrl") ? (
              <p id={`${idPrefix}-actionUrl-err`} className={styles.fieldError}>
                {message(errorFor("actionUrl"))}
              </p>
            ) : null}
          </div>
          <div className={styles.field}>
            <label htmlFor={`${idPrefix}-actionLabel`}>
              {t("ostudio.form.label")}
            </label>
            <input
              id={`${idPrefix}-actionLabel`}
              name="actionLabel"
              defaultValue={start.actionLabel}
              disabled={!canEdit}
              aria-invalid={errorFor("actionLabel") ? true : undefined}
              aria-describedby={describedBy("actionLabel", true)}
              autoComplete="off"
            />
            <p id={`${idPrefix}-actionLabel-hint`} className={styles.hint}>
              {t("ostudio.form.labelHint")}
            </p>
            {errorFor("actionLabel") ? (
              <p
                id={`${idPrefix}-actionLabel-err`}
                className={styles.fieldError}
              >
                {message(errorFor("actionLabel"))}
              </p>
            ) : null}
          </div>
        </div>

        {picture}

        <div className={styles.field}>
          <label htmlFor={`${idPrefix}-status`}>
            {t("ostudio.form.status")}
          </label>
          <select
            id={`${idPrefix}-status`}
            name="status"
            defaultValue={
              defaultStatusOptions.includes(start.status as "draft")
                ? start.status
                : defaultStatusOptions[0]
            }
            disabled={!canEdit}
          >
            {defaultStatusOptions.map((status) => (
              <option key={status} value={status}>
                {t(`ostudio.form.status.${status}` as MessageKey)}
              </option>
            ))}
          </select>
        </div>

        {canEdit ? (
          <div className={styles.saveRow}>
            <SubmitButton label={submitLabel} disabled={false} />
          </div>
        ) : (
          <p className={styles.hint}>{t("ostudio.form.readOnly")}</p>
        )}
      </form>

      <aside
        className={styles.previewColumn}
        aria-label={t("ostudio.preview.title")}
      >
        <h3 className={styles.previewHeading}>{t("ostudio.preview.title")}</h3>
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
            <h4>
              {live.title.trim() || (
                <span className={styles.placeholder}>
                  {t("ostudio.preview.placeholderTitle")}
                </span>
              )}
            </h4>
            <p className={styles.previewText}>
              {live.description.trim() || (
                <span className={styles.placeholder}>
                  {t("ostudio.preview.placeholderBody")}
                </span>
              )}
            </p>
            {endText ? (
              <p className={styles.previewMeta}>
                {t("ostudio.preview.ends", { date: endText })}
              </p>
            ) : null}
            {!endText && startText ? (
              <p className={styles.previewMeta}>
                {t("ostudio.preview.starts", { date: startText })}
              </p>
            ) : null}
            {live.terms.trim() ? (
              <p className={styles.previewMeta}>
                {t("ostudio.preview.terms")}
                <span aria-hidden="true"> ▾</span>
              </p>
            ) : null}
            {live.actionUrl.trim() ? (
              <span className={styles.previewButton}>
                {live.actionLabel.trim() || t("ostudio.preview.button")}
              </span>
            ) : null}
          </div>
        </article>
        <p className={styles.hint}>{t("ostudio.preview.note")}</p>
      </aside>
    </div>
  );
}
