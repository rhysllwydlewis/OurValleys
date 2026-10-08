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
      onSubmit={(event) => {
        // Pass the exact current route so context survives even when the
        // browser withholds the Referer header; the server validates it.
        const field = event.currentTarget.elements.namedItem("returnTo");
        if (field instanceof HTMLInputElement) {
          field.value = `${window.location.pathname}${window.location.search}`;
        }
      }}
    >
      <input type="hidden" name="returnTo" defaultValue="" />
      {LOCALES.map((candidate) => {
        const details = LOCALE_DETAILS[candidate];
        const current = candidate === locale;
        return (
          <button
            key={candidate}
            type="submit"
            name="locale"
            value={candidate}
            className={styles.option}
            aria-pressed={current}
          >
            <span aria-hidden="true">{details.shortName}</span>
            <span className={styles.srOnly} lang={details.htmlLang}>
              {details.nativeName}
            </span>
          </button>
        );
      })}
    </form>
  );
}
