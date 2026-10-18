import type { CSSProperties } from "react";
import {
  accentName,
  cornerCopy,
  templateCopy,
  typefaceCopy,
} from "@/lib/i18n/business-copy";
import type { Translator } from "@/lib/i18n/translate";
import {
  businessAccents,
  businessCorners,
  businessTemplates,
  businessTypefaces,
  getAccent,
  type BusinessAppearanceConfig,
} from "@/modules/businesses/appearance";
import styles from "./theme-picker.module.css";

type ThemePickerProps = {
  t: Translator;
  appearance: BusinessAppearanceConfig;
  /** The design a business of this kind starts with; its template is flagged. */
  suggested: BusinessAppearanceConfig;
  canEdit: boolean;
};

const cornerRadius = { soft: "0.6rem", square: "0.15rem", round: "0.9rem" };

/**
 * Template, colour, corner and heading choices as visual radio groups. They
 * are plain form fields (no script needed to choose or save) so the designer's
 * live preview and the save action both read them like any other input.
 */
export function ThemePicker({
  t,
  appearance,
  suggested,
  canEdit,
}: ThemePickerProps) {
  const accent = getAccent(appearance.accentKey);
  const pickerStyle = {
    "--picker-accent": accent.primary,
    "--picker-strong": accent.strong,
    "--picker-soft": accent.soft,
  } as CSSProperties;

  return (
    <div className={styles.group} style={pickerStyle}>
      <fieldset disabled={!canEdit}>
        <legend>{t("design.appearance.templateLegend")}</legend>
        <p className={styles.help}>{t("design.appearance.templateHelp")}</p>
        <div className={styles.cards}>
          {businessTemplates.map((template) => {
            const copy = templateCopy(t, template.key);
            return (
              <label className={styles.card} key={template.key}>
                <input
                  type="radio"
                  name="templateKey"
                  value={template.key}
                  defaultChecked={appearance.templateKey === template.key}
                />
                <span
                  className={styles.thumb}
                  data-template={template.key}
                  aria-hidden="true"
                >
                  <span className={styles.copy}>
                    <i />
                    <i />
                    <i />
                  </span>
                  <i className={styles.media} />
                </span>
                <span className={styles.badges}>
                  {suggested.templateKey === template.key ? (
                    <span className={styles.badge}>
                      {t("design.appearance.suggested")}
                    </span>
                  ) : null}
                  <span className={`${styles.badge} ${styles.selected}`}>
                    {t("design.appearance.current")}
                  </span>
                </span>
                <span className={styles.name}>{copy.name}</span>
                <span className={styles.description}>{copy.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset disabled={!canEdit}>
        <legend>{t("design.appearance.colourLegend")}</legend>
        <p className={styles.help}>{t("design.appearance.colourHelp")}</p>
        <div className={styles.swatches}>
          {businessAccents.map((option) => (
            <label className={styles.swatch} key={option.key}>
              <input
                type="radio"
                name="accentKey"
                value={option.key}
                defaultChecked={appearance.accentKey === option.key}
              />
              <span
                className={styles.dot}
                style={{ background: option.primary }}
                aria-hidden="true"
              />
              <span>{accentName(t, option.key)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={!canEdit}>
        <legend>{t("design.appearance.cornersLegend")}</legend>
        <div className={styles.segments}>
          {businessCorners.map((option) => {
            const copy = cornerCopy(t, option.key);
            return (
              <label className={styles.segment} key={option.key}>
                <input
                  type="radio"
                  name="cornerKey"
                  value={option.key}
                  defaultChecked={appearance.cornerKey === option.key}
                />
                <span
                  className={styles.cornerSample}
                  style={{ borderRadius: cornerRadius[option.key] }}
                  aria-hidden="true"
                />
                <span className={styles.name}>{copy.name}</span>
                <span className={styles.description}>{copy.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset disabled={!canEdit}>
        <legend>{t("design.appearance.typefaceLegend")}</legend>
        <div className={styles.segments}>
          {businessTypefaces.map((option) => {
            const copy = typefaceCopy(t, option.key);
            return (
              <label className={styles.segment} key={option.key}>
                <input
                  type="radio"
                  name="typefaceKey"
                  value={option.key}
                  defaultChecked={appearance.typefaceKey === option.key}
                />
                <span
                  className={`${styles.sample} ${
                    option.key === "classic"
                      ? styles.sampleClassic
                      : styles.sampleModern
                  }`}
                  aria-hidden="true"
                >
                  Aa
                </span>
                <span className={styles.name}>{copy.name}</span>
                <span className={styles.description}>{copy.description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
