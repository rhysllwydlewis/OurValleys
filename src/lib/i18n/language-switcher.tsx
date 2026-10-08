"use client";

import { LOCALES, LOCALE_DETAILS } from "./config";
import { setLocaleAction } from "./actions";
import { useLocale } from "./client";
import styles from "./language-switcher.module.css";

/**
 * A two-button language toggle that works without JavaScript: each button
 * submits the server action, which stores the choice and returns to the page.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useLocale();

  return (
    <form
      action={setLocaleAction}
      className={`${styles.switcher} ${className ?? ""}`.trim()}
      role="group"
      aria-label={t("common.language")}
    >
      {LOCALES.map((candidate) => {
        const details = LOCALE_DETAILS[candidate];
        const current = candidate === locale;
        return (
          <button
            key={candidate}
            type="submit"
            name="locale"
            value={candidate}
            lang={details.htmlLang}
            className={styles.option}
            aria-pressed={current}
            aria-label={
              current
                ? details.nativeName
                : t("common.switchLanguage", { language: details.nativeName })
            }
            title={details.nativeName}
          >
            {details.shortName}
          </button>
        );
      })}
    </form>
  );
}
