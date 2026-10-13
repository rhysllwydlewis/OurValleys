import type { Route } from "next";
import Link from "next/link";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import {
  describePeriodChange,
  type DailyActivityPoint,
  type PeriodChange,
} from "@/modules/businesses/analytics";
import type { HubFigure } from "@/modules/businesses/owner-hub";
import styles from "./hub.module.css";

const figureLabel = {
  views: "hub.perf.views",
  searches: "hub.perf.searches",
  contacts: "hub.perf.contacts",
  enquiries: "hub.perf.enquiries",
} as const satisfies Record<HubFigure["key"], MessageKey>;

function changeText(
  t: Translator,
  change: PeriodChange,
): { text: string; tone: "up" | "down" | null } {
  switch (change.kind) {
    case "none":
      return { text: t("hub.perf.none"), tone: null };
    case "same":
      return { text: t("hub.perf.same"), tone: null };
    case "new":
      return {
        text: t("hub.perf.new", { delta: change.delta }),
        tone: "up",
      };
    case "change":
      return change.delta > 0
        ? { text: t("hub.perf.up", { percent: change.percent }), tone: "up" }
        : {
            text: t("hub.perf.down", { percent: Math.abs(change.percent) }),
            tone: "down",
          };
  }
}

const chartWidth = 300;
const chartHeight = 60;

export function Performance({
  businessId,
  figures,
  daily,
  periodDays,
  locale,
  live,
  t,
}: {
  businessId: string;
  figures: HubFigure[];
  daily: DailyActivityPoint[];
  periodDays: number;
  locale: Locale;
  live: boolean;
  t: Translator;
}) {
  const hasActivity =
    figures.some((figure) => figure.value > 0 || figure.previous > 0) ||
    daily.some((point) => point.views > 0);
  const totalViews = daily.reduce((sum, point) => sum + point.views, 0);
  const peak = daily.reduce<DailyActivityPoint | null>(
    (best, point) => (point.views > (best?.views ?? 0) ? point : best),
    null,
  );
  const max = Math.max(1, ...daily.map((point) => point.views));
  const slot = daily.length > 0 ? chartWidth / daily.length : chartWidth;
  const formatDay = (date: string) =>
    new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));

  return (
    <section className={styles.panel} aria-labelledby="hub-perf-heading">
      <p className="eyebrow">{t("hub.perf.eyebrow")}</p>
      <h2 id="hub-perf-heading">{t("hub.perf.title")}</h2>
      <p className={styles.lead}>
        {t("hub.perf.period", { days: periodDays })}
      </p>
      {hasActivity ? (
        <>
          <dl className={styles.figures}>
            {figures.map((figure) => {
              const change = changeText(
                t,
                describePeriodChange(figure.value, figure.previous),
              );
              return (
                <div className={styles.figure} key={figure.key}>
                  <dt>{t(figureLabel[figure.key])}</dt>
                  <dd>
                    <span className={styles.figureValue}>
                      {figure.value.toLocaleString(
                        LOCALE_DETAILS[locale].htmlLang,
                      )}
                    </span>
                    <span
                      className={`${styles.figureChange} ${
                        change.tone ? styles[change.tone] : ""
                      }`}
                    >
                      {change.text}
                    </span>
                  </dd>
                </div>
              );
            })}
          </dl>
          {daily.length > 0 && totalViews > 0 ? (
            <figure className={styles.chart}>
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={t("hub.perf.chartTitle")}
              >
                {daily.map((point, index) => {
                  const height = Math.max(
                    point.views > 0 ? 2 : 0.5,
                    (point.views / max) * (chartHeight - 2),
                  );
                  return (
                    <rect
                      key={point.date}
                      className={point.partial ? styles.barPartial : styles.bar}
                      x={index * slot + slot * 0.15}
                      y={chartHeight - height}
                      width={Math.max(1, slot * 0.7)}
                      height={height}
                      rx={1}
                    />
                  );
                })}
              </svg>
              <figcaption>
                {peak
                  ? t("hub.perf.chartSummary", {
                      total: totalViews,
                      days: periodDays,
                      peak: formatDay(peak.date),
                    })
                  : t("hub.perf.chartTitle")}
              </figcaption>
            </figure>
          ) : null}
        </>
      ) : (
        <div className={styles.empty} role="status">
          <strong>{t("hub.perf.emptyTitle")}</strong>
          <p>{live ? t("hub.perf.emptyBody") : t("hub.perf.notLive")}</p>
        </div>
      )}
      <p className={styles.more}>
        <Link
          href={
            `/dashboard/business/${businessId}/operations#analytics` as Route
          }
        >
          {t("hub.perf.seeAll")}
        </Link>
      </p>
    </section>
  );
}
