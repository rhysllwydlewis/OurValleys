import {
  contactMethodTypes,
  listBusinessContactMethods,
} from "@/modules/businesses/contacts-and-enquiries";
import { removeContactAction, saveContactAction } from "../actions";
import styles from "../operations.module.css";
import { hidden } from "./shared";

const contactLabels: Record<string, string> = {
  call: "Call us",
  email: "Email us",
  enquiry: "Send an enquiry",
  quote: "Request a quote",
  callback: "Request a callback",
  booking: "Book now",
  whatsapp: "WhatsApp",
  directions: "Get directions",
  website: "Visit our main website",
  order: "Order online",
};

export async function ContactsSection({
  businessId,
  canContacts,
}: {
  businessId: string;
  canContacts: boolean;
}) {
  const contacts = await listBusinessContactMethods(businessId);

  return (
    <section
      className={styles.section}
      id="contacts"
      aria-labelledby="contacts-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">Phase 7</p>
          <h2 id="contacts-title">Contact methods and primary action</h2>
        </div>
        <p className={styles.meta}>
          Only enabled and valid methods appear publicly.
        </p>
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
              <label htmlFor={`type-${method.id}`}>Method</label>
              <select
                id={`type-${method.id}`}
                name="type"
                defaultValue={method.type}
                disabled={!canContacts}
              >
                {contactMethodTypes.map((type) => (
                  <option value={type} key={type}>
                    {contactLabels[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor={`label-${method.id}`}>Button label</label>
              <input
                id={`label-${method.id}`}
                name="label"
                defaultValue={method.label}
                disabled={!canContacts}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`value-${method.id}`}>
                Number, email, URL, address or “form”
              </label>
              <input
                id={`value-${method.id}`}
                name="value"
                defaultValue={method.value}
                disabled={!canContacts}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`order-${method.id}`}>Order</label>
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
              Enabled
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                name="isPrimary"
                defaultChecked={method.isPrimary}
                disabled={!canContacts}
              />{" "}
              Primary action
            </label>
            {canContacts ? (
              <div className={styles.actions}>
                <button className="button primary" type="submit">
                  Save
                </button>
              </div>
            ) : null}
          </form>
        ))}
        {canContacts ? (
          <form className={styles.card} action={saveContactAction}>
            {hidden("businessId", businessId)}
            <h3>Add a contact method</h3>
            <div className={styles.field}>
              <label htmlFor="new-contact-type">Method</label>
              <select id="new-contact-type" name="type" defaultValue="enquiry">
                {contactMethodTypes.map((type) => (
                  <option value={type} key={type}>
                    {contactLabels[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="new-contact-label">Button label</label>
              <input
                id="new-contact-label"
                name="label"
                defaultValue="Send an enquiry"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="new-contact-value">Value</label>
              <input
                id="new-contact-value"
                name="value"
                defaultValue="form"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="new-contact-order">Order</label>
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
              <input type="checkbox" name="enabled" defaultChecked /> Enabled
            </label>
            <label className={styles.check}>
              <input type="checkbox" name="isPrimary" /> Primary action
            </label>
            <button className="button primary" type="submit">
              Add method
            </button>
          </form>
        ) : null}
      </div>
      {canContacts && contacts.length > 0 ? (
        <details>
          <summary>Remove a contact method</summary>
          <div className={styles.actions}>
            {contacts.map((method) => (
              <form action={removeContactAction} key={method.id}>
                {hidden("businessId", businessId)}
                {hidden("methodId", method.id)}
                <button className={`button ${styles.danger}`} type="submit">
                  Remove {method.label}
                </button>
              </form>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
