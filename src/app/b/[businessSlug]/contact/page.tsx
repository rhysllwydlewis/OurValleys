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
import { getPublicBusinessOperations } from "@/modules/businesses/public-operations";
import { getPublicReplyTimeLabel } from "@/modules/businesses/reply-time";
import { EnquiryForm } from "./enquiry-form";

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
        title: t("contactPage.metaTitle", {
          business: result.business.tradingName,
        }),
        description: t("contactPage.metaDescription", {
          business: result.business.tradingName,
        }),
        robots: { index: false, follow: true },
      }
    : {
        title: t("contactPage.metaNotFound"),
        robots: { index: false, follow: false },
      };
}

const replyKeys = {
  "Usually replies within a few hours": "contactPage.reply.within a few hours",
  "Usually replies within a day": "contactPage.reply.within a day",
  "Usually replies within a few days": "contactPage.reply.within a few days",
} as const;

export default async function BusinessContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { businessSlug } = await params;
  const [result, { locale, t }] = await Promise.all([
    getPublishedBusinessBySlug(businessSlug),
    getTranslator(),
  ]);
  if (result.state !== "ready") notFound();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const { business } = result;
  const operations = await getPublicBusinessOperations(business.id);
  const availableKinds = operations.contacts
    .map((contact) => contact.formKind)
    .filter((kind): kind is "enquiry" | "quote" | "callback" => Boolean(kind));
  if (availableKinds.length === 0) notFound();
  const { kind } = await searchParams;
  const defaultKind = availableKinds.includes(kind as never)
    ? (kind as "enquiry" | "quote" | "callback")
    : availableKinds[0]!;
  const [media, appearance, replyTime] = await Promise.all([
    listBusinessMedia(business.id),
    getBusinessAppearance(business.id),
    getPublicReplyTimeLabel(business.id),
  ]);
  const accent = getAccent(appearance.accentKey);
  const replyLabel = (label: string) =>
    label in replyKeys ? t(replyKeys[label as keyof typeof replyKeys]) : label;
  const siteStyle = {
    "--business-primary": accent.primary,
    "--business-strong": accent.strong,
    "--business-soft": accent.soft,
  } as CSSProperties;

  return (
    <div
      className={`${siteStyles.site} business-contact-page`}
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
      <main className="business-site-shell" id="business-content" lang={lang}>
        <nav
          className="business-breadcrumb"
          aria-label={t("formsCommon.breadcrumb")}
        >
          <Link href={`/b/${business.slug}`}>
            {t("contactPage.back", { business: business.tradingName })}
          </Link>
        </nav>
        <section
          className="business-section"
          aria-labelledby="contact-business-title"
        >
          <p className="eyebrow">{t("contactPage.eyebrow")}</p>
          <h1 id="contact-business-title">
            {t("contactPage.title", { business: business.tradingName })}
          </h1>
          <p className="lead">{t("contactPage.lead")}</p>
          {replyTime ? (
            <p className="trust-note" data-testid="reply-time">
              {t("contactPage.replyBasis", { label: replyLabel(replyTime) })}
            </p>
          ) : null}
          <EnquiryForm
            businessId={business.id}
            businessName={business.tradingName}
            defaultKind={defaultKind}
          />
        </section>
      </main>
      <BusinessSiteFooter tradingName={business.tradingName} />
    </div>
  );
}
