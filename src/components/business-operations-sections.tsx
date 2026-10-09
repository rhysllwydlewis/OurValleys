import type { ReactNode } from "react";
import {
  ContentPicture,
  contentPictureSizes,
} from "@/components/content-picture";
import { TrackedBusinessLink } from "@/components/business-activity";
import type { BusinessActivityType } from "@/modules/businesses/analytics";
import {
  listDeclaredAttributes,
  type BusinessAttributeValues,
} from "@/modules/businesses/attribute-definitions";
import type { BusinessOperationSectionId } from "@/modules/businesses/appearance";
import type { PublicContactAction } from "@/modules/businesses/contacts-and-enquiries";
import type { PublicBusinessOperations } from "@/modules/businesses/public-operations";
import styles from "./generated-business-website.module.css";

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

function formatDay(value: Date) {
  const zone = "Europe/London";
  return {
    day: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      timeZone: zone,
    }).format(value),
    month: new Intl.DateTimeFormat("en-GB", {
      month: "short",
      timeZone: zone,
    }).format(value),
  };
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
  preview,
}: {
  businessId: string;
  businessSlug: string;
  contact: PublicContactAction;
  primary: boolean;
  preview: boolean;
}) {
  const className = primary ? styles.primaryAction : styles.outlineAction;
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
      track={!preview}
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

type SectionContext = {
  businessId: string;
  businessSlug: string;
  businessName: string;
  operations: PublicBusinessOperations;
  attributes: BusinessAttributeValues | null;
  /** The owner's private preview: clicks are not counted as visitor activity. */
  preview?: boolean;
};

export type OperationSectionRenderers = Partial<
  Record<BusinessOperationSectionId, (layout: string) => ReactNode>
>;

/**
 * Builds the renderers for the operation-driven sections of a business
 * website. A section is returned only when the business has something to show
 * in it, so the website never carries an empty block and the navigation only
 * lists sections that exist. The generated website decides where each one
 * goes from the owner's saved order, visibility and layout.
 */
export function buildOperationSectionRenderers(
  context: SectionContext,
): OperationSectionRenderers {
  const { businessId, businessSlug, businessName, operations } = context;
  const preview = context.preview ?? false;
  const declared = listDeclaredAttributes(context.attributes);
  const hasMenu =
    operations.menu.length > 0 || Boolean(operations.menuDocument?.url);
  const renderers: OperationSectionRenderers = {};

  if (operations.contacts.length > 0) {
    renderers.contact = (layout) => (
      <section
        className={`${styles.section} ${
          layout === "buttons" ? styles.contactButtons : styles.contactPanel
        }`}
        id="contact"
        aria-labelledby="contact-heading"
      >
        <div>
          <p className={styles.eyebrow}>Contact</p>
          <h2 id="contact-heading">Choose how to reach {businessName}.</h2>
        </div>
        <div className={styles.actionRow}>
          {operations.contacts.map((contact, index) => (
            <ContactAction
              businessId={businessId}
              businessSlug={businessSlug}
              contact={contact}
              primary={contact.isPrimary || index === 0}
              preview={preview}
              key={contact.id}
            />
          ))}
        </div>
      </section>
    );
  }

  if (operations.offers.length > 0) {
    renderers.offers = (layout) => (
      <section
        className={styles.section}
        id="offers"
        aria-labelledby="offers-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Current offers</p>
            <h2 id="offers-heading">Offers from {businessName}.</h2>
          </div>
        </div>
        <div className={layout === "list" ? styles.itemList : styles.itemGrid}>
          {operations.offers.map((offer) => (
            <article className={styles.itemCard} key={offer.id}>
              <ContentPicture
                image={offer.image}
                variant="inset"
                sizes={contentPictureSizes.site}
              />
              <div className={styles.itemBody}>
                <h3>{offer.title}</h3>
                <p>{offer.description}</p>
                {offer.endsAt ? (
                  <p className={styles.itemMeta}>
                    Ends {formatDate(offer.endsAt)}
                  </p>
                ) : null}
                {offer.terms ? (
                  <details className={styles.terms}>
                    <summary>Terms</summary>
                    <p>{offer.terms}</p>
                  </details>
                ) : null}
              </div>
              {offer.actionUrl ? (
                <TrackedBusinessLink
                  track={!preview}
                  className={styles.outlineAction}
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
    );
  }

  if (operations.events.length > 0) {
    renderers.events = (layout) => (
      <section
        className={styles.section}
        id="events"
        aria-labelledby="events-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Upcoming</p>
            <h2 id="events-heading">Events.</h2>
          </div>
        </div>
        <div
          className={
            layout === "timeline" ? styles.itemTimeline : styles.itemGrid
          }
        >
          {operations.events.map((event) => {
            const when = formatDay(event.startsAt);
            return (
              <article className={styles.itemCard} key={event.id}>
                {layout === "timeline" ? (
                  <div className={styles.dateBadge} aria-hidden="true">
                    <strong>{when.day}</strong>
                    <span>{when.month}</span>
                  </div>
                ) : (
                  <ContentPicture
                    image={event.image}
                    variant="inset"
                    sizes={contentPictureSizes.site}
                  />
                )}
                <div className={styles.itemBody}>
                  <h3>{event.title}</h3>
                  <p className={styles.itemMeta}>
                    <time dateTime={event.startsAt.toISOString()}>
                      {formatDate(event.startsAt)}
                    </time>
                    {event.locationDisplay ? ` · ${event.locationDisplay}` : ""}
                  </p>
                  <p>{event.description}</p>
                </div>
                {event.bookingUrl ? (
                  <TrackedBusinessLink
                    track={!preview}
                    className={styles.outlineAction}
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
            );
          })}
        </div>
      </section>
    );
  }

  if (hasMenu) {
    renderers.menu = (layout) => (
      <section
        className={styles.section}
        id="menu"
        aria-labelledby="menu-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Menu</p>
            <h2 id="menu-heading">Browse the menu.</h2>
          </div>
        </div>
        {operations.menu.length > 0 ? (
          <div
            className={
              layout === "compact" ? styles.menuCompact : styles.menuColumns
            }
          >
            {operations.menu.map((group) => (
              <article className={styles.menuGroup} key={group.id}>
                <div>
                  <h3>{group.name}</h3>
                  {group.description ? <p>{group.description}</p> : null}
                </div>
                <ul className={styles.menuList}>
                  {group.items.map((item) => (
                    <li className={styles.menuItem} key={item.id}>
                      <strong>{item.name}</strong>
                      {item.priceDisplay ? (
                        <span className={styles.menuPrice}>
                          {item.priceDisplay}
                        </span>
                      ) : null}
                      {item.description ? (
                        <p className={styles.menuDescription}>
                          {item.description}
                        </p>
                      ) : null}
                      {item.dietaryLabels.length > 0 ? (
                        <p className={styles.menuLabels}>
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
          <p className={styles.menuDocument}>
            <TrackedBusinessLink
              track={!preview}
              className={styles.outlineAction}
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
    );
  }

  if (declared.length > 0) {
    renderers.accessibility = (layout) => (
      <section
        className={styles.section}
        id="accessibility"
        aria-labelledby="accessibility-heading"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Practical details</p>
            <h2 id="accessibility-heading">Accessibility and services.</h2>
          </div>
        </div>
        <ul
          className={
            layout === "list" ? styles.attributeList : styles.attributeChips
          }
        >
          {declared.map((definition) => (
            <li key={definition.key} title={definition.description}>
              {definition.label}
            </li>
          ))}
        </ul>
        <p className={styles.footnote}>
          Self-declared by the business and not independently checked.
        </p>
      </section>
    );
  }

  return renderers;
}

/**
 * Banners and category feature sections that sit outside the configurable
 * section library: a closure notice must always show, and category features
 * are driven by the business's own section records.
 */
export function BusinessLifecycleBanner({
  businessName,
  operations,
}: {
  businessName: string;
  operations: PublicBusinessOperations;
}) {
  if (operations.lifecycleState === "temporarily_closed") {
    return (
      <div className={styles.lifecycleBanner} role="status">
        <strong>{businessName} is temporarily closed.</strong>{" "}
        {operations.temporaryClosedUntil
          ? `The business expects to reopen after ${formatDate(operations.temporaryClosedUntil)}.`
          : "Check the contact options for updates."}
      </div>
    );
  }
  if (operations.lifecycleState === "permanently_closed") {
    return (
      <div className={styles.lifecycleBanner} role="status">
        <strong>{businessName} is marked as permanently closed.</strong> This
        limited page remains available to reduce confusion. Please report an
        error if the business is still trading.
      </div>
    );
  }
  return null;
}

export function BusinessCategoryFeatureSections({
  operations,
}: {
  operations: PublicBusinessOperations;
}) {
  return (
    <>
      {operations.categorySections.map((section) => (
        <section
          className={styles.section}
          id={`feature-${section.id}`}
          aria-labelledby={`feature-heading-${section.id}`}
          key={section.id}
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>
                {section.sectionType.replaceAll("_", " ")}
              </p>
              <h2 id={`feature-heading-${section.id}`}>{section.title}</h2>
            </div>
          </div>
          <ul className={styles.itemGrid}>
            {section.entries.map((entry, index) => (
              <li
                className={`${styles.itemCard} ${styles.featureEntry}`}
                key={`${entry.title}-${index}`}
              >
                <div className={styles.itemBody}>
                  <h3>{entry.title}</h3>
                  {entry.description ? <p>{entry.description}</p> : null}
                  {entry.meta ? (
                    <p className={styles.itemMeta}>{entry.meta}</p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

/** Share and save, kept as one quiet strip instead of two stray widgets. */
export function BusinessSiteTools({ children }: { children: ReactNode }) {
  return (
    <div className={styles.siteTools} data-print="hide">
      <p>Like what you see?</p>
      <div>{children}</div>
    </div>
  );
}
