import type { Translator } from "@/lib/i18n/translate";
import type { PlaceProfileView } from "@/modules/reference-data/place-profile-model";
import styles from "./place-profile.module.css";

/**
 * Editorial "About" text and "Good to know" facts for a place (doc 96).
 * Plain text only: paragraphs are rendered as text nodes, never as markup.
 * Text that fell back to English for a Welsh reader carries `lang="en"`.
 */
export function PlaceProfileSection({
  t,
  lang,
  welsh,
  placeName,
  view,
}: {
  t: Translator;
  lang: string;
  welsh: boolean;
  placeName: string;
  view: PlaceProfileView;
}) {
  if (!view.hasProfile) return null;
  const englishFallback =
    welsh &&
    ((view.about.length > 0 && view.aboutLang === "en") ||
      view.facts.some(
        (fact) => fact.labelLang === "en" || fact.valueLang === "en",
      ));

  return (
    <section
      className={styles.profile}
      aria-labelledby="place-about-title"
      data-testid="place-profile"
    >
      <div className={styles.about} lang={lang}>
        <p className="eyebrow">{t("placex.aboutEyebrow")}</p>
        <h2 id="place-about-title">
          {t("placex.aboutTitle", { name: placeName })}
        </h2>
        {view.about.map((paragraph, index) => (
          <p
            key={index}
            className={styles.paragraph}
            lang={view.aboutLang === "cy" ? "cy" : "en"}
          >
            {paragraph}
          </p>
        ))}
        {englishFallback ? (
          <p className={styles.note}>{t("placex.aboutEnglishOnly")}</p>
        ) : null}
      </div>
      {view.facts.length > 0 ? (
        <aside
          className={styles.facts}
          aria-label={t("placex.factsAria", { name: placeName })}
        >
          <h3 lang={lang}>{t("placex.factsTitle")}</h3>
          <dl>
            {view.facts.map((fact, index) => (
              <div key={index} className={styles.fact}>
                <dt lang={fact.labelLang}>{fact.label}</dt>
                <dd lang={fact.valueLang}>{fact.value}</dd>
              </div>
            ))}
          </dl>
        </aside>
      ) : null}
    </section>
  );
}
