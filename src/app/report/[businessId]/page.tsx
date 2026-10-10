import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getBusinessIdentityById } from "@/modules/businesses/public";
import { ReportForm } from "./report-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("report.businessMetaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function ReportBusinessPage({
  params,
}: {
  params: Promise<{ businessId: string }>;
}) {
  const { businessId } = await params;
  const parsed = z.uuid().safeParse(businessId);
  if (!parsed.success) notFound();

  const identity = await getBusinessIdentityById(parsed.data);
  if (!identity) notFound();

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
          <Link href="/businesses">
            <span aria-hidden="true">← </span>
            {t("report.businessBack")}
          </Link>
        </nav>
        <section className="business-section" aria-labelledby="report-title">
          <p className="eyebrow">{t("report.eyebrowBusiness")}</p>
          <h1 id="report-title">{identity.tradingName}</h1>
          <p className="lead">{t("report.lead")}</p>
          <ReportForm businessId={identity.id} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
