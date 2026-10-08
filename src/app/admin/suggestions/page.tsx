import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  businessSuggestionStatuses,
  type BusinessSuggestionStatus,
} from "@/modules/businesses/suggestion-input";
import { listBusinessSuggestions } from "@/modules/businesses/suggestions";
import styles from "../admin.module.css";
import { statusLabel, statusTone } from "../status-tone";
import { SuggestionRowActions } from "./suggestion-row-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Business suggestions",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function AdminSuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = businessSuggestionStatuses.find(
    (value) => value === status,
  ) as BusinessSuggestionStatus | undefined;
  const result = await listBusinessSuggestions(filter);

  return (
    <section>
      <h2>Business suggestions</h2>
      <p>
        Leads from residents about businesses that are not listed. Private:
        nothing here is published, and no business is contacted from this page.
        Suggestions are deleted after twelve months.
      </p>
      <div className={styles.filterBar}>
        {businessSuggestionStatuses.map((value) => (
          <Link
            key={value}
            href={`/admin/suggestions?status=${value}` as Route}
            aria-current={filter === value ? "page" : undefined}
            className={`${styles.filterLink} ${filter === value ? styles.filterLinkActive : ""}`}
          >
            {statusLabel(value)}
          </Link>
        ))}
        <Link
          href={"/admin/suggestions" as Route}
          aria-current={!filter ? "page" : undefined}
          className={`${styles.filterLink} ${!filter ? styles.filterLinkActive : ""}`}
        >
          All
        </Link>
      </div>

      {result.state === "unavailable" ? (
        <div className={styles.emptyState}>
          Suggestions are temporarily unavailable. Please try again shortly.
        </div>
      ) : result.suggestions.length === 0 ? (
        <div className={styles.emptyState}>
          No suggestions match this filter.
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Business</th>
                <th>Place</th>
                <th>Category</th>
                <th>Note</th>
                <th>Resident email</th>
                <th>Status</th>
                <th>Received</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {result.suggestions.map((suggestion) => (
                <tr key={suggestion.id}>
                  <td>
                    {suggestion.name}
                    {suggestion.sameCount > 1 ? (
                      <>
                        {" "}
                        <span
                          className={`${styles.pill} ${styles.toneWarning}`}
                        >
                          {suggestion.sameCount} suggestions
                        </span>
                      </>
                    ) : null}
                  </td>
                  <td>{suggestion.placeText}</td>
                  <td>{suggestion.categoryText ?? "—"}</td>
                  <td>{suggestion.note ?? "—"}</td>
                  <td>{suggestion.contactEmail ?? "—"}</td>
                  <td>
                    <span
                      className={`${styles.pill} ${styles[statusTone(suggestion.status === "new" ? "open" : suggestion.status)]}`}
                    >
                      {statusLabel(suggestion.status)}
                    </span>
                  </td>
                  <td>{formatDate(suggestion.createdAt)}</td>
                  <td>
                    {suggestion.status === "new" ? (
                      <SuggestionRowActions suggestionId={suggestion.id} />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
