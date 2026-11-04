import { z } from "zod";
import { getTranslator } from "@/lib/i18n/server";
import {
  pageShareImageContentType,
  pageShareImageSize,
  renderPageShareImage,
} from "@/lib/page-share-image";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { getPublicBusinessUpdate } from "@/modules/businesses/public-updates";
import { updateExcerpt } from "@/modules/businesses/updates-model";

export const alt = "OurValleys business update";
export const size = pageShareImageSize;
export const contentType = pageShareImageContentType;

/** The share picture for one update: public text only, generic when it is not public. */
export default async function Image({
  params,
}: {
  params: Promise<{ businessSlug: string; updateId: string }>;
}) {
  const { businessSlug, updateId } = await params;
  const generic = () =>
    renderPageShareImage({ eyebrow: "Rhondda Cynon Taf", title: "OurValleys" });
  if (!z.uuid().safeParse(updateId).success) return generic();
  const [{ locale }, business] = await Promise.all([
    getTranslator(),
    getPublishedBusinessBySlug(businessSlug),
  ]);
  if (business.state !== "ready") return generic();
  const result = await getPublicBusinessUpdate({
    businessId: business.business.id,
    updateId,
    locale,
  });
  if (result.state !== "found") return generic();
  return renderPageShareImage({
    eyebrow: `${locale === "cy" ? "Diweddariad" : "Update"} · ${business.business.tradingName}`,
    title: result.update.title,
    summary: updateExcerpt(result.update.body, 150),
  });
}
