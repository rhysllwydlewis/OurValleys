import type { Route } from "next";
import Link from "next/link";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import type { PublicStory } from "@/modules/stories/public";
import styles from "./latest-stories.module.css";

/**
 * The "From OurValleys" block on `/news`. `stories` is null when the database
 * could not be read; an empty list renders nothing so a site with no stories
 * yet shows no empty box.
 */
export function LatestStories({
  stories,
  t,
  locale,
}: {
  stories: PublicStory[] | null;
  t: Translator;
  locale: Locale;
}) {
  if (stories !== null && stories.length === 0) return null;
  const dateFormat = new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "medium",
    timeZone: "Europe/London",
  });
  return (
    <section
      className={`${styles.block} ov-glass`}
      aria-labelledby="local-stories-title"
      data-testid="local-stories"
    >
      <div className={styles.head}>
        <h2 id="local-stories-title">{t("stories.blockTitle")}</h2>
        <p>{t("stories.blockIntro")}</p>
      </div>
      {stories === null ? (
        <p role="status">{t("stories.blockUnavailable")}</p>
      ) : (
        <ul className={styles.list}>
          {stories.map((story) => (
            <li key={story.slug} className={styles.card}>
              <p className={styles.meta}>
                {story.publishedAt ? (
                  <time dateTime={story.publishedAt.toISOString()}>
                    {dateFormat.format(story.publishedAt)}
                  </time>
                ) : null}
                {story.place ? <span>{story.place.name}</span> : null}
              </p>
              <h3
                lang={LOCALE_DETAILS[story.contentLocale].htmlLang}
                className={styles.title}
              >
                <Link href={`/news/${story.slug}` as Route}>{story.title}</Link>
              </h3>
              <p lang={LOCALE_DETAILS[story.contentLocale].htmlLang}>
                {story.summary}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
