import { getBusinessEntitlement } from "@/modules/businesses/entitlements";
import { getTranslator } from "@/lib/i18n/server";
import { en } from "@/lib/i18n/messages/en";
import type { MessageKey, Translator } from "@/lib/i18n/translate";
import styles from "../operations.module.css";

/** Known limits are labelled; an unrecognised limit name is shown as stored. */
function limitLabel(t: Translator, name: string): string {
  const key = `ops.entitlement.limit.${name}`;
  return key in en ? t(key as MessageKey) : name;
}

export async function EntitlementSection({
  businessId,
}: {
  businessId: string;
}) {
  const { t } = await getTranslator();
  const entitlement = await getBusinessEntitlement(businessId);

  return (
    <section
      className={styles.section}
      id="entitlement"
      aria-labelledby="entitlement-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.phase", { n: 12 })}</p>
          <h2 id="entitlement-title">{t("ops.entitlement.title")}</h2>
        </div>
        <span className="tag">{entitlement.planKey}</span>
      </div>
      <p>{t("ops.entitlement.intro")}</p>
      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>{t("ops.entitlement.included")}</h3>
          <ul>
            {entitlement.capabilities.map((capability) => (
              <li key={capability}>
                {t(`ops.entitlement.capability.${capability}` as MessageKey)}
              </li>
            ))}
          </ul>
        </article>
        <article className={styles.card}>
          <h3>{t("ops.entitlement.limits")}</h3>
          <dl>
            {Object.entries(entitlement.limits).map(([name, value]) => (
              <div key={name}>
                <dt>{limitLabel(t, name)}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      </div>
    </section>
  );
}
