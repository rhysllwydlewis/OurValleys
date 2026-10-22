"use client";

import { useActionState, useEffect, useRef } from "react";
import { FieldError } from "@/components/form-field-error";
import { fieldA11yProps, fieldErrorId } from "@/lib/form-field-a11y";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { useLocale } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import { initialHoursFormState } from "@/modules/businesses/opening-hours-form";
import { saveContactAction } from "../actions";
import styles from "../operations.module.css";

export type ContactMethodDefaults = {
  id?: string;
  type: string;
  label: string;
  value: string;
  enabled: boolean;
  isPrimary: boolean;
  sortOrder: number;
};

const contactLabels: Record<string, MessageKey> = {
  call: "ops.contacts.type.call",
  email: "ops.contacts.type.email",
  enquiry: "ops.contacts.type.enquiry",
  quote: "ops.contacts.type.quote",
  callback: "ops.contacts.type.callback",
  booking: "ops.contacts.type.booking",
  whatsapp: "ops.contacts.type.whatsapp",
  directions: "ops.contacts.type.directions",
  website: "ops.contacts.type.website",
  order: "ops.contacts.type.order",
};

/**
 * One contact-method form, for an existing method or the "add" card. A refused
 * save keeps what was typed and links each message to its input.
 */
export function ContactMethodForm({
  businessId,
  method,
  types,
  canEdit,
}: {
  businessId: string;
  method: ContactMethodDefaults;
  types: readonly string[];
  canEdit: boolean;
}) {
  const { t, locale } = useLocale();
  const [state, formAction] = useActionState(
    saveContactAction,
    initialHoursFormState,
  );
  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "error") alertRef.current?.focus();
  }, [state.attempt, state.status]);

  const isNew = !method.id;
  const prefix = method.id ?? "new-contact";
  const refused = state.status === "error";
  const value = (name: string, fallback: string) =>
    refused ? (state.values[name] ?? fallback) : fallback;
  const control = (name: string) => ({
    ...fieldA11yProps(fieldErrorId(prefix, name), state.fieldErrors[name]),
  });
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
      {method.id ? (
        <input type="hidden" name="methodId" value={method.id} />
      ) : null}
      {isNew ? <h3>{t("ops.contacts.addTitle")}</h3> : null}
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
        <label htmlFor={`${prefix}-type`}>{t("ops.contacts.method")}</label>
        <select
          id={`${prefix}-type`}
          name="type"
          defaultValue={value("type", method.type)}
          disabled={!canEdit}
          {...control("type")}
        >
          {types.map((type) => (
            <option value={type} key={type}>
              {contactLabels[type] ? t(contactLabels[type]) : type}
            </option>
          ))}
        </select>
        {error("type")}
      </div>
      <div className={styles.field}>
        <label htmlFor={`${prefix}-label`}>
          {t("ops.contacts.buttonLabel")}
        </label>
        <input
          id={`${prefix}-label`}
          lang={authoredTextLang}
          name="label"
          defaultValue={value("label", method.label)}
          disabled={!canEdit}
          required
          {...control("label")}
        />
        {error("label")}
      </div>
      <div className={styles.field}>
        <label htmlFor={`${prefix}-value`}>
          {t(isNew ? "ops.contacts.value" : "ops.contacts.valueHelp")}
        </label>
        <input
          id={`${prefix}-value`}
          lang={authoredTextLang}
          name="value"
          defaultValue={value("value", method.value)}
          disabled={!canEdit}
          required
          {...control("value")}
        />
        {error("value")}
      </div>
      <div className={styles.field}>
        <label htmlFor={`${prefix}-order`}>{t("ops.common.order")}</label>
        <input
          id={`${prefix}-order`}
          name="sortOrder"
          type="number"
          min="0"
          max="50"
          defaultValue={value("sortOrder", String(method.sortOrder))}
          disabled={!canEdit}
          {...control("sortOrder")}
        />
        {error("sortOrder")}
      </div>
      <label className={styles.check}>
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={method.enabled}
          disabled={!canEdit}
        />{" "}
        {t("ops.common.enabled")}
      </label>
      <label className={styles.check}>
        <input
          type="checkbox"
          name="isPrimary"
          defaultChecked={method.isPrimary}
          disabled={!canEdit}
        />{" "}
        {t("ops.contacts.primary")}
      </label>
      {canEdit ? (
        isNew ? (
          <button className="button primary" type="submit">
            {t("ops.contacts.add")}
          </button>
        ) : (
          <div className={styles.actions}>
            <button className="button primary" type="submit">
              {t("ops.common.save")}
            </button>
          </div>
        )
      ) : null}
    </form>
  );
}
