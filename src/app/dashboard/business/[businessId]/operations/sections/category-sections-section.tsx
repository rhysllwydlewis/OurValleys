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
          <p className="eyebrow">Bounded category features</p>
          <h2 id="category-title">Additional structured sections</h2>
        </div>
      </div>
      {categorySections.length > 0 ? (
        <div className={styles.grid}>
          {categorySections.map((section) => (
            <article className={styles.card} key={section.id}>
              <h3>{section.title}</h3>
              <ul>
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
                    Remove section
                  </button>
                </form>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>No category-specific sections yet.</p>
      )}
      {canContent ? (
        <form className={styles.card} action={saveCategorySectionAction}>
          {hidden("businessId", businessId)}
          <h3>Add a structured section</h3>
          <div className={styles.field}>
            <label htmlFor="category-section-type">Type</label>
            <select id="category-section-type" name="sectionType">
              {categorySectionTypes.map((type) => (
                <option value={type} key={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="category-section-title">Public title</label>
            <input id="category-section-title" name="title" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="category-section-entries">
              Entries — one per line: title | description | optional detail
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
            Add section
          </button>
        </form>
      ) : null}
    </section>
  );
}
