import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { authoredTextLang } from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  analyticsPeriodOptions,
  describePeriodChange,
  getBusinessAnalyticsSummary,
  getBusinessDailyActivity,
  parseAnalyticsPeriod,
  type DailyActivityPoint,
  type PeriodChange,
} from "@/modules/businesses/analytics";
import {
  getClickSurfaces,
  getTrafficSources,
  getVisitorEstimate,
} from "@/modules/businesses/insights";
import {
  buildFunnel,
  buildHighlights,
  buildWeekdayPattern,
  contactChannelTypes,
  contactRate,
  type Highlight,
} from "@/modules/businesses/insights-model";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { getBusinessLifecycleSummary } from "@/modules/businesses/publication";
import { readDashboardTabAccess } from "../_hub/tab-access";
import { DashboardTabs } from "../_hub/dashboard-tabs";
import hubStyles from "../_hub/hub.module.css";
import styles from "./insights.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("insights.metaTitle"),
    robots: { index: false, follow: false },
  };
}

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ period?: string }>;
};

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

function changeText(
  t: Translator,
  change: PeriodChange,
): { text: string; tone: "up" | "down" | null } {
  switch (change.kind) {
    case "none":
      return { text: t("insights.change.none"), tone: null };
    case "same":
      return { text: t("insights.change.same"), tone: null };
    case "new":
      return {
        text: t("insights.change.new", { delta: change.delta }),
        tone: "up",
      };
    case "change":
      return change.delta > 0
        ? {
            text: t("insights.change.up", { percent: change.percent }),
            tone: "up",
          }
        : {
            text: t("insights.change.down", {
              percent: Math.abs(change.percent),
            }),
            tone: "down",
          };
  }
}

const chartWidth = 300;
const chartHeight = 80;

function Bars({
  points,
  pick,
  label,
  accent,
}: {
  points: readonly DailyActivityPoint[];
  pick: (point: DailyActivityPoint) => number;
  label: string;
  accent?: boolean;
}) {
  const max = Math.max(1, ...points.map(pick));
  const slot = points.length > 0 ? chartWidth / points.length : chartWidth;
  return (
    <svg
      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <line
        className={styles.axis}
        x1={0}
        x2={chartWidth}
        y1={chartHeight - 0.25}
        y2={chartHeight - 0.25}
      />
      {points.map((point, index) => {
        const value = pick(point);
        const height =
          value === 0 ? 0 : Math.max(2, (value / max) * (chartHeight - 4));
        return (
          <rect
            key={point.date}
            className={
              accent
                ? styles.barAccent
                : point.partial
                  ? styles.barPartial
                  : styles.bar
            }
            x={index * slot + slot * 0.15}
            y={chartHeight - height}
            width={Math.max(0.8, slot * 0.7)}
            height={height}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

function highlightText(
  highlight: Highlight,
  t: Translator,
  weekdayName: (weekday: number) => string,
): string {
  switch (highlight.kind) {
    case "quiet":
      return t("insights.highlights.quiet");
    case "views":
      if (highlight.change.kind === "new") {
        return t("insights.highlight.views.new", {
          delta: highlight.change.delta,
        });
      }
      return highlight.change.kind === "change" && highlight.change.delta > 0
        ? t("insights.highlight.views.up", {
            percent: highlight.change.percent,
          })
        : t("insights.highlight.views.down", {
            percent:
              highlight.change.kind === "change"
                ? Math.abs(highlight.change.percent)
                : 0,
          });
    case "topSource":
      return t("insights.highlight.topSource", {
        source: t(`insights.source.${highlight.source}` as MessageKey),
        percent: highlight.percent,
      });
    case "busiestDay":
      return t("insights.highlight.busiestDay", {
        day: weekdayName(highlight.weekday),
      });
    case "topChannel":
      return t("insights.highlight.topChannel", {
        channel: t(`insights.channel.${highlight.channel}` as MessageKey),
        count: highlight.count,
      });
    case "contactRate":
      return t("insights.highlight.contactRate", {
        percent: highlight.percent,
      });
    case "noContact":
      return t("insights.highlight.noContact");
    case "noQr":
      return t("insights.highlight.noQr");
  }
}

function Meter({
  label,
  value,
  barPercent,
  valueText,
  accent,
}: {
  label: string;
  value: number;
  barPercent: number;
  valueText: string;
  accent?: boolean;
}) {
  return (
    <li className={styles.meterRow}>
      <div className={styles.meterHead}>
        <span>{label}</span>
        <strong>{valueText}</strong>
      </div>
      <div className={styles.meterTrack} aria-hidden="true">
        <span
          className={`${styles.meterFill} ${accent ? styles.meterFillAccent : ""}`}
          style={{ width: `${value === 0 ? 0 : barPercent}%` }}
        />
      </div>
    </li>
  );
}

export default async function BusinessInsightsPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, t } = await getTranslator();
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;
  const session = await readSession();
  if (!session) redirect("/login?next=/account");

  const { businessId } = await params;
  const parsedBusinessId = z.uuid().safeParse(businessId);
  if (!parsedBusinessId.success) notFound();
  const id = parsedBusinessId.data;

  const canView = await canUserAccessBusiness({
    userId: session.user.id,
    businessId: id,
    permission: businessPermissions.view,
  });
  if (!canView) notFound();

  const isPublicDemo = isPublicDemoEmail(session.user.email);
  const [canViewAnalytics, tabAccess, memberships, lifecycle] =
    await Promise.all([
      canUserAccessBusiness({
        userId: session.user.id,
        businessId: id,
        permission: businessPermissions.viewAnalytics,
      }),
      readDashboardTabAccess({
        userId: session.user.id,
        businessId: id,
        isPublicDemo,
      }),
      listAccessibleBusinesses(session.user.id).catch(() => []),
      getBusinessLifecycleSummary(id),
    ]);
  const summary = memberships.find((item) => item.id === id);
  if (!summary) notFound();
  const live = (lifecycle?.status ?? "draft") === "published";

  const { period } = await searchParams;
  const periodDays = parseAnalyticsPeriod(period);
  const allowed = canViewAnalytics && !isPublicDemo;

  // Nothing is read for a member whose role excludes analytics.
  const [totals, daily, sources, surfaces, visitors] = allowed
    ? await Promise.all([
        getBusinessAnalyticsSummary(id, periodDays),
        getBusinessDailyActivity(id, periodDays),
        getTrafficSources(id, periodDays),
        getClickSurfaces(id, periodDays),
        getVisitorEstimate(id, periodDays),
      ])
    : [null, [], [], [], null];

  const weekdayName = (weekday: number) =>
    new Intl.DateTimeFormat(htmlLang, {
      weekday: "long",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(2024, 0, 1 + weekday, 12)));
  const formatDay = (date: string) =>
    new Intl.DateTimeFormat(htmlLang, {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${date}T12:00:00Z`));
  const number = (value: number) => value.toLocaleString(htmlLang);

  const weekdays = buildWeekdayPattern(daily);
  const hasActivity =
    totals !== null &&
    (totals.totalViews > 0 ||
      totals.previous.totalViews > 0 ||
      totals.searchAppearances > 0 ||
      totals.contactActions + totals.enquiries > 0);
  const highlights =
    totals && hasActivity
      ? buildHighlights({ summary: totals, sources, weekdays })
      : [];
  const funnel = totals ? buildFunnel(totals) : [];
  const rate = totals
    ? contactRate(totals.totalViews, totals.contactActions, totals.enquiries)
    : null;
  const totalViewsShown = daily.reduce((sum, point) => sum + point.views, 0);
  const peak = daily.reduce<DailyActivityPoint | null>(
    (best, point) => (point.views > (best?.views ?? 0) ? point : best),
    null,
  );
  const hasContacts = daily.some(
    (point) => point.contactActions + point.enquiries > 0,
  );
  const channelRows = totals
    ? contactChannelTypes
        .map((channel) => ({ channel, count: totals.byType[channel] }))
        .filter((row) => row.count > 0)
        .sort((a, b) => b.count - a.count)
    : [];
  const channelMax = Math.max(
    1,
    totals?.enquiries ?? 0,
    ...channelRows.map((row) => row.count),
  );
  const surfaceMax = Math.max(1, ...surfaces.map((row) => row.count));
  const weekdayMax = Math.max(0, ...weekdays.map((row) => row.views));

  const kpiChange = (current: number, previous: number) =>
    changeText(t, describePeriodChange(current, previous));
  const kpis = totals
    ? [
        {
          key: "views",
          label: t("insights.kpi.views"),
          value: totals.totalViews,
          change: kpiChange(totals.totalViews, totals.previous.totalViews),
        },
        {
          key: "visitors",
          label: t("insights.kpi.visitors"),
          value: visitors?.visitors ?? 0,
          change: kpiChange(visitors?.visitors ?? 0, visitors?.previous ?? 0),
          note: t("insights.kpi.visitorsNote"),
        },
        {
          key: "searches",
          label: t("insights.kpi.searches"),
          value: totals.searchAppearances,
          change: kpiChange(
            totals.searchAppearances,
            totals.previous.searchAppearances,
          ),
        },
        {
          key: "contacts",
          label: t("insights.kpi.contacts"),
          value: totals.contactActions + totals.enquiries,
          change: kpiChange(
            totals.contactActions + totals.enquiries,
            totals.previous.contactActions + totals.previous.enquiries,
          ),
          note: t("insights.kpi.contactsNote"),
        },
        {
          key: "qr",
          label: t("insights.kpi.qr"),
          value: totals.qrVisits,
          change: kpiChange(totals.qrVisits, totals.previous.qrVisits),
        },
      ]
    : [];

  return (
    <>
      <SiteHeader />
      <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
        <nav className="business-breadcrumb" aria-label={t("dash.breadcrumb")}>
          <Link href={`/dashboard/business/${id}` as Route}>
            <span aria-hidden="true">← </span>
            {t("insights.back")}
          </Link>
        </nav>
        <header className={hubStyles.header}>
          <div>
            <p className="eyebrow">{t("insights.eyebrow")}</p>
            <h1>{t("insights.title")}</h1>
            <p className="lead">
              <span lang={authoredTextLang}>{summary.tradingName}</span>
              {" · "}
              {t("insights.lead")}
            </p>
          </div>
          {live ? (
            <div className={hubStyles.headerActions}>
              <Link className="button" href={`/b/${summary.slug}` as Route}>
                {t("insights.viewSite")}
              </Link>
            </div>
          ) : null}
        </header>
        <DashboardTabs
          businessId={id}
          current="insights"
          canDesign={tabAccess.canDesign}
          canOperate={tabAccess.canOperate}
        />

        {isPublicDemo ? (
          <p className={styles.notice} role="status">
            {t("insights.demo")}
          </p>
        ) : !canViewAnalytics ? (
          <p className={styles.notice} role="status">
            {t("insights.noAccess")}
          </p>
        ) : (
          <div className={styles.grid}>
            <div className={styles.toolbar}>
              <nav
                className={styles.periodNav}
                aria-label={t("insights.periodAria")}
              >
                {analyticsPeriodOptions.map((days) => (
                  <Link
                    key={days}
                    className={styles.periodLink}
                    aria-current={days === periodDays ? "true" : undefined}
                    href={
                      `/dashboard/business/${id}/insights?period=${days}` as Route
                    }
                  >
                    {t("insights.days", { days })}
                  </Link>
                ))}
              </nav>
              {hasActivity ? (
                <a
                  className="button"
                  href={`/dashboard/business/${id}/insights/export?period=${periodDays}`}
                >
                  {t("insights.export")}
                </a>
              ) : null}
            </div>

            {!hasActivity ? (
              <div className={styles.empty} role="status">
                <strong>{t("insights.empty.title")}</strong>
                <p>
                  {live
                    ? t("insights.empty.body")
                    : t("insights.empty.notLive")}
                </p>
                <div className={styles.emptyActions}>
                  {live ? (
                    <Link
                      className="button"
                      href={`/b/${summary.slug}/qr` as Route}
                    >
                      {t("insights.empty.qr")}
                    </Link>
                  ) : (
                    <Link
                      className="button"
                      href={`/dashboard/business/${id}` as Route}
                    >
                      {t("insights.empty.dashboard")}
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <>
                <section className={styles.panel} aria-labelledby="kpi-title">
                  <h2 id="kpi-title">{t("insights.kpi.title")}</h2>
                  <p className={styles.lead}>
                    {t("insights.period", { days: periodDays })}
                  </p>
                  <dl className={styles.kpis}>
                    {kpis.map((kpi) => (
                      <div className={styles.kpi} key={kpi.key}>
                        <dt>{kpi.label}</dt>
                        <dd>
                          <span className={styles.kpiValue}>
                            {number(kpi.value)}
                          </span>
                          <span
                            className={`${styles.kpiChange} ${
                              kpi.change.tone ? styles[kpi.change.tone] : ""
                            }`}
                          >
                            {kpi.change.text}
                          </span>
                          {"note" in kpi && kpi.note ? (
                            <span className={styles.kpiNote}>{kpi.note}</span>
                          ) : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>

                <section
                  className={styles.panel}
                  aria-labelledby="highlights-title"
                >
                  <h2 id="highlights-title">
                    {t("insights.highlights.title")}
                  </h2>
                  <ul className={styles.highlights}>
                    {highlights.map((highlight) => (
                      <li key={highlight.kind}>
                        {highlightText(highlight, t, weekdayName)}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className={styles.panel} aria-labelledby="trend-title">
                  <h2 id="trend-title">{t("insights.trend.title")}</h2>
                  <figure className={styles.chart}>
                    <Bars
                      points={daily}
                      pick={(point) => point.views}
                      label={t("insights.trend.chartLabel", {
                        title: t("insights.trend.title"),
                      })}
                    />
                    <figcaption>
                      {peak && peak.views > 0
                        ? t("insights.trend.summary", {
                            total: number(totalViewsShown),
                            days: periodDays,
                            peak: formatDay(peak.date),
                            views: number(peak.views),
                          })
                        : t("insights.trend.title")}
                      {daily[0]?.partial
                        ? ` ${t("insights.trend.partial")}`
                        : ""}
                    </figcaption>
                  </figure>
                  {hasContacts ? (
                    <>
                      <h3 className={styles.subTitle}>
                        {t("insights.trend.contactsTitle")}
                      </h3>
                      <figure className={styles.chart}>
                        <Bars
                          points={daily}
                          pick={(point) =>
                            point.contactActions + point.enquiries
                          }
                          label={t("insights.trend.chartLabel", {
                            title: t("insights.trend.contactsTitle"),
                          })}
                          accent
                        />
                      </figure>
                    </>
                  ) : null}
                  <details className={styles.details}>
                    <summary>{t("insights.trend.table")}</summary>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <caption>
                          {t("insights.trend.tableCaption", {
                            days: periodDays,
                          })}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">{t("insights.trend.col.date")}</th>
                            <th scope="col">{t("insights.trend.col.views")}</th>
                            <th scope="col">
                              {t("insights.trend.col.contacts")}
                            </th>
                            <th scope="col">
                              {t("insights.trend.col.enquiries")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...daily].reverse().map((point) => (
                            <tr key={point.date}>
                              <th scope="row">{formatDay(point.date)}</th>
                              <td>{number(point.views)}</td>
                              <td>{number(point.contactActions)}</td>
                              <td>{number(point.enquiries)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </section>

                <div className={styles.twoUp}>
                  <section
                    className={styles.panel}
                    aria-labelledby="sources-title"
                  >
                    <h2 id="sources-title">{t("insights.sources.title")}</h2>
                    <p className={styles.lead}>{t("insights.sources.lead")}</p>
                    {sources.length === 0 ? (
                      <p className={styles.note}>
                        {t("insights.sources.empty")}
                      </p>
                    ) : (
                      <ul className={styles.meter}>
                        {sources.map((row) => (
                          <Meter
                            key={row.source}
                            label={t(
                              `insights.source.${row.source}` as MessageKey,
                            )}
                            value={row.count}
                            barPercent={row.percent}
                            valueText={`${row.percent}% · ${t(
                              row.count === 1
                                ? "insights.source.count.one"
                                : "insights.source.count.other",
                              { count: number(row.count) },
                            )}`}
                          />
                        ))}
                      </ul>
                    )}
                  </section>

                  <section
                    className={styles.panel}
                    aria-labelledby="funnel-title"
                  >
                    <h2 id="funnel-title">{t("insights.funnel.title")}</h2>
                    <p className={styles.lead}>{t("insights.funnel.lead")}</p>
                    <ul className={styles.meter}>
                      {funnel.map((step) => (
                        <Meter
                          key={step.key}
                          label={t(`insights.funnel.${step.key}` as MessageKey)}
                          value={step.value}
                          barPercent={step.barPercent}
                          valueText={number(step.value)}
                          accent={step.key === "contacts"}
                        />
                      ))}
                    </ul>
                    <p className={styles.rate}>
                      {rate === null
                        ? t("insights.funnel.rateNone")
                        : t("insights.funnel.rate", { percent: rate })}
                    </p>
                  </section>
                </div>

                <div className={styles.twoUp}>
                  <section
                    className={styles.panel}
                    aria-labelledby="channels-title"
                  >
                    <h2 id="channels-title">{t("insights.channels.title")}</h2>
                    <p className={styles.lead}>{t("insights.channels.lead")}</p>
                    {channelRows.length === 0 && !totals?.enquiries ? (
                      <p className={styles.note}>
                        {t("insights.channels.empty")}
                      </p>
                    ) : (
                      <ul className={styles.meter}>
                        {channelRows.map((row) => (
                          <Meter
                            key={row.channel}
                            label={t(
                              `insights.channel.${row.channel}` as MessageKey,
                            )}
                            value={row.count}
                            barPercent={Math.round(
                              (row.count / channelMax) * 100,
                            )}
                            valueText={number(row.count)}
                          />
                        ))}
                        {totals && totals.enquiries > 0 ? (
                          <Meter
                            label={t("insights.channels.enquiries")}
                            value={totals.enquiries}
                            barPercent={Math.round(
                              (totals.enquiries / channelMax) * 100,
                            )}
                            valueText={number(totals.enquiries)}
                            accent
                          />
                        ) : null}
                      </ul>
                    )}
                    {surfaces.length > 0 ? (
                      <>
                        <h3 className={styles.subTitle}>
                          {t("insights.surfaces.title")}
                        </h3>
                        <ul className={styles.meter}>
                          {surfaces.map((row) => (
                            <Meter
                              key={row.surface}
                              label={t(
                                `insights.surface.${row.surface}` as MessageKey,
                              )}
                              value={row.count}
                              barPercent={Math.round(
                                (row.count / surfaceMax) * 100,
                              )}
                              valueText={number(row.count)}
                            />
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </section>

                  <section
                    className={styles.panel}
                    aria-labelledby="weekdays-title"
                  >
                    <h2 id="weekdays-title">{t("insights.weekdays.title")}</h2>
                    <p className={styles.lead}>{t("insights.weekdays.lead")}</p>
                    {weekdayMax === 0 ? (
                      <p className={styles.note}>
                        {t("insights.weekdays.empty")}
                      </p>
                    ) : (
                      <ul className={styles.meter}>
                        {weekdays.map((row) => (
                          <Meter
                            key={row.weekday}
                            label={weekdayName(row.weekday)}
                            value={row.views}
                            barPercent={row.barPercent}
                            valueText={number(row.views)}
                          />
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              </>
            )}

            <section
              className={`${styles.panel} ${styles.privacy}`}
              aria-labelledby="privacy-title"
            >
              <h2 id="privacy-title">{t("insights.privacy.title")}</h2>
              <p>{t("insights.privacy.body")}</p>
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
