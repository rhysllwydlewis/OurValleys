import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import type { PublicStory } from "@/modules/stories/public";
import { StoryCards } from "@/components/stories/story-cards";
import styles from "./home-stories.module.css";

/**
 * The newest local stories on the homepage. Renders nothing when there are
 * none (or they could not be read), so the page never shows an empty box.
 */
export function HomeStories({
  stories,
  t,
  locale,
}: {
  stories: readonly PublicStory[] | null;
  t: Translator;
  locale: Locale;
}) {
  if (!stories || stories.length === 0) return null;
  return (
    <section
      className={styles.section}
      aria-labelledby="home-stories-title"
      data-home-reveal
      data-testid="home-stories"
    >
      <div className={styles.inner}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>{t("stories.homeEyebrow")}</p>
            <h2 id="home-stories-title">{t("stories.homeTitle")}</h2>
          </div>
          <Link className={styles.all} href="/news/archive">
            {t("stories.homeAll")}
            <span aria-hidden="true"> →</span>
          </Link>
        </div>
        <StoryCards stories={stories} t={t} locale={locale} />
      </div>
    </section>
  );
}
