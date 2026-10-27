import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { QrCode } from "@/components/qr-code";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { translatorFor, type MessageKey } from "@/lib/i18n/translate";
import { getSiteUrl } from "@/lib/site";
import { isPublicDemoEmail } from "@/lib/public-demo-policy";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import { getTrafficSources } from "@/modules/businesses/insights";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import {
  buildShareResults,
  printKinds,
  shareChannels,
  shareHandOff,
  shareImageShapes,
  shareUrl,
} from "@/modules/businesses/share-kit-model";
import { DashboardTabs } from "../_hub/dashboard-tabs";
import hubStyles from "../_hub/hub.module.css";
import { readDashboardTabAccess } from "../_hub/tab-access";
import { ShareLinks, type ShareLinkItem } from "./share-links";
import styles from "./share.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("share.metaTitle"),
    robots: { index: false, follow: false },
  };
}

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

const resultsPeriodDays = 30;

export default async function BusinessSharePage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
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

  const isDemo = isPublicDemoEmail(session.user.email);
  const [canViewAnalytics, tabAccess, memberships] = await Promise.all([
    canUserAccessBusiness({
      userId: session.user.id,
      businessId: id,
      permission: businessPermissions.viewAnalytics,
    }),
    readDashboardTabAccess({
      userId: session.user.id,
      businessId: id,
      isPublicDemo: isDemo,
    }),
    listAccessibleBusinesses(session.user.id).catch(() => []),
  ]);
  const summary = memberships.find((item) => item.id === id);
  if (!summary) notFound();

  const result = await getPublishedBusinessBySlug(summary.slug);
  const tabs = (
    <DashboardTabs
      businessId={id}
      current="share"
      canDesign={tabAccess.canDesign}
      canOperate={tabAccess.canOperate}
      canContent={tabAccess.canContent}
    />
  );
  const header = (
    <>
      <nav className="business-breadcrumb" aria-label={t("dash.breadcrumb")}>
        <Link href={`/dashboard/business/${id}` as Route}>
          <span aria-hidden="true">← </span>
          {t("share.back")}
        </Link>
      </nav>
      <header className={hubStyles.header}>
        <div>
          <p className="eyebrow">{t("share.eyebrow")}</p>
          <h1>{t("share.title")}</h1>
          <p className="lead">
            <span lang="en-GB">{summary.tradingName}</span>
            {" · "}
            {t("share.lead")}
          </p>
        </div>
      </header>
      {tabs}
    </>
  );

  if (result.state !== "ready") {
    const unavailable = result.state === "unavailable";
    return (
      <>
        <SiteHeader />
        <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
          {header}
          {unavailable ? (
            <p className={styles.notice} data-tone="bad" role="alert">
              {t("share.pageUnavailable")}
            </p>
          ) : (
            <section className={styles.empty} aria-labelledby="share-notlive">
              <h2 id="share-notlive">{t("share.notLive.title")}</h2>
              <p>{t("share.notLive.body")}</p>
              <Link
                className="button primary"
                href={`/dashboard/business/${id}` as Route}
              >
                {t("share.notLive.cta")}
              </Link>
            </section>
          )}
        </main>
        <SiteFooter />
      </>
    );
  }

  const { business } = result;
  const base = getSiteUrl();
  const names = {
    en: translatorFor("en"),
    cy: translatorFor("cy"),
  };
  const captionParams = {
    business: business.tradingName,
    place: business.place.name,
  };
  const buildItem = (channel: (typeof shareChannels)[number] | "plain") => {
    const url = shareUrl(base, business.slug, channel);
    const messageFor = (code: "en" | "cy") =>
      names[code](`share.caption.${channel}` as MessageKey, captionParams);
    const subjectFor = (code: "en" | "cy") =>
      names[code]("share.subject", { business: business.tradingName });
    const handOffFor = (code: "en" | "cy") =>
      channel === "plain"
        ? null
        : (shareHandOff({
            channel,
            url,
            message: messageFor(code),
            subject: subjectFor(code),
          })?.href ?? null);
    const item: ShareLinkItem = {
      channel,
      name: t(
        `share.${channel === "plain" ? "link.plain" : `channel.${channel}`}.name` as MessageKey,
      ),
      hint: t(
        `share.${channel === "plain" ? "link.plain" : `channel.${channel}`}.hint` as MessageKey,
      ),
      url,
      message: { en: messageFor("en"), cy: messageFor("cy") },
      handOff: { en: handOffFor("en"), cy: handOffFor("cy") },
      handOffLabel:
        channel === "whatsapp" || channel === "facebook" || channel === "email"
          ? t(`share.open.${channel}` as MessageKey)
          : null,
    };
    return item;
  };
  const items = (["plain", ...shareChannels] as const).map(buildItem);
  const qrDestination = shareUrl(base, business.slug, "print");

  const allowedResults = canViewAnalytics && !isDemo;
  const breakdown = allowedResults
    ? await getTrafficSources(id, resultsPeriodDays)
    : null;
  const results = breakdown ? buildShareResults(breakdown) : null;
  const channelName = (source: string) =>
    t(`insights.source.${source}` as MessageKey);

  return (
    <>
      <SiteHeader />
      <main className={`dashboard-shell ${hubStyles.wide}`} lang={htmlLang}>
        {header}
        {isDemo ? (
          <p className={styles.notice} role="status">
            {t("share.demo")}
          </p>
        ) : null}

        <section className={styles.panel} aria-labelledby="share-links-title">
          <h2 id="share-links-title">{t("share.links.title")}</h2>
          <p className={styles.hint}>{t("share.links.lead")}</p>
          <ShareLinks items={items} />
        </section>

        <section className={styles.panel} aria-labelledby="share-print-title">
          <h2 id="share-print-title">{t("share.print.title")}</h2>
          <p className={styles.hint}>{t("share.print.lead")}</p>
          <div className={styles.qrRow}>
            <QrCode
              className={styles.qr}
              value={qrDestination}
              label={t("share.qr.alt", { business: business.tradingName })}
            />
            <div>
              <h3>{t("share.qr.title")}</h3>
              <p className={styles.hint}>{t("share.qr.lead")}</p>
              <a
                className="button"
                href={`/b/${business.slug}/qr/image?source=print`}
                download
              >
                {t("share.qr.download")}
              </a>
            </div>
          </div>
          <ul className={styles.sheetList}>
            {printKinds.map((kind) => {
              const sheet = t(`share.print.${kind}.name` as MessageKey);
              return (
                <li key={kind} className={styles.sheetCard}>
                  <h3>{sheet}</h3>
                  <p className={styles.hint}>
                    {t(`share.print.${kind}.body` as MessageKey)}
                  </p>
                  <div className={styles.copyRow}>
                    {(["en", "cy"] as const).map((code) => (
                      <a
                        key={code}
                        className="button"
                        href={`/dashboard/business/${id}/share/print/${kind}?lang=${code}`}
                        target="_blank"
                        rel="noopener"
                        lang={code === "cy" ? "cy" : "en-GB"}
                        aria-label={`${t("share.print.open", { sheet })}: ${t(code === "en" ? "share.lang.en" : "share.lang.cy")} (${t("share.print.opensNew")})`}
                      >
                        {names[code](
                          code === "en" ? "share.lang.en" : "share.lang.cy",
                        )}
                      </a>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={styles.panel} aria-labelledby="share-image-title">
          <h2 id="share-image-title">{t("share.image.title")}</h2>
          <p className={styles.hint}>{t("share.image.lead")}</p>
          <ul className={styles.imageList}>
            {(
              Object.keys(shareImageShapes) as (keyof typeof shareImageShapes)[]
            ).map((shape) => {
              const label = t(`share.image.${shape}` as MessageKey);
              const dimensions = shareImageShapes[shape];
              return (
                <li key={shape} className={styles.imageCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.imagePreview}
                    src={`/b/${business.slug}/share-image?shape=${shape}`}
                    alt={t("share.image.alt", {
                      shape: label,
                      business: business.tradingName,
                    })}
                    width={dimensions.width}
                    height={dimensions.height}
                    loading="lazy"
                    style={{
                      aspectRatio: `${dimensions.width} / ${dimensions.height}`,
                    }}
                  />
                  <a
                    className="button"
                    href={`/b/${business.slug}/share-image?shape=${shape}&download=1`}
                    download
                  >
                    {t("share.image.download", { shape: label })}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={styles.panel} aria-labelledby="share-results-title">
          <h2 id="share-results-title">{t("share.results.title")}</h2>
          <p className={styles.hint}>{t("share.results.lead")}</p>
          {!allowedResults ? (
            <p role="status">{t("share.results.denied")}</p>
          ) : results === null ? (
            <p className={styles.notice} data-tone="bad" role="alert">
              {t("share.results.unavailable")}
            </p>
          ) : results.shared === 0 ? (
            <p role="status">{t("share.results.empty")}</p>
          ) : (
            <>
              <p>
                {t("share.results.summary", {
                  shared: results.shared,
                  total: results.total,
                })}
                {results.best
                  ? ` ${t("share.results.best", { channel: channelName(results.best) })}`
                  : ""}
              </p>
              <table className={styles.table}>
                <caption className="sr-only">
                  {t("share.results.table")}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{t("share.results.channel")}</th>
                    <th scope="col">{t("share.results.visits")}</th>
                  </tr>
                </thead>
                <tbody>
                  {results.rows.map((row) => (
                    <tr key={row.source}>
                      <th scope="row">{channelName(row.source)}</th>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {allowedResults ? (
            <Link
              className="button"
              href={`/dashboard/business/${id}/insights` as Route}
            >
              {t("share.results.insights")}
            </Link>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
