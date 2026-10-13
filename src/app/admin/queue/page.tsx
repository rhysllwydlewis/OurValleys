import type { Metadata, Route } from "next";
import Link from "next/link";
import {
  filterReviewDeskItems,
  formatAge,
  parseReviewDeskFilter,
  reviewDeskHref,
  reviewDeskKindLabels,
  reviewDeskKinds,
  summariseReviewDesk,
  urgencyLabels,
  type RankedReviewDeskItem,
  type ReviewDeskUrgency,
} from "@/modules/admin/review-desk";
import { readReviewDesk } from "@/modules/admin/review-desk-cache";
import styles from "../admin.module.css";
import { ReportRowActions } from "../reports/report-row-actions";
import { SuggestionRowActions } from "../suggestions/suggestion-row-actions";

export const dynamic = "force-dynamic";
const pageSize = 50;

export const metadata: Metadata = { title: "Review desk" };

function urgencyTone(urgency: ReviewDeskUrgency): string {
  if (urgency === "overdue") return styles.toneDanger ?? "";
  if (urgency === "due_soon") return styles.toneWarning ?? "";
  return styles.toneSuccess ?? "";
}

function DeskItem({ item }: { item: RankedReviewDeskItem }) {
  return (
    <li className={styles.deskItem} data-urgency={item.urgency}>
      <div className={styles.deskItemHead}>
        <span className={`${styles.pill} ${urgencyTone(item.urgency)}`}>
          {urgencyLabels[item.urgency]}
        </span>
        {item.risk === "high" ? (
          <span className={`${styles.pill} ${styles.toneDanger}`}>
            High risk
          </span>
        ) : null}
        <span className={styles.deskKind}>
          {reviewDeskKindLabels[item.kind]}
        </span>
        <span className={styles.deskAge} title="Time since it arrived">
          {formatAge(item.ageHours)} old
        </span>
      </div>
      <h3 className={styles.deskTitle}>{item.title}</h3>
      <p className={styles.deskSummary}>{item.summary}</p>
      {item.tags.length > 0 ? (
        <ul className={styles.deskTags} aria-label="Details">
          {item.tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}
      <div className={styles.deskActions}>
        <Link className="button primary" href={item.href as Route}>
          Open to review
        </Link>
        {item.quickAction?.kind === "suggestion" ? (
          <SuggestionRowActions suggestionId={item.quickAction.id} />
        ) : null}
        {item.quickAction?.kind === "report" ? (
          <ReportRowActions reportId={item.quickAction.id} />
        ) : null}
      </div>
    </li>
  );
}

export default async function AdminReviewDeskPage({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string | string[];
    urgency?: string | string[];
  }>;
}) {
  const filter = parseReviewDeskFilter(await searchParams);
  const { items, unavailable } = await readReviewDesk();
  const summary = summariseReviewDesk(items);
  const matching = filterReviewDeskItems(items, filter);
  const visible = matching.slice(0, pageSize);
  const filtered = Boolean(filter.kind || filter.urgency);

  return (
    <section aria-labelledby="desk-heading">
      <h2 id="desk-heading">Review desk</h2>
      <p className={styles.hint}>
        Everything waiting on an admin, most pressing first. High-risk and
        overdue items rise to the top; nothing here changes until you act on it,
        and every action is recorded in the audit log.
      </p>

      <div className={styles.statRow}>
        <Link
          className={`${styles.statTile} ${styles.statTileLink}`}
          href={reviewDeskHref({}) as Route}
        >
          <strong>{summary.total}</strong>
          <span>Waiting</span>
        </Link>
        <Link
          className={`${styles.statTile} ${styles.statTileLink}`}
          href={reviewDeskHref({ urgency: "overdue" }) as Route}
        >
          <strong>{summary.overdue}</strong>
          <span>Overdue</span>
        </Link>
        <div className={styles.statTile}>
          <strong>{summary.highRisk}</strong>
          <span>High risk</span>
        </div>
      </div>

      {unavailable.length > 0 ? (
        <div className={styles.feedbackError} role="alert">
          Could not read{" "}
          {unavailable
            .map((kind) => reviewDeskKindLabels[kind].toLowerCase())
            .join(", ")}{" "}
          items just now. The list below is incomplete, not empty. Reload to try
          again.
        </div>
      ) : null}

      <nav className={styles.filterBar} aria-label="Filter the review desk">
        <Link
          href={
            reviewDeskHref({ urgency: filter.urgency ?? undefined }) as Route
          }
          aria-current={!filter.kind ? "page" : undefined}
          className={`${styles.filterLink} ${!filter.kind ? styles.filterLinkActive : ""}`}
        >
          All kinds
        </Link>
        {reviewDeskKinds.map((kind) => (
          <Link
            key={kind}
            href={
              reviewDeskHref({
                kind,
                urgency: filter.urgency ?? undefined,
              }) as Route
            }
            aria-current={filter.kind === kind ? "page" : undefined}
            className={`${styles.filterLink} ${filter.kind === kind ? styles.filterLinkActive : ""}`}
          >
            {reviewDeskKindLabels[kind]} ({summary.byKind[kind]})
          </Link>
        ))}
      </nav>
      <nav className={styles.filterBar} aria-label="Filter by urgency">
        <Link
          href={reviewDeskHref({ kind: filter.kind ?? undefined }) as Route}
          aria-current={!filter.urgency ? "page" : undefined}
          className={`${styles.filterLink} ${!filter.urgency ? styles.filterLinkActive : ""}`}
        >
          Any urgency
        </Link>
        {(["overdue", "due_soon", "on_track"] as const).map((urgency) => (
          <Link
            key={urgency}
            href={
              reviewDeskHref({
                kind: filter.kind ?? undefined,
                urgency,
              }) as Route
            }
            aria-current={filter.urgency === urgency ? "page" : undefined}
            className={`${styles.filterLink} ${filter.urgency === urgency ? styles.filterLinkActive : ""}`}
          >
            {urgencyLabels[urgency]}
          </Link>
        ))}
      </nav>

      {visible.length === 0 ? (
        <div className={styles.emptyState}>
          {unavailable.length > 0
            ? "Nothing to show from the sources that could be read."
            : filtered
              ? "Nothing matches these filters. "
              : "All clear. Nothing is waiting on an admin."}
          {filtered ? (
            <Link href={"/admin/queue" as Route}>Clear filters</Link>
          ) : null}
        </div>
      ) : (
        <ol className={styles.deskList}>
          {visible.map((item) => (
            <DeskItem key={item.id} item={item} />
          ))}
        </ol>
      )}
      {matching.length > visible.length ? (
        <p className={styles.hint}>
          Showing the {visible.length} most pressing of {matching.length}.
          Resolve some, or narrow the filters, to see the rest.
        </p>
      ) : null}
    </section>
  );
}
