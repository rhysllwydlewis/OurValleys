"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
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

function resultMessage(result: SaveSectionResult): string {
  switch (result.status) {
    case "forbidden":
      return "Your membership does not allow editing this business.";
    case "unauthenticated":
      return "Your session has ended. Sign in again to continue editing.";
    case "unavailable":
      return "Saving is temporarily unavailable. Your last saved draft is safe.";
    default:
      return "The exceptional hours could not be saved. Please try again.";
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
      new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London",
      }),
    [],
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
        message:
          "Saving could not be reached. Check your connection and try again.",
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
      setState({ phase: "error", message: resultMessage(result) });
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
        <p className="eyebrow">Step 5 · Date exceptions</p>
        <h3 id={`${formId}-title`}>Exceptional opening hours</h3>
        <p className="dashboard-form__note">
          Add closures or changed hours for bank holidays, seasonal dates and
          one-off events. These remain draft data until a later publication
          step.
        </p>
      </div>

      {state.phase === "conflict" ? (
        <div className={styles.conflict} role="alert">
          <strong>A newer draft version exists.</strong>
          <p>
            Another section was saved after this page loaded. Reload the latest
            version before saving these exceptions.
          </p>
          <button
            className="button"
            type="button"
            onClick={() => location.reload()}
          >
            Load latest version
          </button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className={styles.empty}>
          No exceptional dates have been added. Regular weekly hours still
          apply.
        </p>
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
                  <label htmlFor={`${formId}-${row.key}-date`}>Date</label>
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
                  Closed all day
                </label>

                {!row.closed ? (
                  <>
                    <div className={styles.field}>
                      <label htmlFor={`${formId}-${row.key}-opens`}>
                        Opens
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
                        Closes
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
                  <span>Regular hours do not apply</span>
                )}

                <div className={styles.field}>
                  <label htmlFor={`${formId}-${row.key}-note`}>
                    Note <span className="field-hint">(optional)</span>
                  </label>
                  <input
                    id={`${formId}-${row.key}-note`}
                    type="text"
                    maxLength={120}
                    placeholder="e.g. Bank holiday"
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
                  aria-label={`Remove exceptional date ${row.date || index + 1}`}
                  onClick={() =>
                    setRows((current) =>
                      current.filter((candidate) => candidate.key !== row.key),
                    )
                  }
                >
                  Remove
                </button>

                {dateError || timeError ? (
                  <p className={styles.error} role="alert">
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
          Add exceptional date
        </button>
        <button className="button primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save exceptional hours draft"}
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
            ? `Draft saved at ${state.atLabel}.`
            : state.phase === "saving"
              ? "Saving draft…"
              : state.phase === "invalid"
                ? "Some exceptional dates need attention before saving."
                : state.phase === "error"
                  ? state.message
                  : rows.length >= 60
                    ? "The 60-date limit has been reached."
                    : null}
        </p>
      </div>
    </form>
  );
}
