import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  placeSuggestionKindLabels,
  placeSuggestionStatuses,
  type PlaceSuggestionStatus,
} from "@/modules/reference-data/place-suggestion-model";
import {
  countPlaceSuggestionsByStatus,
  listPlaceSuggestions,
} from "@/modules/reference-data/place-suggestions";
import styles from "../admin.module.css";
import { statusLabel } from "../status-tone";
import { PlaceSuggestionActions } from "./suggestion-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Place suggestions" };

const statusNames: Record<PlaceSuggestionStatus, string> = {
  new: "Waiting",
  applied: "Handled",
  dismissed: "Dismissed",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function AdminPlaceSuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter: PlaceSuggestionStatus =
    placeSuggestionStatuses.find((value) => value === status) ?? "new";
  const [result, counts] = await Promise.all([
    listPlaceSuggestions(filter),
    countPlaceSuggestionsByStatus(),
  ]);

  return (
    <section aria-labelledby="place-suggestions-heading">
      <h2 id="place-suggestions-heading">Place suggestions</h2>
      <p className={styles.hint}>
        Facts, corrections and Welsh wording that residents suggest for place
        pages. Private: nothing is published as written and nobody is contacted.
        Adding a fact puts it on the place page under “Good to know”; use the
        Places editor for anything else. Decided suggestions are deleted after
        twelve months.
      </p>
      <nav className={styles.filterBar} aria-label="Suggestion status">
        {placeSuggestionStatuses.map((value) => (
          <Link
            key={value}
            href={`/admin/place-suggestions?status=${value}` as Route}
            aria-current={filter === value ? "page" : undefined}
            className={`${styles.filterLink} ${filter === value ? styles.filterLinkActive : ""}`}
          >
            {statusNames[value]}
            {counts ? ` (${counts[value]})` : ""}
          </Link>
        ))}
      </nav>

      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          Place suggestions are temporarily unavailable. Please try again
          shortly.
        </div>
      ) : result.suggestions.length === 0 ? (
        <div className={styles.emptyState}>
          {filter === "new"
            ? "Nothing is waiting. New suggestions from place pages appear here."
            : `No ${statusLabel(statusNames[filter]).toLowerCase()} suggestions yet.`}
        </div>
      ) : (
        <ul className={styles.deskList}>
          {result.suggestions.map((suggestion) => (
            <li key={suggestion.id} className={styles.deskItem}>
              <div className={styles.deskItemHead}>
                <span className={`${styles.pill} ${styles.toneNeutral}`}>
                  {placeSuggestionKindLabels[suggestion.kind]}
                </span>
                <span className={styles.deskKind}>{suggestion.placeName}</span>
                <span className={styles.deskAge}>
                  {formatDate(suggestion.createdAt)}
                </span>
              </div>
              {suggestion.factLabel ? (
                <h3 className={styles.deskTitle}>{suggestion.factLabel}</h3>
              ) : null}
              <p
                className={styles.deskSummary}
                style={{ whiteSpace: "pre-line" }}
              >
                {suggestion.message}
              </p>
              <div className={styles.deskActions}>
                <Link
                  className="button"
                  href={`/places/${suggestion.placeSlug}` as Route}
                >
                  View place page
                </Link>
                <Link
                  className="button"
                  href={`/admin/places/${suggestion.placeId}` as Route}
                >
                  Edit profile
                </Link>
                {suggestion.status === "new" ? (
                  <PlaceSuggestionActions
                    suggestionId={suggestion.id}
                    placeLabel={suggestion.placeName}
                    isFact={suggestion.kind === "fact"}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
