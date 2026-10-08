import { businessPermissions } from "@/modules/businesses/permissions";
import { getTranslator } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { hasPermission } from "./shared";
import type { Route } from "next";
import Link from "next/link";
import type { BusinessAnalyticsSummary } from "@/modules/businesses/analytics";
import {
  analyticsPeriodOptions,
  describePeriodChange,
  getBusinessAnalyticsSummary,
  getBusinessDailyActivity,
} from "@/modules/businesses/analytics";
import styles from "../operations.module.css";
import { TrendChart } from "./trend-chart";

// Labelled as clicks, not outcomes: these count a tracked link being
// clicked, not a call connecting, an email sending, or a booking/order
// completing. external_click also covers offer links, menu-document
// downloads and any other contact method (e.g. WhatsApp, website) that
// isn't one of the other five specific types, so it's labelled generically
// rather than as a specific channel.
const contactChannelTypes = [
  "call_click",
  "email_click",
  "directions_click",
  "external_click",
  "booking_click",
  "order_click",
] as const satisfies ReadonlyArray<keyof BusinessAnalyticsSummary["byType"]>;

function buildContactChannelBreakdown(
  t: Translator,
  byType: BusinessAnalyticsSummary["byType"],
): Array<[string, number]> {
  return contactChannelTypes
    .map(
      (type) =>
        [t(`ops.analytics.channel.${type}`), byType[type]] as [string, number],
    )
    .filter(([, count]) => count > 0);
}

function formatPeriodChange(
  t: Translator,
  current: number,
  previous: number,
): string {
  const change = describePeriodChange(current, previous);
  switch (change.kind) {
    case "none":
      return t("ops.analytics.none");
    case "new":
      return t("ops.analytics.upFromNone", { delta: change.delta });
    case "same":
      return t("ops.analytics.same");
    case "change":
      return t(change.delta > 0 ? "ops.analytics.up" : "ops.analytics.down", {
        percent: Math.abs(change.percent),
        delta: Math.abs(change.delta),
      });
  }
}

export async function AnalyticsSection({
  businessId,
  userId,
  businessSlug,
  periodDays,
}: {
  businessId: string;
  userId: string;
  businessSlug: string;
  periodDays: Parameters<typeof getBusinessAnalyticsSummary>[1];
}) {
  const i18n = await getTranslator();
  const { t } = i18n;
  const canAnalyticsPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.viewAnalytics,
  );
  const [analytics, dailySeries] = await Promise.all([
    getBusinessAnalyticsSummary(businessId, periodDays),
    getBusinessDailyActivity(businessId, periodDays),
  ]);
  const contactChannelBreakdown = buildContactChannelBreakdown(
    t,
    analytics.byType,
  );
  const canAnalytics = await canAnalyticsPromise;

  return (
    <section
      className={styles.section}
      id="analytics"
      aria-labelledby="analytics-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.phase", { n: 11 })}</p>
          <h2 id="analytics-title">{t("ops.analytics.title")}</h2>
        </div>
        <p className={styles.meta}>
          {t("ops.analytics.meta", { days: analytics.periodDays })}
        </p>
      </div>
      <nav
        className={styles.periodNav}
        aria-label={t("ops.analytics.periodAria")}
      >
        {analyticsPeriodOptions.map((days) => (
          <Link
            aria-current={days === analytics.periodDays ? "true" : undefined}
            className={styles.periodLink}
            href={
              `/dashboard/business/${businessId}/operations?period=${days}#analytics` as Route
            }
            key={days}
            scroll={false}
          >
            {t("ops.analytics.days", { days })}
          </Link>
        ))}
      </nav>
      {canAnalytics ? (
        <div className={styles.analytics}>
          <div className={styles.metric}>
            <strong>{analytics.totalViews}</strong>
            <span>{t("ops.analytics.views")}</span>
            <small className={styles.metricChange}>
              {formatPeriodChange(
                t,
                analytics.totalViews,
                analytics.previous.totalViews,
              )}
            </small>
          </div>
          <div className={styles.metric}>
            <strong>{analytics.searchAppearances}</strong>
            <span>{t("ops.analytics.appearances")}</span>
            <small className={styles.metricChange}>
              {formatPeriodChange(
                t,
                analytics.searchAppearances,
                analytics.previous.searchAppearances,
              )}
            </small>
          </div>
          <div className={styles.metric}>
            <strong>{analytics.contactActions}</strong>
            <span>{t("ops.analytics.contactUses")}</span>
            <small className={styles.metricChange}>
              {formatPeriodChange(
                t,
                analytics.contactActions,
                analytics.previous.contactActions,
              )}
            </small>
            {contactChannelBreakdown.length > 0 ? (
              <ul className={styles.analyticsBreakdown}>
                {contactChannelBreakdown.map(([label, count]) => (
                  <li className={styles.analyticsBreakdownItem} key={label}>
                    {label}: <strong>{count}</strong>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className={styles.metric}>
            <strong>{analytics.enquiries}</strong>
            <span>{t("ops.analytics.enquiries")}</span>
            <small className={styles.metricChange}>
              {formatPeriodChange(
                t,
                analytics.enquiries,
                analytics.previous.enquiries,
              )}
            </small>
          </div>
          <div className={styles.metric}>
            <strong>{analytics.qrVisits}</strong>
            <span>{t("ops.analytics.qr")}</span>
            <small className={styles.metricChange}>
              {formatPeriodChange(
                t,
                analytics.qrVisits,
                analytics.previous.qrVisits,
              )}
            </small>
          </div>
        </div>
      ) : (
        <p className={styles.empty}>{t("ops.analytics.noAccess")}</p>
      )}
      {canAnalytics ? <TrendChart series={dailySeries} i18n={i18n} /> : null}
      <div className={styles.toolbar}>
        <Link className="button" href={`/b/${businessSlug}/qr` as Route}>
          {t("ops.analytics.viewQr")}
        </Link>
        <Link className="button" href={`/b/${businessSlug}` as Route}>
          {t("ops.analytics.share")}
        </Link>
      </div>
    </section>
  );
}
