import { getPlaceBySlug } from "@/modules/reference-data/places";
import {
  pageShareImageContentType,
  pageShareImageSize,
  renderPageShareImage,
} from "@/lib/page-share-image";

export const alt = "OurValleys place guide";
export const size = pageShareImageSize;
export const contentType = pageShareImageContentType;

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const place = await getPlaceBySlug(slug);
  return renderPageShareImage({
    eyebrow: "Rhondda Cynon Taf",
    title: place?.name ?? "OurValleys",
    summary: place?.editorialSummary,
  });
}
