import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideArticle } from "@/components/guides/guide-article";
import { buildGuideArticleLabels } from "@/components/guides/guide-article-labels";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getSiteUrl } from "@/lib/site";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { getPublicPageRobots } from "@/lib/release-stage";
import { buildGuideJsonLd } from "@/modules/guides/guide-model";
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
  const { t } = await getTranslator();
  const guide = await getPublicGuideBySlug(slug);

  return {
    title: guide ? guide.title : t("guide.notFoundTitle"),
    description: guide ? guide.summary : t("guide.notFoundDescription"),
    robots: guide ? getPublicPageRobots() : { index: false, follow: false },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const guide = await getPublicGuideBySlug(slug);
  if (!guide) notFound();

  const origin = getSiteUrl().origin;
  const related = await listRelatedGuideCards({
    slug: guide.slug,
    area: guide.area,
    placeId: guide.placeId,
  });

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
        <JsonLd data={buildGuideJsonLd(guide, origin, "en-GB")} />
        <GuideArticle
          guide={guide}
          labels={buildGuideArticleLabels(t, locale, guide)}
          lang={lang}
          related={related}
          shareUrl={new URL(`/guides/${guide.slug}`, origin).toString()}
        />
      </main>
      <SiteFooter />
    </>
  );
}
