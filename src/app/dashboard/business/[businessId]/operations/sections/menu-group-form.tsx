"use client";

import { useActionState, useEffect, useRef } from "react";
import { FieldError } from "@/components/form-field-error";
import { fieldA11yProps, fieldErrorId } from "@/lib/form-field-a11y";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { useLocale } from "@/lib/i18n/client";
import { initialHoursFormState } from "@/modules/businesses/opening-hours-form";
import { addMenuGroupAction } from "../actions";
import styles from "../operations.module.css";
import builder from "./menu-builder.module.css";

/**
 * Add a menu group. A refused group keeps what was typed and links each
 * message to its input.
 */
export function MenuGroupForm({
  businessId,
  sortOrder,
  atLimit,
}: {
  businessId: string;
  sortOrder: number;
  atLimit: boolean;
}) {
  const { t, locale } = useLocale();
  const [state, formAction] = useActionState(
    addMenuGroupAction,
    initialHoursFormState,
  );
  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "error") alertRef.current?.focus();
  }, [state.attempt, state.status]);

  const prefix = "menu-group";
  const refused = state.status === "error";
  const value = (name: string) => (refused ? (state.values[name] ?? "") : "");
  const control = (name: string) =>
    fieldA11yProps(fieldErrorId(prefix, name), state.fieldErrors[name]);
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
      <h3>{t("menub.addGroupTitle")}</h3>
      <p className={builder.hint}>
        {t("menub.addGroupHint")} {t("menub.limitsNote")}
      </p>
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
        <label htmlFor="menu-group-name">{t("menub.groupName")}</label>
        <input
          id="menu-group-name"
          name="name"
          required
          minLength={2}
          maxLength={100}
          lang={authoredTextLang}
          defaultValue={value("name")}
          {...control("name")}
        />
        {error("name")}
      </div>
      <div className={styles.field}>
        <label htmlFor="menu-group-description">
          {t("menub.groupDescription")}
        </label>
        <textarea
          id="menu-group-description"
          name="description"
          maxLength={500}
          lang={authoredTextLang}
          defaultValue={value("description")}
          {...control("description")}
        />
        {error("description")}
      </div>
      <input type="hidden" name="sortOrder" value={sortOrder} />
      <button className="button primary" type="submit" disabled={atLimit}>
        {t("menub.addGroup")}
      </button>
    </form>
  );
}
