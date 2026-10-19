import type { Route } from "next";
import Link from "next/link";
import { saveSearchAction } from "@/app/account/saved/actions";
import type { Translator } from "@/lib/i18n/translate";
import {
  MAX_SAVED_SEARCHES,
  type SavedSearchType,
} from "@/modules/residents/saved-search-model";
import styles from "./search.module.css";

export type SaveSearchState =
  /** Signed out: offer to sign in and come back. */
  | { kind: "anonymous" }
  /** Signed in and not yet kept. */
  | { kind: "available" }
  /** Already kept by this resident. */
  | { kind: "saved" }
  /** Saving is not offered (the public demo account, or the list could not be read). */
  | { kind: "hidden" };

/** Plain-language result of the last save, from the redirect back to this page. */
function outcomeMessage(outcome: string | undefined, t: Translator) {
  if (!outcome) return null;
  if (outcome === "saved") return t("resident.saved.searches.outcome.saved");
  if (outcome === "already_saved") {
    return t("resident.saved.searches.outcome.already");
  }
  if (outcome === "limit") {
    return t("resident.saved.searches.outcome.limit", {
      max: MAX_SAVED_SEARCHES,
    });
  }
  return t("resident.saved.searches.outcome.failed");
}

/**
 * "Save this search" on the results page. A plain form posting to a server
 * action, so it works without JavaScript; the action re-checks the session.
 */
export function SaveSearch({
  t,
  query,
  type,
  returnTo,
  state,
  outcome,
}: {
  t: Translator;
  query: string;
  type: SavedSearchType;
  returnTo: string;
  state: SaveSearchState;
  outcome?: string;
}) {
  const message = outcomeMessage(outcome, t);
  if (state.kind === "hidden" && !message) return null;
  return (
    <div className={styles.saveSearch}>
      {state.kind === "available" ? (
        <form action={saveSearchAction}>
          <input name="query" type="hidden" value={query} />
          <input name="type" type="hidden" value={type} />
          <input name="returnTo" type="hidden" value={returnTo} />
          <button className="button" type="submit">
            {t(
              type === "directory"
                ? "resident.searchSave.directoryButton"
                : "resident.searchSave.button",
            )}
          </button>
        </form>
      ) : state.kind === "anonymous" ? (
        <Link
          className="button"
          href={`/login?next=${encodeURIComponent(returnTo)}` as Route}
        >
          {t(
            type === "directory"
              ? "resident.searchSave.directorySignIn"
              : "resident.searchSave.signIn",
          )}
        </Link>
      ) : null}
      {state.kind === "saved" ? (
        <Link
          className="text-link"
          href={"/account/saved?tab=searches" as Route}
        >
          {t("resident.searchSave.manage")}
        </Link>
      ) : null}
      {state.kind === "available" || state.kind === "anonymous" ? (
        <p className={styles.note}>{t("resident.searchSave.hint")}</p>
      ) : null}
      {message ? (
        <p className={styles.note} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
