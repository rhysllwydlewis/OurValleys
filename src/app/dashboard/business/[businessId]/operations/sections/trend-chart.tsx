import type { DailyActivityPoint } from "@/modules/businesses/analytics";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import styles from "../operations.module.css";
import type { I18n } from "./shared";

const chartWidth = 600;
const chartHeight = 120;

/**
 * Per-day bars for website views, with a text table as the accessible and
 * no-CSS equivalent. Drawn as plain SVG so it needs no client JavaScript.
 */
export function TrendChart({
  series,
  i18n: { locale, t },
}: {
  series: DailyActivityPoint[];
  i18n: I18n;
}) {
  const dayFormatter = new Intl.DateTimeFormat(
    LOCALE_DETAILS[locale].htmlLang,
    {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    },
  );
  const formatDay = (date: string) =>
    dayFormatter.format(new Date(`${date}T12:00:00Z`));
  // Bars are scaled to the busiest day shown. The series uses the same rolling
  // window as the headline figures, so its first day is only partly covered.
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
        <strong>{t("ops.trend.title")}</strong>
        <span className={styles.meta}>
          {peak
            ? t(
                peak.views === 1
                  ? "ops.trend.busiest.one"
                  : "ops.trend.busiest.other",
                { day: formatDay(peak.date), count: peak.views },
              )
            : t("ops.trend.noViews")}
        </span>
      </figcaption>
      <svg
        className={styles.trendSvg}
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label={t("ops.trend.chartAria", {
          from: first ? formatDay(first.date) : "",
          to: last ? formatDay(last.date) : "",
        })}
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
              <title>
                {t(
                  point.views === 1
                    ? "ops.trend.barTitle.one"
                    : "ops.trend.barTitle.other",
                  {
                    day: formatDay(point.date),
                    part: point.partial ? t("ops.trend.partDay") : "",
                    count: point.views,
                  },
                )}
              </title>
            </rect>
          );
        })}
      </svg>
      <p className={styles.trendScale} aria-hidden="true">
        <span>{first ? formatDay(first.date) : ""}</span>
        <span>{t("ops.trend.highest", { count: peakViews })}</span>
        <span>{last ? formatDay(last.date) : ""}</span>
      </p>
      <details className={styles.trendTable}>
        <summary>{t("ops.trend.showTable")}</summary>
        <table>
          <caption className="sr-only">{t("ops.trend.caption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("ops.trend.day")}</th>
              <th scope="col">{t("ops.trend.views")}</th>
              <th scope="col">{t("ops.trend.contacts")}</th>
              <th scope="col">{t("ops.trend.enquiries")}</th>
            </tr>
          </thead>
          <tbody>
            {[...series].reverse().map((point) => (
              <tr key={point.date}>
                <th scope="row">
                  {formatDay(point.date)}
                  {point.partial ? t("ops.trend.partDay") : ""}
                </th>
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
