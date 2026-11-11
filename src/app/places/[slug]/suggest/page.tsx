import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getPlaceBySlug } from "@/modules/reference-data/places";
import { PlaceSuggestForm } from "./suggest-form";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const selected = await getPlaceBySlug(slug);
  if (!selected) return { title: t("placeSuggest.notFoundPageTitle") };
  const name = (locale === "cy" && selected.welshName) || selected.name;
  return {
    title: t("placeSuggest.metaTitle", { name }),
    description: t("placeSuggest.metaDescription", { name }),
    // A form, not content: keep it out of search results.
    robots: { index: false, follow: true },
  };
}

export default async function SuggestPlaceChangePage({ params }: PageProps) {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const selected = await getPlaceBySlug(slug);
  if (!selected) notFound();
  const name = (locale === "cy" && selected.welshName) || selected.name;

  return (
    <>
      <SiteHeader />
      <main className="business-site-shell" lang={lang}>
        <nav
          className="business-breadcrumb"
          aria-label={t("formsCommon.breadcrumb")}
        >
          <Link href={`/places/${selected.slug}` as Route}>
            <span aria-hidden="true">← </span>
            {t("placeSuggest.back", { name })}
          </Link>
        </nav>
        <section
          className="business-section"
          aria-labelledby="place-suggest-title"
        >
          <p className="eyebrow">{t("placeSuggest.eyebrow", { name })}</p>
          <h1 id="place-suggest-title">{t("placeSuggest.title", { name })}</h1>
          <p className="lead">{t("placeSuggest.lead")}</p>
          <PlaceSuggestForm placeSlug={selected.slug} />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
