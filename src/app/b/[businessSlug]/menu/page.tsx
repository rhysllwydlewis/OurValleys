import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BusinessMenu } from "@/components/business-menu";
import {
  BusinessSiteFooter,
  BusinessSiteHeader,
} from "@/components/business-site-chrome";
import siteStyles from "@/components/generated-business-website.module.css";
import menuStyles from "@/components/business-menu.module.css";
import { JsonLd } from "@/components/json-ld";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getSiteUrl } from "@/lib/site";
import { buildMenuJsonLd } from "@/lib/structured-data";
import { getAccent } from "@/modules/businesses/appearance";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import {
  getBusinessMenuDocument,
  listBusinessMenu,
} from "@/modules/businesses/content-features";
import { listBusinessMedia } from "@/modules/businesses/media";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { resolvePublishedBusinessRedirect } from "@/modules/businesses/public-operations";
import { PrintButton } from "../qr/print-button";

export const dynamic = "force-dynamic";

type Params = Promise<{ businessSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const [result, { t }] = await Promise.all([
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
  return {
    title: t("menu.public.metaTitle", { business: business.tradingName }),
    description: t("menu.public.metaDescription", {
      business: business.tradingName,
    }),
    alternates: { canonical: `${business.site.platformPath}/menu` },
    robots: business.isDemo
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export default async function BusinessMenuPage({ params }: { params: Params }) {
  const { businessSlug } = await params;
  const [result, { locale, t }] = await Promise.all([
    getPublishedBusinessBySlug(businessSlug),
    getTranslator(),
  ]);
  if (result.state === "missing") {
    // An approved slug change keeps old shared menu links working.
    const redirectSlug = await resolvePublishedBusinessRedirect(businessSlug);
    if (redirectSlug) permanentRedirect(`/b/${redirectSlug}/menu`);
  }
  if (result.state !== "ready") notFound();
  const { business } = result;
  const [groups, document, media, appearance] = await Promise.all([
    listBusinessMenu(business.id, true),
    getBusinessMenuDocument(business.id),
    listBusinessMedia(business.id),
    getBusinessAppearance(business.id),
  ]);
  const shown = groups.filter((group) => group.items.length > 0);
  // A business with no structured menu has nothing to show here.
  if (shown.length === 0) notFound();
  const dishes = shown.reduce((sum, group) => sum + group.items.length, 0);
  const accent = getAccent(appearance.accentKey);
  const siteStyle = {
    "--business-primary": accent.primary,
    "--business-strong": accent.strong,
    "--business-soft": accent.soft,
  } as CSSProperties;

  return (
    <div
      className={`${siteStyles.site} business-menu-page`}
      lang={LOCALE_DETAILS[locale].htmlLang}
      data-template={appearance.templateKey}
      style={siteStyle}
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
            {t("menu.public.back", { business: business.tradingName })}
          </Link>
        </nav>
        <header className={menuStyles.pageHeader}>
          <p className={siteStyles.eyebrow}>{t("site.menu.eyebrow")}</p>
          <h1>{t("menu.public.pageTitle")}</h1>
          <p className={menuStyles.pageMeta}>
            {dishes === 1
              ? t("menu.public.dishCountOne")
              : shown.length === 1
                ? t("menu.public.dishCountOneSection", { count: dishes })
                : t("menu.public.dishCount", {
                    count: dishes,
                    groups: shown.length,
                  })}
          </p>
          <div className={menuStyles.pageActions}>
            <PrintButton label={t("menu.public.print")} />
            {document?.url ? (
              <a
                className={siteStyles.outlineAction}
                href={document.url}
                target="_blank"
                rel="noreferrer"
              >
                {t("site.menu.open", { name: document.displayName })}
              </a>
            ) : null}
          </div>
        </header>
        <BusinessMenu groups={shown} t={t} variant="page" />
        <JsonLd
          data={buildMenuJsonLd(
            {
              businessName: business.tradingName,
              path: `/b/${business.slug}/menu`,
              isDemo: business.isDemo,
              groups: shown,
            },
            getSiteUrl().origin,
          )}
        />
      </main>
      <BusinessSiteFooter tradingName={business.tradingName} />
    </div>
  );
}
