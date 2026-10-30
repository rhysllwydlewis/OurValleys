import type { Route } from "next";
import Link from "next/link";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import type { PublicStory } from "@/modules/stories/public";
import styles from "./latest-stories.module.css";

/**
 * A grid of story cards. Shared by the news block, the archive, the homepage,
 * place pages and "more stories", so a story always looks the same and a
 * sponsored one is always labelled. `level` is the heading level of each title
 * and must sit one below the section heading that contains the list.
 */
export function StoryCards({
  stories,
  t,
  locale,
  level = 3,
  showPlace = true,
}: {
  stories: readonly PublicStory[];
  t: Translator;
  locale: Locale;
  level?: 2 | 3 | 4;
  showPlace?: boolean;
}) {
  const dateFormat = new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "medium",
    timeZone: "Europe/London",
  });
  const Heading = `h${level}` as const;
  return (
    <ul className={styles.list}>
      {stories.map((story) => {
        const lang = LOCALE_DETAILS[story.contentLocale].htmlLang;
        return (
          <li key={story.slug} className={styles.card}>
            <p className={styles.meta}>
              {story.publishedAt ? (
                <time dateTime={story.publishedAt.toISOString()}>
                  {dateFormat.format(story.publishedAt)}
                </time>
              ) : null}
              {showPlace && story.place ? (
                <span>{story.place.name}</span>
              ) : null}
              <span>
                {t("stories.readingTime", { minutes: story.readingMinutes })}
              </span>
            </p>
            <Heading lang={lang} className={styles.title}>
              <Link href={`/news/${story.slug}` as Route}>{story.title}</Link>
            </Heading>
            <p lang={lang}>{story.summary}</p>
            {story.sponsorshipDisclosure ? (
              <p className={styles.sponsored}>
                <strong>{t("stories.sponsoredLabel")}</strong>
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
