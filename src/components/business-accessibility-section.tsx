import {
  listDeclaredAttributes,
  type BusinessAttributeValues,
} from "@/modules/businesses/attribute-definitions";
import styles from "./business-operations-sections.module.css";

export function BusinessAccessibilitySection({
  attributes,
}: {
  attributes: BusinessAttributeValues | null;
}) {
  const declared = listDeclaredAttributes(attributes);
  if (declared.length === 0) return null;

  return (
    <section
      className={styles.section}
      id="accessibility"
      aria-labelledby="accessibility-heading"
    >
      <div className={styles.heading}>
        <p className="eyebrow">Practical details</p>
        <h2 id="accessibility-heading">Accessibility and services</h2>
      </div>
      <div className="tag-row">
        {declared.map((definition) => (
          <span
            className="tag"
            key={definition.key}
            title={definition.description}
          >
            {definition.label}
          </span>
        ))}
      </div>
      <p className="field-hint">
        Self-declared by the business, not independently verified.
      </p>
    </section>
  );
}
