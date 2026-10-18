import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { resolveCategoryVariant } from "@/modules/businesses/appearance";
import { getBusinessPresentationContext } from "@/modules/businesses/appearance-repository";
import { listCategorySections } from "@/modules/businesses/content-features";
import {
  describeExtraSectionGuidance,
  extraSectionTypes,
  maxExtraSections,
  type ExtraSectionSuggestion,
} from "@/modules/businesses/extra-sections-model";
import { businessPermissions } from "@/modules/businesses/permissions";
import styles from "../operations.module.css";
import builder from "./menu-builder.module.css";
import extra from "./extra-sections.module.css";
import { SectionCard, SectionForm } from "./extra-sections-editor";
import { hasPermission } from "./shared";

function suggestionKey(suggestion: ExtraSectionSuggestion): MessageKey {
  switch (suggestion.code) {
    case "add_answers":
      return suggestion.count === 1
        ? "extra.guidance.add_answersOne"
        : "extra.guidance.add_answers";
    case "add_prices":
      return suggestion.count === 1
        ? "extra.guidance.add_pricesOne"
        : "extra.guidance.add_prices";
    case "add_roles":
      return suggestion.count === 1
        ? "extra.guidance.add_rolesOne"
        : "extra.guidance.add_roles";
    default:
      return `extra.guidance.${suggestion.code}` as MessageKey;
  }
}

export async function CategorySectionsSection({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
  const { t } = await getTranslator();
  const canContentPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.manageContent,
  );
  const [sections, context] = await Promise.all([
    listCategorySections(businessId),
    getBusinessPresentationContext(businessId),
  ]);
  const canContent = await canContentPromise;
  const variant = context
    ? resolveCategoryVariant(context.category.name, context.category.slug)
    : "general";
  const guidance = describeExtraSectionGuidance(sections, variant);
  const atLimit = sections.length >= maxExtraSections;
  const stats: Array<[string, number]> = [
    [t("extra.statSections"), guidance.sections],
    [t("extra.statEntries"), guidance.entries],
    [t("extra.statHidden"), guidance.hidden],
  ];

  return (
    <section
      className={styles.section}
      id="extra-sections"
      aria-labelledby="category-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.sections.eyebrow")}</p>
          <h2 id="category-title">{t("ops.sections.title")}</h2>
        </div>
        <p className={styles.meta}>{t("extra.meta")}</p>
      </div>

      <ul className={builder.stats} aria-label={t("extra.statsAria")}>
        {stats.map(([text, value]) => (
          <li className={builder.stat} key={text}>
            <strong>{value}</strong>
            <span>{text}</span>
          </li>
        ))}
      </ul>

      {canContent ? (
        <div className={builder.guidance}>
          <h3>{t("extra.guidanceTitle")}</h3>
          {guidance.suggestions.length === 0 ? (
            <p>
              {sections.length === 0
                ? t("extra.guidanceEmpty")
                : t("extra.guidanceDone")}
            </p>
          ) : (
            <ul>
              {guidance.suggestions.map((suggestion) => (
                <li
                  key={`${suggestion.code}-${"sectionId" in suggestion ? suggestion.sectionId : ""}`}
                >
                  {t(suggestionKey(suggestion), {
                    count: "count" in suggestion ? suggestion.count : 0,
                    section:
                      "sectionId" in suggestion
                        ? (sections.find((s) => s.id === suggestion.sectionId)
                            ?.title ?? "")
                        : "",
                  })}
                  {suggestion.code === "add_recommended" ? (
                    <span className={extra.suggest}>
                      {suggestion.types.map((type) => (
                        <span key={type}>
                          {t(`ops.sections.type.${type}` as MessageKey)}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {sections.length === 0 ? (
        <p className={styles.empty}>{t("ops.sections.none")}</p>
      ) : (
        <div className={builder.groups}>
          {sections.map((section, index) => (
            <SectionCard
              key={section.id}
              businessId={businessId}
              canContent={canContent}
              sections={sections}
              section={section}
              index={index}
              t={t}
            />
          ))}
        </div>
      )}

      {canContent ? (
        atLimit ? (
          <p className={styles.notice}>
            {t("extra.limitReached", { count: maxExtraSections })}
          </p>
        ) : (
          <div className={extra.addGrid}>
            <h3>{t("ops.sections.addTitle")}</h3>
            {extraSectionTypes.map((type) => (
              <details className={builder.editor} key={type}>
                <summary>{t(`extra.addType.${type}` as MessageKey)}</summary>
                <p className={builder.hint}>
                  {t(`extra.typeHelp.${type}` as MessageKey)}
                </p>
                <SectionForm businessId={businessId} type={type} t={t} />
              </details>
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}
