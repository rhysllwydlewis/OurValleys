import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import {
  pageShareImageContentType,
  pageShareImageSize,
  renderPageShareImage,
} from "@/lib/page-share-image";
import { getPublicEvent } from "@/modules/events/public";

export const alt = "OurValleys local event";
export const size = pageShareImageSize;
export const contentType = pageShareImageContentType;

/** The share picture for one event: public text only, generic when it is not public. */
export default async function Image({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { locale } = await getTranslator();
  const result = await getPublicEvent(eventId, locale);
  if (result.state !== "found") {
    return renderPageShareImage({
      eyebrow: "Rhondda Cynon Taf",
      title: "OurValleys",
    });
  }
  const { event } = result;
  const when = new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(event.startsAt);
  return renderPageShareImage({
    eyebrow: `${locale === "cy" ? "Digwyddiad lleol" : "Local event"} · ${when}`,
    title: event.title,
    summary: [event.businessName, event.locationDisplay]
      .filter(Boolean)
      .join(" · "),
  });
}
