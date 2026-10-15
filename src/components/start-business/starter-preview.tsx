import type { CSSProperties } from "react";
import {
  previewInitials,
  type StarterPreview,
} from "@/modules/businesses/start-journey";
import type { Translator } from "@/lib/i18n/translate";
import type { MessageKey } from "@/lib/i18n/translate";
import styles from "./start-business.module.css";

type StarterPreviewCardProps = {
  t: Translator;
  name: string;
  /** Authored text shown as typed, so it keeps its own language. */
  nameLang: string | undefined;
  preview: StarterPreview | null;
  placeName: string | null;
  reachLabel: string | null;
};

/**
 * A faithful miniature of how the generated website will open for the chosen
 * category: the same template, accent and section order the live site applies.
 */
export function StarterPreviewCard({
  t,
  name,
  nameLang,
  preview,
  placeName,
  reachLabel,
}: StarterPreviewCardProps) {
  const trimmed = name.trim();
  const accent = preview?.accent ?? {
    primary: "#1d6b52",
    strong: "#14503d",
    soft: "#e7f2ed",
  };
  const style = {
    "--accent": accent.primary,
    "--accent-strong": accent.strong,
    "--accent-soft": accent.soft,
  } as CSSProperties;

  return (
    <section
      className={styles.preview}
      style={style}
      aria-label={t("startx.preview.aria")}
    >
      <div className={styles.previewHero}>
        <span
          className={styles.previewBadge}
          aria-hidden="true"
          lang={nameLang}
        >
          {previewInitials(trimmed)}
        </span>
        <p className={styles.previewEyebrow}>
          {preview
            ? t(`startx.variant.${preview.variant}` as MessageKey)
            : t("startx.preview.title")}
        </p>
        <p
          className={styles.previewName}
          data-empty={trimmed ? "false" : "true"}
          lang={trimmed ? nameLang : undefined}
        >
          {trimmed || t("startx.preview.namePlaceholder")}
        </p>
        {placeName || reachLabel ? (
          <ul className={styles.previewChips}>
            {placeName ? <li>{placeName}</li> : null}
            {reachLabel ? <li>{reachLabel}</li> : null}
          </ul>
        ) : null}
      </div>
      <div className={styles.previewBody}>
        {preview ? (
          <>
            <h3>{t("startx.preview.opensWith")}</h3>
            <ol className={styles.sectionList}>
              {preview.sections.map((id) => (
                <li key={id}>{t(`startx.section.${id}` as MessageKey)}</li>
              ))}
            </ol>
            <p className={styles.previewNote}>
              {t("startx.preview.design", {
                name: t(`startx.template.${preview.templateKey}` as MessageKey),
              })}
            </p>
          </>
        ) : (
          <p className={styles.previewNote}>
            {t("startx.preview.categoryPlaceholder")}
          </p>
        )}
        <p className={styles.previewNote}>{t("startx.preview.note")}</p>
      </div>
    </section>
  );
}
