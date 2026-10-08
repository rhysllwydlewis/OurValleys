import { businessPermissions } from "@/modules/businesses/permissions";
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
const contactChannelLabelBases: Partial<
  Record<keyof BusinessAnalyticsSummary["byType"], string>
> = {
  call_click: "call",
  email_click: "email",
  directions_click: "direction",
  external_click: "other link",
  booking_click: "booking",
  order_click: "order",
};

function buildContactChannelBreakdown(
  byType: BusinessAnalyticsSummary["byType"],
): Array<[string, number]> {
  return (
    Object.entries(contactChannelLabelBases) as Array<
      [keyof BusinessAnalyticsSummary["byType"], string]
    >
  )
    .map(
      ([type, base]) =>
        [`${base} click${byType[type] === 1 ? "" : "s"}`, byType[type]] as [
          string,
          number,
        ],
    )
    .filter(([, count]) => count > 0);
}

function formatPeriodChange(current: number, previous: number): string {
  const change = describePeriodChange(current, previous);
  switch (change.kind) {
    case "none":
      return "No activity in either period";
    case "new":
      return `Up from none (+${change.delta})`;
    case "same":
      return "Same as the previous period";
    case "change":
      return `${change.delta > 0 ? "Up" : "Down"} ${Math.abs(change.percent)}% (${
        change.delta > 0 ? "+" : "−"
      }${Math.abs(change.delta)}) on the previous period`;
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
          <p className="eyebrow">Phase 11</p>
          <h2 id="analytics-title">Promotion and insight</h2>
        </div>
        <p className={styles.meta}>
          Simple aggregate counts for the last {analytics.periodDays} days,
          compared with the {analytics.periodDays} days before. Counts can
          include some automated visits.
        </p>
      </div>
      <nav className={styles.periodNav} aria-label="Insight period">
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
            {days} days
          </Link>
        ))}
      </nav>
      {canAnalytics ? (
        <div className={styles.analytics}>
          <div className={styles.metric}>
            <strong>{analytics.totalViews}</strong>
            <span>website views</span>
            <small className={styles.metricChange}>
              {formatPeriodChange(
                analytics.totalViews,
                analytics.previous.totalViews,
              )}
            </small>
          </div>
          <div className={styles.metric}>
            <strong>{analytics.searchAppearances}</strong>
            <span>search appearances</span>
            <small className={styles.metricChange}>
              {formatPeriodChange(
                analytics.searchAppearances,
                analytics.previous.searchAppearances,
              )}
            </small>
          </div>
          <div className={styles.metric}>
            <strong>{analytics.contactActions}</strong>
            <span>contact-button uses</span>
            <small className={styles.metricChange}>
              {formatPeriodChange(
                analytics.contactActions,
                analytics.previous.contactActions,
              )}
            </small>
            {contactChannelBreakdown.length > 0 ? (
              <ul className={styles.analyticsBreakdown}>
                {contactChannelBreakdown.map(([label, count]) => (
                  <li className={styles.analyticsBreakdownItem} key={label}>
                    <strong>{count}</strong> {label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className={styles.metric}>
            <strong>{analytics.enquiries}</strong>
            <span>enquiries</span>
            <small className={styles.metricChange}>
              {formatPeriodChange(
                analytics.enquiries,
                analytics.previous.enquiries,
              )}
            </small>
          </div>
          <div className={styles.metric}>
            <strong>{analytics.qrVisits}</strong>
            <span>QR visits</span>
            <small className={styles.metricChange}>
              {formatPeriodChange(
                analytics.qrVisits,
                analytics.previous.qrVisits,
              )}
            </small>
          </div>
        </div>
      ) : (
        <p className={styles.empty}>Your membership cannot view analytics.</p>
      )}
      {canAnalytics ? <TrendChart series={dailySeries} /> : null}
      <div className={styles.toolbar}>
        <Link className="button" href={`/b/${businessSlug}/qr` as Route}>
          View or print QR code
        </Link>
        <Link className="button" href={`/b/${businessSlug}` as Route}>
          Share website
        </Link>
      </div>
    </section>
  );
}
