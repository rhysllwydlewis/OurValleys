import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { SuggestionForm } from "./suggestion-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: t("suggest.metaTitle"),
    description: t("suggest.metaDescription"),
  };
}

export default async function SuggestBusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { locale, t } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const initialName = typeof q === "string" ? q.trim().slice(0, 120) : "";

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
            {t("suggest.back")}
          </Link>
        </nav>
        <section className="business-section" aria-labelledby="suggest-title">
          <p className="eyebrow">{t("suggest.eyebrow")}</p>
          <h1 id="suggest-title">{t("suggest.title")}</h1>
          <p className="lead">
            {t("suggest.leadBefore")}
            <Link href="/policies/privacy">{t("suggest.privacyLink")}</Link>.
          </p>
          <SuggestionForm initialName={initialName} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
