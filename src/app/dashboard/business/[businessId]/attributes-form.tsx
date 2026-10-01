"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import {
  businessAttributeDefinitions,
  type BusinessAttributeKey,
  type BusinessAttributeValues,
} from "@/modules/businesses/attribute-definitions";
import { saveOnboardingAttributes, type SaveAttributesResult } from "./actions";

type SaveState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "saved" }
  | { phase: "error"; message: string };

function friendlyMessage(result: SaveAttributesResult): string {
  switch (result.status) {
    case "forbidden":
      return "Your membership does not allow editing this business.";
    case "unauthenticated":
      return "Your session has ended. Sign in again to continue editing.";
    case "invalid":
      return "These attributes could not be saved. Please try again.";
    default:
      return "Saving is temporarily unavailable. Please try again shortly.";
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
        message:
          "Saving could not be reached. Check your connection and try again.",
      });
      return;
    }

    if (result.status === "saved") {
      setState({ phase: "saved" });
      router.refresh();
    } else {
      setState({ phase: "error", message: friendlyMessage(result) });
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
        <p className="eyebrow">Accessibility and services</p>
        <h3 id={`${formId}-title`}>Practical details for residents</h3>
        <p className="dashboard-form__note">
          Optional. These help residents know before they visit or get in touch
          — for example whether the entrance is step-free or staff can serve
          them in Welsh. Leave anything unticked if it does not apply.
        </p>
      </div>

      <fieldset className="field-group">
        <legend className="sr-only">Business attributes</legend>
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
              {definition.label}
              <br />
              <span className="field-hint">{definition.description}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="actions">
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save attributes"}
        </button>
        <p
          className={`save-status${state.phase === "error" ? " save-status--problem" : ""}`}
          role="status"
          aria-live="polite"
        >
          {state.phase === "saving" ? "Saving…" : null}
          {state.phase === "saved" ? "Saved." : null}
          {state.phase === "error" ? state.message : null}
        </p>
      </div>
    </form>
  );
}
