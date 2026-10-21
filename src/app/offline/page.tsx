import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { RetryButton } from "./retry-button";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("offline.metaTitle"), robots: { index: false } };
}

export default async function OfflinePage() {
  const { locale, t } = await getTranslator();
  return (
    <>
      <SiteHeader />
      <main className="page-shell" lang={LOCALE_DETAILS[locale].htmlLang}>
        <section className="state-panel">
          <p className="eyebrow">{t("offline.eyebrow")}</p>
          <h1>{t("offline.title")}</h1>
          <p>{t("offline.body")}</p>
          <div className="actions">
            <RetryButton label={t("offline.retry")} />
            <Link className="button" href="/">
              {t("notFound.home")}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
