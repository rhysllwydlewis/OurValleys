import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import type { GuideArticleLabels } from "./guide-article";

function formatDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "long",
    timeZone: "Europe/London",
  }).format(value);
}

/** Resolves the article's reader-facing text for one language. */
export function buildGuideArticleLabels(
  t: Translator,
  locale: Locale,
  guide: {
    title: string;
    authorName: string;
    place: { name: string } | null;
    publishedAt: Date | null;
    updatedAt: Date;
  },
): GuideArticleLabels {
  const place = guide.place?.name ?? "";
  const updatedLater =
    guide.publishedAt !== null &&
    guide.updatedAt.getTime() - guide.publishedAt.getTime() > 24 * 3_600_000;
  return {
    eyebrow: t("guide.eyebrow"),
    by: t("guide.by", { name: guide.authorName }),
    contentsTitle: t("guidea.contentsTitle"),
    contentsAria: t("guidea.contentsAria"),
    part: t("guidea.part", { number: "{number}", total: "{total}" }),
    tip: t("guidea.tipLabel"),
    sponsoredLabel: t("guidea.sponsoredLabel"),
    published: guide.publishedAt
      ? t("guidea.published", { date: formatDate(guide.publishedAt, locale) })
      : null,
    updated: updatedLater
      ? t("guidea.updated", { date: formatDate(guide.updatedAt, locale) })
      : null,
    share: t("guidea.share"),
    shareMessages: {
      shared: t("share.shared"),
      copied: t("share.copied"),
      cancelled: "",
      unavailable: t("share.unavailable"),
    },
    backToTop: t("guidea.backToTop"),
    placeEyebrow: t("guidea.placeEyebrow"),
    placeTitle: t("guidea.placeTitle", { place }),
    placeBody: t("guidea.placeBody", { place }),
    placeLink: t("guidea.placeLink", { place }),
    relatedEyebrow: t("guidea.relatedEyebrow"),
    relatedTitle: t("guidea.relatedTitle"),
    ctaTitle: t("guidea.ctaTitle"),
    ctaBody: t("guidea.ctaBody"),
    ctaBusinesses: t("guidea.ctaBusinesses"),
    ctaEvents: t("guidea.ctaEvents"),
    browseAll: t("guide.browseAll"),
  };
}
