import { authoredTextLang } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { businessPermissions } from "@/modules/businesses/permissions";
import {
  categorySectionTypes,
  listCategorySections,
} from "@/modules/businesses/content-features";
import {
  removeCategorySectionAction,
  saveCategorySectionAction,
} from "../actions";
import styles from "../operations.module.css";
import { hidden, hasPermission } from "./shared";

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
  const categorySections = await listCategorySections(businessId);
  const canContent = await canContentPromise;

  return (
    <section
      className={styles.section}
      id="category-sections"
      aria-labelledby="category-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.sections.eyebrow")}</p>
          <h2 id="category-title">{t("ops.sections.title")}</h2>
        </div>
      </div>
      {categorySections.length > 0 ? (
        <div className={styles.grid}>
          {categorySections.map((section) => (
            <article className={styles.card} key={section.id}>
              <h3 lang={authoredTextLang}>{section.title}</h3>
              <ul lang={authoredTextLang}>
                {section.entries.map((entry, index) => (
                  <li key={`${entry.title}-${index}`}>
                    <strong>{entry.title}</strong>
                    {entry.description ? ` — ${entry.description}` : ""}
                  </li>
                ))}
              </ul>
              {canContent ? (
                <form action={removeCategorySectionAction}>
                  {hidden("businessId", businessId)}
                  {hidden("sectionId", section.id)}
                  <button className={`button ${styles.danger}`} type="submit">
                    {t("ops.sections.remove")}
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{t("ops.sections.none")}</p>
      )}
      {canContent ? (
        <form className={styles.card} action={saveCategorySectionAction}>
          {hidden("businessId", businessId)}
          <h3>{t("ops.sections.addTitle")}</h3>
          <div className={styles.field}>
            <label htmlFor="category-section-type">
              {t("ops.sections.type")}
            </label>
            <select id="category-section-type" name="sectionType">
              {categorySectionTypes.map((type) => (
                <option value={type} key={type}>
                  {t(`ops.sections.type.${type}` as MessageKey)}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="category-section-title">
              {t("ops.sections.publicTitle")}
            </label>
            <input id="category-section-title" name="title" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="category-section-entries">
              {t("ops.sections.entries")}
            </label>
            <textarea id="category-section-entries" name="entries" required />
          </div>
          <input type="hidden" name="status" value="active" />
          <input
            type="hidden"
            name="sortOrder"
            value={categorySections.length}
          />
          <button className="button primary" type="submit">
            {t("ops.sections.add")}
          </button>
        </form>
      ) : null}
    </section>
  );
}
