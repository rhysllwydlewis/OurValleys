import { authoredTextLang } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { businessPermissions } from "@/modules/businesses/permissions";
import {
  contactMethodTypes,
  listBusinessContactMethods,
} from "@/modules/businesses/contacts-and-enquiries";
import { removeContactAction, saveContactAction } from "../actions";
import styles from "../operations.module.css";
import { hidden, hasPermission } from "./shared";

const contactLabels: Record<string, MessageKey> = {
  call: "ops.contacts.type.call",
  email: "ops.contacts.type.email",
  enquiry: "ops.contacts.type.enquiry",
  quote: "ops.contacts.type.quote",
  callback: "ops.contacts.type.callback",
  booking: "ops.contacts.type.booking",
  whatsapp: "ops.contacts.type.whatsapp",
  directions: "ops.contacts.type.directions",
  website: "ops.contacts.type.website",
  order: "ops.contacts.type.order",
};

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
          <form
            className={styles.card}
            action={saveContactAction}
            key={method.id}
          >
            {hidden("businessId", businessId)}
            {hidden("methodId", method.id)}
            <div className={styles.field}>
              <label htmlFor={`type-${method.id}`}>
                {t("ops.contacts.method")}
              </label>
              <select
                id={`type-${method.id}`}
                name="type"
                defaultValue={method.type}
                disabled={!canContacts}
              >
                {contactMethodTypes.map((type) => (
                  <option value={type} key={type}>
                    {contactLabels[type] ? t(contactLabels[type]) : type}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor={`label-${method.id}`}>
                {t("ops.contacts.buttonLabel")}
              </label>
              <input
                id={`label-${method.id}`}
                lang={authoredTextLang}
                name="label"
                defaultValue={method.label}
                disabled={!canContacts}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`value-${method.id}`}>
                {t("ops.contacts.valueHelp")}
              </label>
              <input
                id={`value-${method.id}`}
                lang={authoredTextLang}
                name="value"
                defaultValue={method.value}
                disabled={!canContacts}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`order-${method.id}`}>
                {t("ops.common.order")}
              </label>
              <input
                id={`order-${method.id}`}
                name="sortOrder"
                type="number"
                min="0"
                max="50"
                defaultValue={method.sortOrder}
                disabled={!canContacts}
              />
            </div>
            <label className={styles.check}>
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={method.enabled}
                disabled={!canContacts}
              />{" "}
              {t("ops.common.enabled")}
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                name="isPrimary"
                defaultChecked={method.isPrimary}
                disabled={!canContacts}
              />{" "}
              {t("ops.contacts.primary")}
            </label>
            {canContacts ? (
              <div className={styles.actions}>
                <button className="button primary" type="submit">
                  {t("ops.common.save")}
                </button>
              </div>
            ) : null}
          </form>
        ))}
        {canContacts ? (
          <form className={styles.card} action={saveContactAction}>
            {hidden("businessId", businessId)}
            <h3>{t("ops.contacts.addTitle")}</h3>
            <div className={styles.field}>
              <label htmlFor="new-contact-type">
                {t("ops.contacts.method")}
              </label>
              <select id="new-contact-type" name="type" defaultValue="enquiry">
                {contactMethodTypes.map((type) => (
                  <option value={type} key={type}>
                    {contactLabels[type] ? t(contactLabels[type]) : type}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="new-contact-label">
                {t("ops.contacts.buttonLabel")}
              </label>
              <input
                id="new-contact-label"
                name="label"
                defaultValue="Send an enquiry"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="new-contact-value">
                {t("ops.contacts.value")}
              </label>
              <input
                id="new-contact-value"
                name="value"
                defaultValue="form"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="new-contact-order">{t("ops.common.order")}</label>
              <input
                id="new-contact-order"
                name="sortOrder"
                type="number"
                min="0"
                max="50"
                defaultValue={contacts.length}
              />
            </div>
            <label className={styles.check}>
              <input type="checkbox" name="enabled" defaultChecked />{" "}
              {t("ops.common.enabled")}
            </label>
            <label className={styles.check}>
              <input type="checkbox" name="isPrimary" />{" "}
              {t("ops.contacts.primary")}
            </label>
            <button className="button primary" type="submit">
              {t("ops.contacts.add")}
            </button>
          </form>
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
