import { getTranslator } from "@/lib/i18n/server";
import { getPublicGuideBySlug } from "@/modules/guides/public";
import {
  pageShareImageContentType,
  pageShareImageSize,
  renderPageShareImage,
} from "@/lib/page-share-image";

export const alt = "OurValleys local guide";
export const size = pageShareImageSize;
export const contentType = pageShareImageContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale } = await getTranslator();
  const guide = await getPublicGuideBySlug(slug, locale);
  return renderPageShareImage({
    eyebrow: guide?.area || "Rhondda Cynon Taf",
    title: guide?.title ?? "OurValleys",
    summary: guide?.summary,
  });
}
