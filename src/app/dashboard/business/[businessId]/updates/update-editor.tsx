"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLocale } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/translate";
import {
  bodyParagraphs,
  initialUpdateFormState,
  readUpdateValues,
  updateLimits,
  type UpdateFieldName,
  type UpdateFormState,
  type UpdateFormValues,
} from "@/modules/businesses/updates-model";
import { saveUpdateAction } from "./actions";
import styles from "./updates.module.css";

function Preview({ values, id }: { values: UpdateFormValues; id: string }) {
  const { t } = useLocale();
  const title = values.title.trim();
  const paragraphs = bodyParagraphs(values.body);
  const welsh = values.titleCy.trim() && values.bodyCy.trim();
  return (
    <aside className={styles.preview} aria-labelledby={`${id}-preview-title`}>
      <p id={`${id}-preview-title`} className={styles.previewLabel}>
        {t("upd.preview.label")}
      </p>
      <article className={styles.previewCard}>
        {title || paragraphs.length > 0 ? (
          <>
            <h3 lang="en-GB">{title || t("upd.preview.noTitle")}</h3>
            <div lang="en-GB">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </>
        ) : (
          <p className={styles.previewEmpty}>{t("upd.preview.empty")}</p>
        )}
      </article>
      <p className={styles.hint}>
        {welsh ? t("upd.preview.welshYes") : t("upd.preview.welshNo")}
      </p>
    </aside>
  );
}

/**
 * The create and edit form for one update, with a live sketch of how it
 * reads on the website. The server re-validates every field and returns
 * error codes; this component only translates them and keeps what was typed.
 */
export function UpdateEditor({
  businessId,
  updateId,
  expectedUpdatedAt,
  initial,
  idPrefix,
  published,
  canEdit,
}: {
  businessId: string;
  updateId?: string;
  expectedUpdatedAt?: number;
  initial: UpdateFormValues;
  idPrefix: string;
  /** An already-public update is saved as it is; a draft can also be published. */
  published: boolean;
  canEdit: boolean;
}) {
  const { t } = useLocale();
  const [state, formAction, pending] = useActionState<
    UpdateFormState,
    FormData
  >(saveUpdateAction, initialUpdateFormState);
  const refused = state.status === "error";
  const start: UpdateFormValues = refused
    ? { ...initial, ...state.values }
    : initial;
  const [live, setLive] = useState<UpdateFormValues>(start);
  const summaryRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.status === "error") summaryRef.current?.focus();
  }, [state.attempt, state.status]);

  const errorFor = (field: UpdateFieldName) => state.errors[field];
  const hasErrors = Object.keys(state.errors).length > 0;

  function field(
    name: UpdateFieldName,
    label: MessageKey,
    hint: MessageKey,
    options: { rows?: number; max: number; lang?: string },
  ) {
    const id = `${idPrefix}-${name}`;
    const error = errorFor(name);
    const length = live[name].trim().length;
    return (
      <div className={styles.field}>
        <label htmlFor={id}>{t(label)}</label>
        {options.rows ? (
          <textarea
            id={id}
            name={name}
            rows={options.rows}
            defaultValue={start[name]}
            disabled={!canEdit}
            lang={options.lang}
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
          />
        ) : (
          <input
            id={id}
            name={name}
            defaultValue={start[name]}
            disabled={!canEdit}
            lang={options.lang}
            autoComplete="off"
            aria-invalid={error ? true : undefined}
            aria-describedby={`${id}-hint${error ? ` ${id}-err` : ""}`}
          />
        )}
        <p id={`${id}-hint`} className={styles.hint}>
          {t(hint)}{" "}
          <span data-over={length > options.max ? "true" : undefined}>
            {t("upd.form.count", { count: length, max: options.max })}
          </span>
        </p>
        {error ? (
          <p id={`${id}-err`} className={styles.fieldError}>
            {t(`upd.err.${error}` as MessageKey)}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.editorGrid}>
      <form
        className={styles.form}
        action={formAction}
        onChange={(event) =>
          setLive(
            readUpdateValues((name) =>
              new FormData(event.currentTarget).get(name),
            ),
          )
        }
        onSubmit={(event) => {
          // Submit from here so React does not reset the form afterwards:
          // everything typed stays after a refusal. The pressed button names
          // the intent.
          event.preventDefault();
          const submitter = (event.nativeEvent as SubmitEvent)
            .submitter as HTMLButtonElement | null;
          const data = new FormData(event.currentTarget);
          if (submitter?.name) data.set(submitter.name, submitter.value);
          startTransition(() => formAction(data));
        }}
        noValidate
      >
        <input type="hidden" name="businessId" value={businessId} />
        {updateId ? (
          <>
            <input type="hidden" name="updateId" value={updateId} />
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
              ? t(`upd.formError.${state.formError}` as MessageKey)
              : t("upd.form.errorsIntro")}
          </p>
        ) : null}

        {field("title", "upd.form.title", "upd.form.titleHint", {
          max: updateLimits.titleMax,
        })}
        {field("body", "upd.form.body", "upd.form.bodyHint", {
          rows: 6,
          max: updateLimits.bodyMax,
        })}

        <fieldset className={styles.welsh}>
          <legend>{t("upd.form.welshLegend")}</legend>
          <p className={styles.hint}>{t("upd.form.welshHint")}</p>
          {field("titleCy", "upd.form.titleCy", "upd.form.titleCyHint", {
            max: updateLimits.titleMax,
            lang: "cy-GB",
          })}
          {field("bodyCy", "upd.form.bodyCy", "upd.form.bodyCyHint", {
            rows: 6,
            max: updateLimits.bodyMax,
            lang: "cy-GB",
          })}
        </fieldset>

        {canEdit ? (
          <div className={styles.formActions}>
            {published ? (
              <button
                className="button primary"
                type="submit"
                name="intent"
                value="save"
                disabled={pending}
                aria-busy={pending}
              >
                {pending ? t("upd.form.saving") : t("upd.form.saveChanges")}
              </button>
            ) : (
              <>
                <button
                  className="button primary"
                  type="submit"
                  name="intent"
                  value="publish"
                  disabled={pending}
                  aria-busy={pending}
                >
                  {pending ? t("upd.form.saving") : t("upd.form.publish")}
                </button>
                <button
                  className="button"
                  type="submit"
                  name="intent"
                  value="save"
                  disabled={pending}
                >
                  {t("upd.form.saveDraft")}
                </button>
              </>
            )}
          </div>
        ) : null}
      </form>
      <Preview values={live} id={idPrefix} />
    </div>
  );
}
