import { getTranslator } from "@/lib/i18n/server";
import {
  pageShareImageContentType,
  pageShareImageSize,
  renderPageShareImage,
} from "@/lib/page-share-image";
import { getPublicOffer } from "@/modules/businesses/public-offer-detail";

export const alt = "OurValleys local offer";
export const size = pageShareImageSize;
export const contentType = pageShareImageContentType;

/** The share picture for one offer: public text only, generic when it is not public. */
export default async function Image({
  params,
}: {
  params: Promise<{ offerId: string }>;
}) {
  const { offerId } = await params;
  const { locale } = await getTranslator();
  const result = await getPublicOffer(offerId, locale);
  if (result.state !== "found" || result.offer.ended) {
    return renderPageShareImage({
      eyebrow: "Rhondda Cynon Taf",
      title: "OurValleys",
    });
  }
  const { offer } = result;
  return renderPageShareImage({
    eyebrow: `${locale === "cy" ? "Cynnig lleol" : "Local offer"} · ${offer.placeName}`,
    title: offer.title,
    summary: offer.businessName,
  });
}
