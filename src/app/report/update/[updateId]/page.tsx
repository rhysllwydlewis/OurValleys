import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getReportableUpdate } from "@/modules/businesses/public-updates";
import { updateReportReasons } from "@/modules/moderation/content-reports";
import { ContentReportForm } from "../../content-report-form";
import { submitUpdateReportAction } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("report.updateMetaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function ReportUpdatePage({
  params,
}: {
  params: Promise<{ updateId: string }>;
}) {
  const { updateId } = await params;
  const parsed = z.uuid().safeParse(updateId);
  if (!parsed.success) notFound();

  const update = await getReportableUpdate(parsed.data);
  if (!update) notFound();

  const { locale, t } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell" lang={lang}>
        <nav
          className="business-breadcrumb"
          aria-label={t("formsCommon.breadcrumb")}
        >
          <Link href={`/b/${update.businessSlug}/updates`}>
            <span aria-hidden="true">← </span>
            {t("report.updateBack", { business: update.businessName })}
          </Link>
        </nav>
        <section className="business-section" aria-labelledby="report-title">
          <p className="eyebrow">{t("report.eyebrowUpdate")}</p>
          <h1 id="report-title" lang="en-GB">
            {update.title}
          </h1>
          <p className="lead">{t("report.contentLead")}</p>
          <ContentReportForm
            reasons={updateReportReasons}
            reasonKeyPrefix="report.updateReason"
            submit={submitUpdateReportAction.bind(null, update.id)}
          />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
