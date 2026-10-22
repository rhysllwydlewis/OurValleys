"use client";

import { useActionState, useEffect, useRef } from "react";
import { FieldError } from "@/components/form-field-error";
import { fieldA11yProps, fieldErrorId } from "@/lib/form-field-a11y";
import { useLocale } from "@/lib/i18n/client";
import { initialHoursFormState } from "@/modules/businesses/opening-hours-form";
import { requestSlugChangeAction } from "../actions";
import styles from "../operations.module.css";

/**
 * Page-address change request. A refused request keeps what was typed and
 * links each message to its input.
 */
export function SlugChangeForm({
  businessId,
  resubmit,
}: {
  businessId: string;
  resubmit: boolean;
}) {
  const { t, locale } = useLocale();
  const [state, formAction] = useActionState(
    requestSlugChangeAction,
    initialHoursFormState,
  );
  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "error") alertRef.current?.focus();
  }, [state.attempt, state.status]);

  const prefix = "address";
  const refused = state.status === "error";
  const value = (name: string) => (refused ? (state.values[name] ?? "") : "");
  const control = (name: string, ...extra: string[]) => {
    const props = fieldA11yProps(
      fieldErrorId(prefix, name),
      state.fieldErrors[name],
    );
    const described = [props["aria-describedby"], ...extra].filter(Boolean);
    return {
      ...props,
      "aria-describedby": described.length ? described.join(" ") : undefined,
    };
  };
  const error = (name: string) => (
    <FieldError
      id={fieldErrorId(prefix, name)}
      message={state.fieldErrors[name]}
      className={styles.fieldError}
    />
  );

  return (
    <form
      key={state.attempt}
      className={styles.card}
      action={formAction}
      aria-describedby={refused ? `${prefix}-alert` : undefined}
    >
      <input type="hidden" name="businessId" value={businessId} />
      {refused ? (
        <p
          id={`${prefix}-alert`}
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className={styles.formError}
          lang={locale === "cy" ? "en-GB" : undefined}
        >
          {state.summary}
        </p>
      ) : null}
      <div className={styles.field}>
        <label htmlFor="address-new">{t("ops.address.newLabel")}</label>
        <input
          id="address-new"
          name="proposedName"
          required
          minLength={3}
          maxLength={120}
          defaultValue={value("proposedName")}
          {...control("proposedName", "address-new-help")}
        />
        <p className={styles.meta} id="address-new-help">
          {t("ops.address.newHelp")}
        </p>
        {error("proposedName")}
      </div>
      <div className={styles.field}>
        <label htmlFor="address-reason">{t("ops.address.reasonLabel")}</label>
        <textarea
          id="address-reason"
          name="reason"
          required
          minLength={10}
          maxLength={500}
          rows={3}
          defaultValue={value("reason")}
          {...control("reason")}
        />
        {error("reason")}
      </div>
      <button className="button primary" type="submit">
        {resubmit ? t("ops.address.resubmit") : t("ops.address.submit")}
      </button>
    </form>
  );
}
