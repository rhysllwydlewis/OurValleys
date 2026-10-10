import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getPublicEvent } from "@/modules/events/public";
import { ReportForm } from "./report-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("report.eventMetaTitle"),
    robots: { index: false, follow: false },
  };
}

export default async function ReportEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const parsed = z.uuid().safeParse(eventId);
  if (!parsed.success) notFound();

  const result = await getPublicEvent(parsed.data);
  if (result.state !== "found") notFound();

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
          <Link href="/events">
            <span aria-hidden="true">← </span>
            {t("report.eventBack")}
          </Link>
        </nav>
        <section className="business-section" aria-labelledby="report-title">
          <p className="eyebrow">{t("report.eyebrowEvent")}</p>
          <h1 id="report-title">{result.event.title}</h1>
          <p className="lead">{t("report.lead")}</p>
          <ReportForm eventId={result.event.id} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
