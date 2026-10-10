import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("notFound.metaTitle") };
}

export default async function NotFound() {
  const { locale, t } = await getTranslator();
  return (
    <>
      <SiteHeader />
      <main className="page-shell" lang={LOCALE_DETAILS[locale].htmlLang}>
        <section className="state-panel">
          <p className="eyebrow">{t("notFound.eyebrow")}</p>
          <h1>{t("notFound.title")}</h1>
          <p>{t("notFound.body")}</p>
          <div className="actions">
            <Link className="button primary" href="/">
              {t("notFound.home")}
            </Link>
            <Link className="button" href="/businesses">
              {t("notFound.browse")}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
