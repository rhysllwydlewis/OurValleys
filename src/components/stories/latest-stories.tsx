import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import type { PublicStory } from "@/modules/stories/public";
import styles from "./latest-stories.module.css";
import { StoryCards } from "./story-cards";

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
        <>
          <StoryCards stories={stories} t={t} locale={locale} />
          <p className={styles.more}>
            <Link className="text-link" href="/news/archive">
              {t("stories.archiveLink")}
            </Link>
          </p>
        </>
      )}
    </section>
  );
}
