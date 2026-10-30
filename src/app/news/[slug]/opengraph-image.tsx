import { getTranslator } from "@/lib/i18n/server";
import {
  pageShareImageContentType,
  pageShareImageSize,
  renderPageShareImage,
} from "@/lib/page-share-image";
import { getPublishedStoryBySlug } from "@/modules/stories/public";

export const alt = "OurValleys local news";
export const size = pageShareImageSize;
export const contentType = pageShareImageContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale } = await getTranslator();
  const story = await getPublishedStoryBySlug(slug, locale);
  return renderPageShareImage({
    eyebrow: story?.place?.name ?? "Rhondda Cynon Taf",
    title: story?.title ?? "OurValleys",
    summary: story?.summary,
  });
}
