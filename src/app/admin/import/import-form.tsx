"use client";

import { useActionState } from "react";
import styles from "../admin.module.css";
import { importBusinessesAction, type ImportActionState } from "./actions";

const initial: ImportActionState = { status: "idle" };

export function ImportForm() {
  const [state, formAction, pending] = useActionState(
    importBusinessesAction,
    initial,
  );

  return (
    <form action={formAction} className={styles.hint}>
      <p>
        <label htmlFor="import-file">CSV file</label>
        <br />
        <input
          id="import-file"
          name="file"
          type="file"
          accept=".csv,text/csv"
        />
      </p>
      <p>
        <label htmlFor="import-csv">Or paste CSV text</label>
        <br />
        <textarea
          id="import-csv"
          name="csv"
          rows={8}
          cols={60}
          spellCheck={false}
          placeholder={
            "trading_name,welsh_name,category,place,business_type\nExample Cafe,,cafes,treorchy,premises"
          }
        />
      </p>
      <p>
        <button type="submit" name="intent" value="check" disabled={pending}>
          Check only
        </button>{" "}
        <button type="submit" name="intent" value="import" disabled={pending}>
          Import as drafts
        </button>
      </p>
      <div role="status" aria-live="polite">
        {state.status === "forbidden" ? (
          <p>
            You need a private administrator account with two-step verification.
          </p>
        ) : null}
        {state.status === "invalid" ? <p>{state.message}</p> : null}
        {state.status === "unavailable" ? (
          <p>
            The import is temporarily unavailable. Please try again shortly.
          </p>
        ) : null}
        {state.status === "checked" || state.status === "imported" ? (
          <>
            <p>
              {state.status === "checked"
                ? `${state.created} business${state.created === 1 ? "" : "es"} would be created. Nothing was saved.`
                : `${state.created} draft business${state.created === 1 ? "" : "es"} created.`}
            </p>
            {state.skipped.length > 0 ? (
              <>
                <p>Skipped:</p>
                <ul>
                  {state.skipped.map((item) => (
                    <li key={`s${item.line}`}>
                      Line {item.line}: {item.message}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            {state.errors.length > 0 ? (
              <>
                <p>Rows with problems (not imported):</p>
                <ul>
                  {state.errors.map((item) => (
                    <li key={`e${item.line}-${item.message}`}>
                      Line {item.line}: {item.message}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </form>
  );
}
