"use client";

import { useActionState, useEffect, useRef } from "react";
import { FieldError } from "@/components/form-field-error";
import { fieldA11yProps, fieldErrorId } from "@/lib/form-field-a11y";
import { useLocale } from "@/lib/i18n/client";
import { initialHoursFormState } from "@/modules/businesses/opening-hours-form";
import { inviteMemberAction } from "../actions";
import styles from "../operations.module.css";

export type InviteRoleOption = { value: string; label: string };

/**
 * Invitation form. A refused save keeps what was typed and links each message
 * to its input.
 */
export function InviteMemberForm({
  businessId,
  roles,
}: {
  businessId: string;
  roles: readonly InviteRoleOption[];
}) {
  const { t, locale } = useLocale();
  const [state, formAction] = useActionState(
    inviteMemberAction,
    initialHoursFormState,
  );
  const alertRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "error") alertRef.current?.focus();
  }, [state.attempt, state.status]);

  const prefix = "invite";
  const refused = state.status === "error";
  const value = (name: string, fallback: string) =>
    refused ? (state.values[name] ?? fallback) : fallback;
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
      <h3>{t("ops.team.inviteTitle")}</h3>
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
        <label htmlFor="invite-email">{t("ops.team.email")}</label>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          maxLength={254}
          defaultValue={value("email", "")}
          {...control("email")}
        />
        {error("email")}
      </div>
      <div className={styles.field}>
        <label htmlFor="invite-role">{t("ops.team.roleLabel")}</label>
        <select
          id="invite-role"
          name="role"
          defaultValue={value("role", "editor")}
          {...control("role")}
        >
          {roles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        {error("role")}
      </div>
      <button className="button primary" type="submit">
        {t("ops.team.send")}
      </button>
    </form>
  );
}
