import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  BusinessSiteFooter,
  BusinessSiteHeader,
} from "@/components/business-site-chrome";
import { businessSiteTheme } from "@/components/business-site-theme";
import { FeedCopyButton } from "@/components/feed-copy-button";
import siteStyles from "@/components/generated-business-website.module.css";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getSiteUrl, pageUrlMetadata } from "@/lib/site";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import { listBusinessMedia } from "@/modules/businesses/media";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { resolvePublishedBusinessRedirect } from "@/modules/businesses/public-operations";
import { listPublicOffers } from "@/modules/businesses/public-offers";
import { listBusinessUpdates } from "@/modules/businesses/public-updates";
import { listPublicEvents } from "@/modules/events/public";
import { buildFollowOptions } from "@/modules/syndication/follow-options";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type Params = Promise<{ businessSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const [result, { locale, t }] = await Promise.all([
    getPublishedBusinessBySlug(businessSlug),
    getTranslator(),
  ]);
  if (result.state !== "ready") {
    return {
      title: t("site.page.metaUnavailable"),
      robots: { index: false, follow: false },
    };
  }
  const { business } = result;
  const title = t("followbiz.metaTitle", { business: business.tradingName });
  const description = t("followbiz.metaDescription", {
    business: business.tradingName,
  });
  const base = pageUrlMetadata(`${business.site.platformPath}/follow`, {
    title,
    description,
    locale: LOCALE_DETAILS[locale].openGraph,
  });
  // A utility page: reachable and followable, but not worth a search result.
  return {
    title,
    description,
    alternates: base.alternates,
    openGraph: base.openGraph,
    robots: { index: false, follow: true },
  };
}

export default async function FollowBusinessPage({
  params,
}: {
  params: Params;
}) {
  const { businessSlug } = await params;
  const [result, { locale, t }] = await Promise.all([
    getPublishedBusinessBySlug(businessSlug),
    getTranslator(),
  ]);
  if (result.state === "missing") {
    const redirectSlug = await resolvePublishedBusinessRedirect(businessSlug);
    if (redirectSlug) permanentRedirect(`/b/${redirectSlug}/follow`);
  }
  if (result.state !== "ready") notFound();
  const { business } = result;

  const [media, appearance, updates, offers, events] = await Promise.all([
    listBusinessMedia(business.id),
    getBusinessAppearance(business.id),
    listBusinessUpdates({ businessId: business.id, locale: "en", limit: 1 }),
    listPublicOffers({ business: business.slug, pageSize: 1 }),
    listPublicEvents({ business: business.slug, pageSize: 1 }),
  ]);
  const theme = businessSiteTheme(appearance);
  const options = buildFollowOptions({
    origin: getSiteUrl().origin,
    slug: business.slug,
    counts: {
      updates: updates.unavailable ? null : updates.total,
      offers: offers.state === "ready" ? offers.total : null,
      events: events.state === "ready" ? events.total : null,
    },
  });
  const countText = (count: number | null) => {
    if (count === null) return t("followbiz.count.unknown");
    if (count === 0) return t("followbiz.count.none");
    return count === 1
      ? t("followbiz.count.one")
      : t("followbiz.count.many", { count });
  };

  return (
    <div
      className={`${siteStyles.site} business-follow-page`}
      lang={LOCALE_DETAILS[locale].htmlLang}
      {...theme.attributes}
      style={theme.style}
    >
      <BusinessSiteHeader
        tradingName={business.tradingName}
        logo={media.logo}
        sections={[]}
        primaryAction={null}
        homeHref={`/b/${business.slug}`}
      />
      <main className="business-site-shell" id="business-content">
        <nav
          className="business-breadcrumb"
          aria-label={t("formsCommon.breadcrumb")}
        >
          <Link href={`/b/${business.slug}`}>
            {t("followbiz.back", { business: business.tradingName })}
          </Link>
        </nav>
        <header className={styles.header}>
          <p className={siteStyles.eyebrow}>{t("followbiz.eyebrow")}</p>
          <h1>{t("followbiz.title", { business: business.tradingName })}</h1>
          <p className={styles.lead}>
            {t("followbiz.lead", { business: business.tradingName })}
          </p>
        </header>
        <ul className={styles.list}>
          {options.map((option) => {
            const title = t(`followbiz.${option.kind}.title`);
            const inputId = `follow-address-${option.kind}`;
            return (
              <li key={option.kind} className={styles.card}>
                <h2>{title}</h2>
                <p>{t(`followbiz.${option.kind}.body`)}</p>
                <p className={styles.count}>{countText(option.count)}</p>
                <label className="sr-only" htmlFor={inputId}>
                  {t("followbiz.addressLabel", { kind: title })}
                </label>
                <input
                  id={inputId}
                  className={styles.address}
                  type="text"
                  readOnly
                  value={option.address}
                  dir="ltr"
                />
                <div className={styles.actions}>
                  <FeedCopyButton
                    address={option.address}
                    label={t("followbiz.copy")}
                    copiedMessage={t("followbiz.copied")}
                    failedMessage={t("followbiz.copyFailed")}
                  />
                  {option.subscribeHref ? (
                    <a className="button primary" href={option.subscribeHref}>
                      {t("followbiz.subscribe")}
                    </a>
                  ) : null}
                  <a className="button secondary" href={option.path}>
                    {t("followbiz.open")}
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
        <section className={styles.help} aria-labelledby="follow-help">
          <h2 id="follow-help">{t("followbiz.helpTitle")}</h2>
          <p>{t("followbiz.helpBody")}</p>
        </section>
        <section className={styles.help} aria-labelledby="follow-account">
          <h2 id="follow-account">{t("followbiz.accountTitle")}</h2>
          <p>{t("followbiz.accountBody")}</p>
          <p>
            <Link href="/account/following">{t("followbiz.accountLink")}</Link>
          </p>
        </section>
      </main>
      <BusinessSiteFooter tradingName={business.tradingName} />
    </div>
  );
}
