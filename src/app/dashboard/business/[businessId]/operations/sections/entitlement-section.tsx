import { getBusinessEntitlement } from "@/modules/businesses/entitlements";
import styles from "../operations.module.css";

export async function EntitlementSection({
  businessId,
}: {
  businessId: string;
}) {
  const entitlement = await getBusinessEntitlement(businessId);

  return (
    <section
      className={styles.section}
      id="entitlement"
      aria-labelledby="entitlement-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">Phase 12</p>
          <h2 id="entitlement-title">Permanent free entitlement</h2>
        </div>
        <span className="tag">{entitlement.planKey}</span>
      </div>
      <p>
        The generous free core is active without billing, pricing or an
        unapproved paid plan.
      </p>
      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Included capabilities</h3>
          <ul>
            {entitlement.capabilities.map((capability) => (
              <li key={capability}>{capability.replaceAll("_", " ")}</li>
            ))}
          </ul>
        </article>
        <article className={styles.card}>
          <h3>Current limits</h3>
          <dl>
            {Object.entries(entitlement.limits).map(([name, value]) => (
              <div key={name}>
                <dt>{name}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      </div>
    </section>
  );
}
