import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideArticle } from "@/components/guides/guide-article";
import { buildGuideArticleLabels } from "@/components/guides/guide-article-labels";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getSiteUrl, pageUrlMetadata } from "@/lib/site";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { getPublicPageRobots } from "@/lib/release-stage";
import { buildGuideJsonLd } from "@/modules/guides/guide-model";
import { guideContentLang } from "@/modules/guides/welsh";
import {
  getPublicGuideBySlug,
  listRelatedGuideCards,
} from "@/modules/guides/public";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const guide = await getPublicGuideBySlug(slug, locale);
  const title = guide ? guide.title : t("guide.notFoundTitle");
  const description = guide ? guide.summary : t("guide.notFoundDescription");

  return {
    title,
    description,
    robots: guide ? getPublicPageRobots() : { index: false, follow: false },
    ...(guide
      ? pageUrlMetadata(`/guides/${encodeURIComponent(slug)}`, {
          title,
          description,
          locale: LOCALE_DETAILS[locale].openGraph,
        })
      : {}),
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const guide = await getPublicGuideBySlug(slug, locale);
  if (!guide) notFound();
  const contentLang = guideContentLang(guide.contentLocale);

  const origin = getSiteUrl().origin;
  const related = (
    await listRelatedGuideCards(
      { slug: guide.slug, area: guide.area, placeId: guide.placeId },
      3,
      locale,
    )
  ).map((card) => ({ ...card, lang: guideContentLang(card.contentLocale) }));
  const labels = buildGuideArticleLabels(t, locale, guide);

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <JsonLd
          data={buildBreadcrumbJsonLd(
            [
              { name: t("breadcrumb.home"), path: "/" },
              { name: t("nav.guides"), path: "/guides" },
              { name: guide.title, path: `/guides/${guide.slug}` },
            ],
            origin,
          )}
        />
        <JsonLd data={buildGuideJsonLd(guide, origin, contentLang)} />
        <GuideArticle
          guide={guide}
          // A complete Welsh version needs no "English only" notice.
          labels={{
            ...labels,
            englishOnly:
              guide.contentLocale === "cy" ? null : labels.englishOnly,
          }}
          lang={lang}
          contentLang={contentLang}
          related={related}
          shareUrl={new URL(`/guides/${guide.slug}`, origin).toString()}
        />
      </main>
      <SiteFooter />
    </>
  );
}
