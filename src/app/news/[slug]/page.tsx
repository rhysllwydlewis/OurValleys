import type { Metadata } from "next";
import { notFound } from "next/navigation";
import moreStyles from "./related.module.css";
import { JsonLd } from "@/components/json-ld";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StoryCards } from "@/components/stories/story-cards";
import { StoryArticle } from "@/components/stories/story-article";
import { buildStoryArticleLabels } from "@/components/stories/story-labels";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getPublicPageRobots } from "@/lib/release-stage";
import { getSiteUrl, pageUrlMetadata } from "@/lib/site";
import { buildBreadcrumbJsonLd } from "@/lib/structured-data";
import { buildStoryJsonLd } from "@/modules/stories/model";
import {
  getPublishedStoryBySlug,
  listRelatedStories,
} from "@/modules/stories/public";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const story = await getPublishedStoryBySlug(slug, locale);
  const title = story ? story.title : t("stories.notFoundTitle");
  const description = story ? story.summary : t("stories.notFoundDescription");
  return {
    title,
    description,
    robots: story ? getPublicPageRobots() : { index: false, follow: false },
    ...(story
      ? pageUrlMetadata(`/news/${encodeURIComponent(story.slug)}`, {
          title,
          description,
          locale: LOCALE_DETAILS[locale].openGraph,
        })
      : {}),
  };
}

export default async function StoryPage({ params }: PageProps) {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const story = await getPublishedStoryBySlug(slug, locale);
  if (!story) notFound();

  const related = await listRelatedStories(story, locale);
  const origin = getSiteUrl().origin;
  const contentLang = LOCALE_DETAILS[story.contentLocale].htmlLang;
  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <JsonLd
          data={buildBreadcrumbJsonLd(
            [
              { name: t("breadcrumb.home"), path: "/" },
              { name: t("nav.news"), path: "/news" },
              { name: story.title, path: `/news/${story.slug}` },
            ],
            origin,
          )}
        />
        <JsonLd data={buildStoryJsonLd(story, origin, contentLang)} />
        <StoryArticle
          story={story}
          labels={buildStoryArticleLabels(t, locale, story)}
          contentLang={contentLang}
          shareUrl={new URL(`/news/${story.slug}`, origin).toString()}
        />
        {related.length > 0 ? (
          <section
            className={moreStyles.more}
            aria-labelledby="more-stories-title"
            data-testid="related-stories"
          >
            <h2 id="more-stories-title">{t("stories.moreTitle")}</h2>
            <StoryCards stories={related} t={t} locale={locale} />
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </>
  );
}
