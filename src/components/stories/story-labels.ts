import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import type { StoryArticleLabels } from "./story-article";

function formatDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "long",
    timeZone: "Europe/London",
  }).format(value);
}

/** Resolves the story article's reader-facing text for one language. */
export function buildStoryArticleLabels(
  t: Translator,
  locale: Locale,
  story: {
    authorName: string;
    place: { name: string } | null;
    publishedAt: Date | null;
    updatedAt: Date;
    readingMinutes: number;
    contentLocale: "en" | "cy";
  },
): StoryArticleLabels {
  const updatedLater =
    story.publishedAt !== null &&
    story.updatedAt.getTime() - story.publishedAt.getTime() > 24 * 3_600_000;
  return {
    eyebrow: t("stories.eyebrow"),
    by: t("stories.by", { name: story.authorName }),
    published: story.publishedAt
      ? t("stories.published", { date: formatDate(story.publishedAt, locale) })
      : null,
    updated: updatedLater
      ? t("stories.updated", { date: formatDate(story.updatedAt, locale) })
      : null,
    readingTime: t("stories.readingTime", {
      minutes: String(story.readingMinutes),
    }),
    sponsoredLabel: t("stories.sponsoredLabel"),
    // A Welsh reader of a story with no complete Welsh version is told so.
    englishOnly:
      locale === "cy" && story.contentLocale === "en"
        ? t("stories.englishOnly")
        : null,
    share: t("stories.share"),
    shareMessages: {
      shared: t("share.shared"),
      copied: t("share.copied"),
      cancelled: "",
      unavailable: t("share.unavailable"),
    },
    placeLink: story.place
      ? t("stories.placeLink", { place: story.place.name })
      : null,
    allNews: t("stories.allNews"),
  };
}
