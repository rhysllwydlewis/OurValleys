"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import {
  businessAttributeDefinitions,
  type BusinessAttributeKey,
  type BusinessAttributeValues,
} from "@/modules/businesses/attribute-definitions";
import { attributeCopy } from "@/lib/i18n/business-copy";
import { useLocale } from "@/lib/i18n/client";
import type { Translator } from "@/lib/i18n/translate";
import { saveOnboardingAttributes, type SaveAttributesResult } from "./actions";

type SaveState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "saved" }
  | { phase: "error"; message: string };

function friendlyMessage(t: Translator, result: SaveAttributesResult): string {
  switch (result.status) {
    case "forbidden":
      return t("dash.form.forbidden");
    case "unauthenticated":
      return t("dash.form.unauthenticated");
    case "invalid":
      return t("dash.attributes.invalid");
    default:
      return t("dash.attributes.unavailable");
  }
}

export function AttributesForm({
  businessId,
  initialValues,
}: {
  businessId: string;
  initialValues: BusinessAttributeValues | null;
}) {
  const router = useRouter();
  const { t } = useLocale();
  const formId = useId();
  const [values, setValues] = useState<BusinessAttributeValues>(() => {
    const base = {} as BusinessAttributeValues;
    for (const definition of businessAttributeDefinitions) {
      base[definition.key] = initialValues?.[definition.key] ?? false;
    }
    return base;
  });
  const [state, setState] = useState<SaveState>({ phase: "idle" });
  const saving = state.phase === "saving";

  function toggle(key: BusinessAttributeKey) {
    setValues((current) => ({ ...current, [key]: !current[key] }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ phase: "saving" });
    let result: SaveAttributesResult;
    try {
      result = await saveOnboardingAttributes({
        businessId,
        attributes: values,
      });
    } catch {
      setState({
        phase: "error",
        message: t("dash.form.unreachable"),
      });
      return;
    }

    if (result.status === "saved") {
      setState({ phase: "saved" });
      router.refresh();
    } else {
      setState({ phase: "error", message: friendlyMessage(t, result) });
    }
  }

  return (
    <form
      className="dashboard-form ov-glass"
      onSubmit={submit}
      aria-labelledby={`${formId}-title`}
      aria-busy={saving}
    >
      <div>
        <p className="eyebrow">{t("dash.attributes.eyebrow")}</p>
        <h3 id={`${formId}-title`}>{t("dash.attributes.title")}</h3>
        <p className="dashboard-form__note">{t("dash.attributes.note")}</p>
      </div>

      <fieldset className="field-group">
        <legend className="sr-only">{t("dash.attributes.legend")}</legend>
        {businessAttributeDefinitions.map((definition) => (
          <label
            className="checkbox-field"
            htmlFor={`${formId}-${definition.key}`}
            key={definition.key}
          >
            <input
              id={`${formId}-${definition.key}`}
              type="checkbox"
              checked={values[definition.key]}
              disabled={saving}
              onChange={() => toggle(definition.key)}
            />
            <span>
              {attributeCopy(t, definition.key).label}
              <br />
              <span className="field-hint">
                {attributeCopy(t, definition.key).description}
              </span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="actions">
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? t("dash.form.saving") : t("dash.attributes.save")}
        </button>
        <p
          className={`save-status${state.phase === "error" ? " save-status--problem" : ""}`}
          role="status"
          aria-live="polite"
        >
          {state.phase === "saving" ? t("dash.form.saving") : null}
          {state.phase === "saved" ? t("dash.form.saved") : null}
          {state.phase === "error" ? state.message : null}
        </p>
      </div>
    </form>
  );
}
