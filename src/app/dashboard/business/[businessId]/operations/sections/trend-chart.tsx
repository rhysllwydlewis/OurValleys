import type { DailyActivityPoint } from "@/modules/businesses/analytics";
import styles from "../operations.module.css";

const dayFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function formatDay(date: string): string {
  return dayFormatter.format(new Date(`${date}T12:00:00Z`));
}

const chartWidth = 600;
const chartHeight = 120;

/**
 * Per-day bars for website views, with a text table as the accessible and
 * no-CSS equivalent. Drawn as plain SVG so it needs no client JavaScript.
 */
export function TrendChart({ series }: { series: DailyActivityPoint[] }) {
  // Bars are scaled to the busiest day shown. The headline figures above use a
  // rolling window, so this caption deliberately does not restate totals that
  // could differ from them at the edge of the period.
  const peakViews = Math.max(0, ...series.map((point) => point.views));
  const max = Math.max(1, peakViews);
  const slot = chartWidth / series.length;
  const barWidth = Math.max(1, slot * 0.7);
  const peak = series.reduce<DailyActivityPoint | null>(
    (best, point) => (point.views > (best?.views ?? 0) ? point : best),
    null,
  );
  const first = series[0];
  const last = series[series.length - 1];

  return (
    <figure className={styles.trend}>
      <figcaption>
        <strong>Daily website views</strong>
        <span className={styles.meta}>
          {peak
            ? `Busiest day: ${formatDay(peak.date)} with ${peak.views} view${peak.views === 1 ? "" : "s"}. Each bar is one day.`
            : "No views were recorded on the days shown."}
        </span>
      </figcaption>
      <svg
        className={styles.trendSvg}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label={`Bar chart of website views per day from ${first ? formatDay(first.date) : ""} to ${last ? formatDay(last.date) : ""}. The table below has the same figures.`}
        preserveAspectRatio="none"
      >
        <line
          x1="0"
          x2={chartWidth}
          y1={chartHeight - 0.5}
          y2={chartHeight - 0.5}
          className={styles.trendAxis}
        />
        {series.map((point, index) => {
          const height =
            point.views === 0
              ? 0
              : Math.max(2, (point.views / max) * (chartHeight - 4));
          return (
            <rect
              key={point.date}
              className={styles.trendBar}
              x={index * slot + (slot - barWidth) / 2}
              y={chartHeight - 1 - height}
              width={barWidth}
              height={height}
              rx="1.5"
            >
              <title>{`${formatDay(point.date)}: ${point.views} view${point.views === 1 ? "" : "s"}`}</title>
            </rect>
          );
        })}
      </svg>
      <p className={styles.trendScale} aria-hidden="true">
        <span>{first ? formatDay(first.date) : ""}</span>
        <span>Highest day: {peakViews}</span>
        <span>{last ? formatDay(last.date) : ""}</span>
      </p>
      <details className={styles.trendTable}>
        <summary>Show the figures as a table</summary>
        <table>
          <caption className="sr-only">Activity per day</caption>
          <thead>
            <tr>
              <th scope="col">Day</th>
              <th scope="col">Views</th>
              <th scope="col">Contact-button uses</th>
              <th scope="col">Enquiries</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((point) => (
              <tr key={point.date}>
                <th scope="row">{formatDay(point.date)}</th>
                <td>{point.views}</td>
                <td>{point.contactActions}</td>
                <td>{point.enquiries}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
