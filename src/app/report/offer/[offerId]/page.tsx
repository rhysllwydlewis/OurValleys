import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getPublicOffer } from "@/modules/businesses/public-offer-detail";
import { offerReportReasons } from "@/modules/moderation/content-reports";
import { ContentReportForm } from "../../content-report-form";
import { submitOfferReportAction } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("report.offerMetaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function ReportOfferPage({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  const parsed = z.uuid().safeParse(offerId);
  if (!parsed.success) notFound();

  const { locale, t } = await getTranslator();
  const result = await getPublicOffer(parsed.data, locale);
  // Only a live offer can be reported; one that has ended is not misleading
  // anyone any more.
  if (result.state !== "found" || result.offer.ended) notFound();
  const lang = LOCALE_DETAILS[locale].htmlLang;

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell" lang={lang}>
        <nav
          className="business-breadcrumb"
          aria-label={t("formsCommon.breadcrumb")}
        >
          <Link href={`/offers/${result.offer.id}`}>
            <span aria-hidden="true">← </span>
            {t("report.offerBack")}
          </Link>
        </nav>
        <section className="business-section" aria-labelledby="report-title">
          <p className="eyebrow">{t("report.eyebrowOffer")}</p>
          <h1
            id="report-title"
            lang={result.offer.welshTitle ? "cy-GB" : "en-GB"}
          >
            {result.offer.title}
          </h1>
          <p className="lead">{t("report.contentLead")}</p>
          <ContentReportForm
            reasons={offerReportReasons}
            reasonKeyPrefix="report.offerReason"
            submit={submitOfferReportAction.bind(null, result.offer.id)}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
