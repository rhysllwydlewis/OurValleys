import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BusinessSiteFooter,
  BusinessSiteHeader,
} from "@/components/business-site-chrome";
import siteStyles from "@/components/generated-business-website.module.css";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getAccent } from "@/modules/businesses/appearance";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import { listBusinessMedia } from "@/modules/businesses/media";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const [result, { t }] = await Promise.all([
    getPublishedBusinessBySlug(businessSlug),
    getTranslator(),
  ]);
  return result.state === "ready"
    ? {
        title: t("qr.metaTitle", { business: result.business.tradingName }),
        robots: { index: false, follow: false },
      }
    : {
        title: t("qr.metaUnavailable"),
        robots: { index: false, follow: false },
      };
}

export default async function BusinessQrPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const [result, { locale, t }] = await Promise.all([
    getPublishedBusinessBySlug(businessSlug),
    getTranslator(),
  ]);
  if (result.state !== "ready") notFound();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const { business } = result;
  const imageUrl = `/b/${business.slug}/qr/image`;
  const [media, appearance] = await Promise.all([
    listBusinessMedia(business.id),
    getBusinessAppearance(business.id),
  ]);
  const accent = getAccent(appearance.accentKey);
  const siteStyle = {
    "--business-primary": accent.primary,
    "--business-strong": accent.strong,
    "--business-soft": accent.soft,
  } as CSSProperties;

  return (
    <div
      className={`${siteStyles.site} business-qr-page`}
      lang={lang}
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
            {t("contactPage.back", { business: business.tradingName })}
          </Link>
        </nav>
        <section className="state-panel" aria-labelledby="qr-title">
          <p className="eyebrow">{t("qr.eyebrow")}</p>
          <h1 id="qr-title">
            {t("qr.title", { business: business.tradingName })}
          </h1>
          <p>{t("qr.body")}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={t("qr.alt", { business: business.tradingName })}
            width="360"
            height="360"
          />
          <div className="tag-row">
            <a className="button primary" href={imageUrl} download>
              {t("qr.download")}
            </a>
            <PrintButton label={t("qr.print")} />
          </div>
          <p className="field-hint">{t("qr.hint")}</p>
        </section>
      </main>
      <BusinessSiteFooter tradingName={business.tradingName} />
    </div>
  );
}
