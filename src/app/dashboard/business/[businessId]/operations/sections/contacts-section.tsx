import { getTranslator } from "@/lib/i18n/server";
import { businessPermissions } from "@/modules/businesses/permissions";
import {
  contactMethodTypes,
  listBusinessContactMethods,
} from "@/modules/businesses/contacts-and-enquiries";
import { removeContactAction } from "../actions";
import styles from "../operations.module.css";
import { ContactMethodForm } from "./contact-method-form";
import { hidden, hasPermission } from "./shared";

export async function ContactsSection({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
  const { t } = await getTranslator();
  const canContactsPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.manageContacts,
  );
  const contacts = await listBusinessContactMethods(businessId);
  const canContacts = await canContactsPromise;

  return (
    <section
      className={styles.section}
      id="contacts"
      aria-labelledby="contacts-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.phase", { n: 7 })}</p>
          <h2 id="contacts-title">{t("ops.contacts.title")}</h2>
        </div>
        <p className={styles.meta}>{t("ops.contacts.meta")}</p>
      </div>
      <div className={styles.grid}>
        {contacts.map((method) => (
          <ContactMethodForm
            key={method.id}
            businessId={businessId}
            method={method}
            types={contactMethodTypes}
            canEdit={canContacts}
          />
        ))}
        {canContacts ? (
          <ContactMethodForm
            businessId={businessId}
            types={contactMethodTypes}
            canEdit
            method={{
              type: "enquiry",
              label: "Send an enquiry",
              value: "form",
              enabled: true,
              isPrimary: false,
              sortOrder: contacts.length,
            }}
          />
        ) : null}
      </div>
      {canContacts && contacts.length > 0 ? (
        <details>
          <summary>{t("ops.contacts.removeSummary")}</summary>
          <div className={styles.actions}>
            {contacts.map((method) => (
              <form action={removeContactAction} key={method.id}>
                {hidden("businessId", businessId)}
                {hidden("methodId", method.id)}
                <button className={`button ${styles.danger}`} type="submit">
                  {t("ops.common.removeNamed", { name: method.label })}
                </button>
              </form>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
