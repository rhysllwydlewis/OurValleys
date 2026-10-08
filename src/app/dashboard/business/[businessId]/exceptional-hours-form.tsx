"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { useLocale } from "@/lib/i18n/client";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import {
  saveOnboardingSection,
  type SaveSectionIssue,
  type SaveSectionResult,
} from "./actions";
import styles from "./exceptional-hours-form.module.css";

type ExceptionalHoursValue = {
  date: string;
  closed: boolean;
  opensAt: string | null;
  closesAt: string | null;
  note: string | null;
};

type Row = ExceptionalHoursValue & { key: string };

type SaveState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "saved"; atLabel: string }
  | { phase: "invalid"; issues: SaveSectionIssue[] }
  | { phase: "conflict" }
  | { phase: "error"; message: string };

function issueFor(issues: SaveSectionIssue[], index: number, field: string) {
  const path = `${index}.${field}`;
  return (
    issues.find(
      (issue) =>
        issue.field === path || issue.field === field || issue.field === "",
    )?.message ?? null
  );
}

function resultMessage(t: Translator, result: SaveSectionResult): string {
  switch (result.status) {
    case "forbidden":
      return t("dash.form.forbidden");
    case "locked":
      return t("dash.form.locked");
    case "unauthenticated":
      return t("dash.form.unauthenticated");
    case "unavailable":
      return t("dash.exceptional.unavailable");
    default:
      return t("dash.exceptional.failed");
  }
}

export function ExceptionalHoursForm({
  businessId,
  initialVersion,
  initialValues,
}: {
  businessId: string;
  initialVersion: number;
  initialValues: ExceptionalHoursValue[] | null;
}) {
  const router = useRouter();
  const { locale, t } = useLocale();
  // The server explains validation failures in English only.
  const englishLang = locale === "cy" ? "en-GB" : undefined;
  const formId = useId();
  const [version, setVersion] = useState(initialVersion);
  const [state, setState] = useState<SaveState>({ phase: "idle" });
  const [nextKey, setNextKey] = useState(initialValues?.length ?? 0);
  const [rows, setRows] = useState<Row[]>(() =>
    (initialValues ?? []).map((value, index) => ({
      ...value,
      key: `exception-${index}`,
    })),
  );
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "Europe/London",
      }),
    [locale],
  );
  const issues = state.phase === "invalid" ? state.issues : [];
  const saving = state.phase === "saving";

  function addRow() {
    if (rows.length >= 60) return;
    setRows((current) => [
      ...current,
      {
        key: `exception-${nextKey}`,
        date: "",
        closed: true,
        opensAt: null,
        closesAt: null,
        note: "",
      },
    ]);
    setNextKey((value) => value + 1);
  }

  function updateRow(key: string, patch: Partial<ExceptionalHoursValue>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState({ phase: "saving" });
    let result: SaveSectionResult;
    try {
      result = await saveOnboardingSection({
        businessId,
        expectedVersion: version,
        section: "exceptionalHours",
        payload: rows.map(({ key: _key, ...row }) => ({
          ...row,
          note: row.note || null,
        })),
      });
    } catch {
      setState({
        phase: "error",
        message: t("dash.form.unreachable"),
      });
      return;
    }

    if (result.status === "saved") {
      setVersion(result.version);
      setState({
        phase: "saved",
        atLabel: formatter.format(new Date(result.savedAt)),
      });
      router.refresh();
    } else if (result.status === "invalid") {
      setState({ phase: "invalid", issues: result.issues });
    } else if (result.status === "conflict") {
      setState({ phase: "conflict" });
    } else {
      setState({ phase: "error", message: resultMessage(t, result) });
    }
  }

  return (
    <form
      className={`dashboard-form ov-glass ${styles.form}`}
      onSubmit={submit}
      aria-labelledby={`${formId}-title`}
      aria-busy={saving}
    >
      <div className={styles.heading}>
        <p className="eyebrow">{t("dash.exceptional.eyebrow")}</p>
        <h3 id={`${formId}-title`}>{t("dash.exceptional.title")}</h3>
        <p className="dashboard-form__note">{t("dash.exceptional.note")}</p>
      </div>

      {state.phase === "conflict" ? (
        <div className={styles.conflict} role="alert">
          <strong>{t("dash.form.conflictTitle")}</strong>
          <p>{t("dash.exceptional.conflictBody")}</p>
          <button
            className="button"
            type="button"
            onClick={() => location.reload()}
          >
            {t("dash.form.conflictLoad")}
          </button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className={styles.empty}>{t("dash.exceptional.empty")}</p>
      ) : (
        <div className={styles.list}>
          {rows.map((row, index) => {
            const dateError = issueFor(issues, index, "date");
            const timeError =
              issueFor(issues, index, "opensAt") ??
              issueFor(issues, index, "closesAt") ??
              issueFor(issues, index, "closed");
            return (
              <div className={styles.row} key={row.key}>
                <div className={styles.field}>
                  <label htmlFor={`${formId}-${row.key}-date`}>
                    {t("dash.exceptional.date")}
                  </label>
                  <input
                    id={`${formId}-${row.key}-date`}
                    type="date"
                    required
                    value={row.date}
                    disabled={saving}
                    aria-invalid={Boolean(dateError)}
                    onChange={(event) =>
                      updateRow(row.key, { date: event.currentTarget.value })
                    }
                  />
                </div>

                <label className={styles.closedLabel}>
                  <input
                    type="checkbox"
                    checked={row.closed}
                    disabled={saving}
                    onChange={(event) =>
                      updateRow(row.key, {
                        closed: event.currentTarget.checked,
                        opensAt: event.currentTarget.checked ? null : "09:00",
                        closesAt: event.currentTarget.checked ? null : "17:00",
                      })
                    }
                  />
                  {t("dash.exceptional.closedAllDay")}
                </label>

                {!row.closed ? (
                  <>
                    <div className={styles.field}>
                      <label htmlFor={`${formId}-${row.key}-opens`}>
                        {t("dash.exceptional.opens")}
                      </label>
                      <input
                        id={`${formId}-${row.key}-opens`}
                        type="time"
                        required
                        value={row.opensAt ?? ""}
                        disabled={saving}
                        aria-invalid={Boolean(timeError)}
                        onChange={(event) =>
                          updateRow(row.key, {
                            opensAt: event.currentTarget.value,
                          })
                        }
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor={`${formId}-${row.key}-closes`}>
                        {t("dash.exceptional.closes")}
                      </label>
                      <input
                        id={`${formId}-${row.key}-closes`}
                        type="time"
                        required
                        value={row.closesAt ?? ""}
                        disabled={saving}
                        aria-invalid={Boolean(timeError)}
                        onChange={(event) =>
                          updateRow(row.key, {
                            closesAt: event.currentTarget.value,
                          })
                        }
                      />
                    </div>
                  </>
                ) : (
                  <span>{t("dash.exceptional.regularNotApply")}</span>
                )}

                <div className={styles.field}>
                  <label htmlFor={`${formId}-${row.key}-note`}>
                    {t("dash.exceptional.note.label")}{" "}
                    <span className="field-hint">
                      {t("dash.form.optional")}
                    </span>
                  </label>
                  <input
                    id={`${formId}-${row.key}-note`}
                    lang={authoredTextLang}
                    type="text"
                    maxLength={120}
                    placeholder={t("dash.exceptional.notePlaceholder")}
                    value={row.note ?? ""}
                    disabled={saving}
                    onChange={(event) =>
                      updateRow(row.key, { note: event.currentTarget.value })
                    }
                  />
                </div>

                <button
                  className="button"
                  type="button"
                  disabled={saving}
                  aria-label={t("dash.exceptional.removeDated", {
                    date: row.date || String(index + 1),
                  })}
                  onClick={() =>
                    setRows((current) =>
                      current.filter((candidate) => candidate.key !== row.key),
                    )
                  }
                >
                  {t("dash.form.remove")}
                </button>

                {dateError || timeError ? (
                  <p className={styles.error} role="alert" lang={englishLang}>
                    {dateError ?? timeError}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.actions}>
        <button
          className="button"
          type="button"
          onClick={addRow}
          disabled={saving || rows.length >= 60}
        >
          {t("dash.exceptional.add")}
        </button>
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? t("dash.form.saving") : t("dash.exceptional.save")}
        </button>
        <p
          className={`${styles.status}${
            state.phase === "error" || state.phase === "invalid"
              ? ` ${styles.problem}`
              : ""
          }`}
          role="status"
          aria-live="polite"
        >
          {state.phase === "saved"
            ? t("dash.form.savedAt", { time: state.atLabel })
            : state.phase === "saving"
              ? t("dash.form.savingDraft")
              : state.phase === "invalid"
                ? t("dash.exceptional.invalid")
                : state.phase === "error"
                  ? state.message
                  : rows.length >= 60
                    ? t("dash.exceptional.limit")
                    : null}
        </p>
      </div>
    </form>
  );
}
