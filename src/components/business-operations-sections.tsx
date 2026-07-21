import { TrackedBusinessLink } from "@/components/business-activity";
import type { BusinessActivityType } from "@/modules/businesses/analytics";
import type { PublicContactAction } from "@/modules/businesses/contacts-and-enquiries";
import type { PublicBusinessOperations } from "@/modules/businesses/public-operations";
import styles from "./business-operations-sections.module.css";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

function eventTypeForContact(
  contact: PublicContactAction,
): BusinessActivityType {
  switch (contact.type) {
    case "call":
      return "call_click";
    case "email":
      return "email_click";
    case "directions":
      return "directions_click";
    case "booking":
      return "booking_click";
    case "order":
      return "order_click";
    default:
      return "external_click";
  }
}

function ContactAction({
  businessId,
  businessSlug,
  contact,
  primary,
}: {
  businessId: string;
  businessSlug: string;
  contact: PublicContactAction;
  primary: boolean;
}) {
  const className = primary ? styles.primary : styles.secondary;
  if (contact.formKind) {
    return (
      <a
        className={className}
        href={`/b/${businessSlug}/contact?kind=${contact.formKind}`}
      >
        {contact.label}
      </a>
    );
  }
  if (!contact.href) return null;
  const external = contact.href.startsWith("http");
  return (
    <TrackedBusinessLink
      className={className}
      businessId={businessId}
      eventType={eventTypeForContact(contact)}
      source="business_website"
      href={contact.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      {contact.label}
    </TrackedBusinessLink>
  );
}

export function BusinessOperationsSections({
  businessId,
  businessSlug,
  businessName,
  operations,
}: {
  businessId: string;
  businessSlug: string;
  businessName: string;
  operations: PublicBusinessOperations;
}) {
  const hasMenu =
    operations.menu.length > 0 || Boolean(operations.menuDocument?.url);
  return (
    <div className={styles.root}>
      {operations.lifecycleState === "temporarily_closed" ? (
        <div className={styles.lifecycleBanner} role="status">
          <strong>{businessName} is temporarily closed.</strong>{" "}
          {operations.temporaryClosedUntil
            ? `The business expects to reopen after ${formatDate(operations.temporaryClosedUntil)}.`
            : "Check the contact options for updates."}
        </div>
      ) : null}
      {operations.lifecycleState === "permanently_closed" ? (
        <div className={styles.lifecycleBanner} role="status">
          <strong>{businessName} is marked as permanently closed.</strong> This
          limited page remains available to reduce confusion. Please report an
          error if the business is still trading.
        </div>
      ) : null}

      {operations.contacts.length > 0 ? (
        <section
          className={styles.section}
          id="contact"
          aria-labelledby="contact-heading"
        >
          <div className={styles.heading}>
            <p className="eyebrow">Contact</p>
            <h2 id="contact-heading">Choose how to reach {businessName}</h2>
          </div>
          <div className={styles.actions}>
            {operations.contacts.map((contact, index) => (
              <ContactAction
                businessId={businessId}
                businessSlug={businessSlug}
                contact={contact}
                primary={contact.isPrimary || index === 0}
                key={contact.id}
              />
            ))}
          </div>
        </section>
      ) : null}

      {operations.offers.length > 0 ? (
        <section
          className={styles.section}
          id="offers"
          aria-labelledby="offers-heading"
        >
          <div className={styles.heading}>
            <p className="eyebrow">Current offers</p>
            <h2 id="offers-heading">Offers from {businessName}</h2>
          </div>
          <div className={styles.grid}>
            {operations.offers.map((offer) => (
              <article className={styles.card} key={offer.id}>
                <h3>{offer.title}</h3>
                <p>{offer.description}</p>
                {offer.endsAt ? (
                  <p className={styles.meta}>Ends {formatDate(offer.endsAt)}</p>
                ) : null}
                {offer.terms ? (
                  <details>
                    <summary>Terms</summary>
                    <p>{offer.terms}</p>
                  </details>
                ) : null}
                {offer.actionUrl ? (
                  <TrackedBusinessLink
                    className={styles.secondary}
                    businessId={businessId}
                    eventType="external_click"
                    source="offer"
                    href={offer.actionUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {offer.actionLabel ?? "View offer"}
                  </TrackedBusinessLink>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {operations.events.length > 0 ? (
        <section
          className={styles.section}
          id="events"
          aria-labelledby="events-heading"
        >
          <div className={styles.heading}>
            <p className="eyebrow">Upcoming</p>
            <h2 id="events-heading">Events</h2>
          </div>
          <div className={styles.grid}>
            {operations.events.map((event) => (
              <article className={styles.card} key={event.id}>
                <h3>{event.title}</h3>
                <p className={styles.meta}>{formatDate(event.startsAt)}</p>
                {event.locationDisplay ? <p>{event.locationDisplay}</p> : null}
                <p>{event.description}</p>
                {event.bookingUrl ? (
                  <TrackedBusinessLink
                    className={styles.secondary}
                    businessId={businessId}
                    eventType="booking_click"
                    source="event"
                    href={event.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Book or learn more
                  </TrackedBusinessLink>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {hasMenu ? (
        <section
          className={styles.section}
          id="menu"
          aria-labelledby="menu-heading"
        >
          <div className={styles.heading}>
            <p className="eyebrow">Menu</p>
            <h2 id="menu-heading">Browse the menu</h2>
          </div>
          {operations.menu.length > 0 ? (
            <div className={styles.grid}>
              {operations.menu.map((group) => (
                <article
                  className={`${styles.card} ${styles.menuGroup}`}
                  key={group.id}
                >
                  <div>
                    <h3>{group.name}</h3>
                    {group.description ? <p>{group.description}</p> : null}
                  </div>
                  <ul className={styles.menuList}>
                    {group.items.map((item) => (
                      <li className={styles.menuItem} key={item.id}>
                        <strong>{item.name}</strong>
                        {item.priceDisplay ? (
                          <span>{item.priceDisplay}</span>
                        ) : null}
                        {item.description ? (
                          <p className={styles.menuDescription}>
                            {item.description}
                          </p>
                        ) : null}
                        {item.dietaryLabels.length > 0 ? (
                          <p className={styles.labels}>
                            {item.dietaryLabels.join(" · ")}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : null}
          {operations.menuDocument?.url ? (
            <p>
              <TrackedBusinessLink
                className={styles.secondary}
                businessId={businessId}
                eventType="external_click"
                source="menu_document"
                href={operations.menuDocument.url}
                target="_blank"
                rel="noreferrer"
              >
                Open {operations.menuDocument.displayName}
              </TrackedBusinessLink>
            </p>
          ) : null}
        </section>
      ) : null}

      {operations.categorySections.map((section) => (
        <section
          className={styles.section}
          id={`feature-${section.id}`}
          aria-labelledby={`feature-heading-${section.id}`}
          key={section.id}
        >
          <div className={styles.heading}>
            <p className="eyebrow">
              {section.sectionType.replaceAll("_", " ")}
            </p>
            <h2 id={`feature-heading-${section.id}`}>{section.title}</h2>
          </div>
          <ul className={`${styles.entryList} ${styles.grid}`}>
            {section.entries.map((entry, index) => (
              <li
                className={`${styles.card} ${styles.entry}`}
                key={`${entry.title}-${index}`}
              >
                <h3>{entry.title}</h3>
                {entry.description ? <p>{entry.description}</p> : null}
                {entry.meta ? (
                  <p className={styles.meta}>{entry.meta}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
