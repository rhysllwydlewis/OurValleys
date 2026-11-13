import type { Metadata, Route } from "next";
import Link from "next/link";
import { getEditorialInsights } from "@/modules/platform/editorial-insights";
import {
  EDITORIAL_WINDOWS,
  editorialKindLabels,
  editorialSourceLabels,
  parseEditorialWindow,
  type EditorialDailyPoint,
} from "@/modules/platform/editorial-insights-model";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Content insights",
};

const numberFormat = new Intl.NumberFormat("en-GB");

function formatDay(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function TrendChart({ points }: { points: readonly EditorialDailyPoint[] }) {
  const peak = Math.max(...points.map((point) => point.views), 0);
  const width = 600;
  const height = 120;
  const slot = width / Math.max(points.length, 1);
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <figure className={styles.trendFigure}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={styles.trendChart}
        role="img"
        aria-label={`Daily views, ${first ? formatDay(first.date) : ""} to ${last ? formatDay(last.date) : ""}, busiest day ${peak} views`}
        preserveAspectRatio="none"
      >
        {points.map((point, index) => {
          const barHeight =
            peak === 0 || point.views === 0
              ? 0
              : Math.max(3, (point.views / peak) * (height - 8));
          return (
            <rect
              key={point.date}
              x={index * slot + slot * 0.15}
              y={height - barHeight}
              width={slot * 0.7}
              height={barHeight}
              rx={1.5}
              className={styles.trendBar}
            >
              <title>{`${formatDay(point.date)}: ${point.views} views`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className={styles.trendCaption}>
        <span>{first ? formatDay(first.date) : ""}</span>
        <span>{last ? formatDay(last.date) : ""}</span>
      </figcaption>
    </figure>
  );
}

export default async function AdminInsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days } = await searchParams;
  const windowDays = parseEditorialWindow(days);
  const insights = await getEditorialInsights(windowDays);

  return (
    <section>
      <h2>Content insights</h2>
      <p className={styles.hint}>
        Which places, guides and local stories residents open. Counts are
        anonymous page opens: a repeat open by the same visitor within half an
        hour counts once, no names or addresses are stored, and the figures are
        removed after 13 months. Use them to decide what to write, refresh or
        retire next.
      </p>
      <div className={styles.filterBar}>
        {EDITORIAL_WINDOWS.map((value) => (
          <Link
            key={value}
            href={`/admin/insights?days=${value}` as Route}
            aria-current={windowDays === value ? "page" : undefined}
            className={`${styles.filterLink} ${windowDays === value ? styles.filterLinkActive : ""}`}
          >
            Last {value} days
          </Link>
        ))}
      </div>

      {insights === null ? (
        <div className={styles.emptyState} role="status">
          The figures could not be read just now. Try again in a moment; no data
          has been lost.
        </div>
      ) : insights.totalViews === 0 ? (
        <div className={styles.emptyState}>
          No page opens recorded in the last {windowDays} days. Opens of
          published places, guides and local stories appear here as residents
          visit them.
        </div>
      ) : (
        <>
          <div className={styles.statRow}>
            <div className={styles.statTile}>
              <strong>{numberFormat.format(insights.totalViews)}</strong>
              <span>Total opens</span>
            </div>
            {insights.groups.map((group) => (
              <div key={group.kind} className={styles.statTile}>
                <strong>{numberFormat.format(group.totalViews)}</strong>
                <span>{editorialKindLabels[group.kind].plural}</span>
              </div>
            ))}
          </div>

          <h3 className={styles.insightHeading}>Opens per day</h3>
          <TrendChart points={insights.daily} />

          <div className={styles.insightColumns}>
            {insights.groups.map((group) => (
              <section
                key={group.kind}
                className={styles.insightCard}
                aria-labelledby={`insight-${group.kind}`}
              >
                <h3 id={`insight-${group.kind}`}>
                  {editorialKindLabels[group.kind].plural}
                </h3>
                <p className={styles.hint}>
                  {numberFormat.format(group.totalViews)} opens by about{" "}
                  {numberFormat.format(group.uniqueVisitors)} visitors
                </p>
                {group.rows.length === 0 ? (
                  <p className={styles.hint}>
                    No {editorialKindLabels[group.kind].plural.toLowerCase()}{" "}
                    opened in this period.
                  </p>
                ) : (
                  <ol className={styles.rankList}>
                    {group.rows.map((row) => (
                      <li key={row.itemId}>
                        <div className={styles.rankLine}>
                          {row.href ? (
                            <Link
                              href={row.href as Route}
                              className={styles.rowLink}
                            >
                              {row.title}
                            </Link>
                          ) : (
                            <span>
                              {row.title}{" "}
                              <span className={styles.hint}>(not public)</span>
                            </span>
                          )}
                          <strong>{numberFormat.format(row.views)}</strong>
                        </div>
                        <div className={styles.rankTrack} aria-hidden="true">
                          <div
                            className={styles.rankFill}
                            style={{ width: `${row.barPercent}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
                {group.hiddenCount > 0 ? (
                  <p className={styles.hint}>
                    and {numberFormat.format(group.hiddenCount)} more with
                    opens.
                  </p>
                ) : null}
                {group.unreadCount > 0 ? (
                  <div className={styles.unreadBlock}>
                    <h4>Not opened in this period</h4>
                    <p className={styles.hint}>
                      {numberFormat.format(group.unreadCount)}{" "}
                      {group.unreadCount === 1
                        ? editorialKindLabels[group.kind].singular
                        : editorialKindLabels[group.kind].plural.toLowerCase()}
                      , for example:
                    </p>
                    <ul>
                      {group.unread.map((item) => (
                        <li key={item.itemId}>
                          <Link
                            href={item.href as Route}
                            className={styles.rowLink}
                          >
                            {item.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          <h3 className={styles.insightHeading}>Where readers came from</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Source</th>
                  <th scope="col">Opens</th>
                  <th scope="col">Share</th>
                </tr>
              </thead>
              <tbody>
                {insights.sources.map((row) => (
                  <tr key={row.source}>
                    <td>{editorialSourceLabels[row.source] ?? row.source}</td>
                    <td>{numberFormat.format(row.views)}</td>
                    <td>{row.percent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
