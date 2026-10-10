import type { ReactNode } from "react";
import { attributeCopy } from "@/lib/i18n/business-copy";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
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
import {
  sectionCopyView,
  type BusinessOperationSectionId,
  type BusinessSectionCopy,
} from "@/modules/businesses/appearance";
import type { PublicContactAction } from "@/modules/businesses/contacts-and-enquiries";
import type { PublicBusinessOperations } from "@/modules/businesses/public-operations";
import styles from "./generated-business-website.module.css";

function formatDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

function formatDay(value: Date, locale: Locale) {
  const zone = "Europe/London";
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;
  return {
    day: new Intl.DateTimeFormat(htmlLang, {
      day: "numeric",
      timeZone: zone,
    }).format(value),
    month: new Intl.DateTimeFormat(htmlLang, {
      month: "short",
      timeZone: zone,
    }).format(value),
  };
}

const sectionTypeKeys = [
  "areas_covered",
  "treatments",
  "facilities",
  "products",
  "team",
  "faq",
] as const;

function sectionTypeLabel(t: Translator, type: string): string {
  return (sectionTypeKeys as readonly string[]).includes(type)
    ? t(`ops.sections.type.${type as (typeof sectionTypeKeys)[number]}`)
    : type.replaceAll("_", " ");
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
  /** The reader's language, for the site's own wording and dates. */
  locale: Locale;
  t: Translator;
  /** The owner's own section headings and intros; absent means standard wording. */
  sectionCopy?: BusinessSectionCopy;
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
  const { businessId, businessSlug, businessName, operations, locale, t } =
    context;
  // Owner-typed text is data: it is marked as English while the page is Welsh.
  const authoredLang = locale === "cy" ? "en-GB" : undefined;
  const preview = context.preview ?? false;
  const declared = listDeclaredAttributes(context.attributes);
  const hasMenu =
    operations.menu.length > 0 || Boolean(operations.menuDocument?.url);
  const renderers: OperationSectionRenderers = {};
  const copyFor = (id: BusinessOperationSectionId) =>
    sectionCopyView(context.sectionCopy ?? {}, id, locale);
  const intro = (id: BusinessOperationSectionId) => {
    const view = copyFor(id).intro;
    return view ? (
      <p className={styles.sectionLead} lang={view.lang}>
        {view.text}
      </p>
    ) : null;
  };

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
          <p className={styles.eyebrow}>{t("site.contact.eyebrow")}</p>
          <h2 id="contact-heading" lang={copyFor("contact").heading?.lang}>
            {copyFor("contact").heading?.text ??
              t("site.contact.title", { business: businessName })}
          </h2>
          {intro("contact")}
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
            <p className={styles.eyebrow}>{t("site.offers.eyebrow")}</p>
            <h2 id="offers-heading" lang={copyFor("offers").heading?.lang}>
              {copyFor("offers").heading?.text ??
                t("site.offers.title", { business: businessName })}
            </h2>
          </div>
          {intro("offers")}
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
                <h3 lang={authoredLang}>{offer.title}</h3>
                <p lang={authoredLang}>{offer.description}</p>
                {offer.endsAt ? (
                  <p className={styles.itemMeta}>
                    {t("site.offers.ends", {
                      date: formatDate(offer.endsAt, locale),
                    })}
                  </p>
                ) : null}
                {offer.terms ? (
                  <details className={styles.terms}>
                    <summary>{t("site.offers.terms")}</summary>
                    <p lang={authoredLang}>{offer.terms}</p>
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
                  {offer.actionLabel ?? t("site.offers.view")}
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
            <p className={styles.eyebrow}>{t("site.events.eyebrow")}</p>
            <h2 id="events-heading" lang={copyFor("events").heading?.lang}>
              {copyFor("events").heading?.text ?? t("site.events.title")}
            </h2>
          </div>
          {intro("events")}
        </div>
        <div
          className={
            layout === "timeline" ? styles.itemTimeline : styles.itemGrid
          }
        >
          {operations.events.map((event) => {
            const when = formatDay(event.startsAt, locale);
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
                  <h3 lang={authoredLang}>{event.title}</h3>
                  <p className={styles.itemMeta}>
                    <time dateTime={event.startsAt.toISOString()}>
                      {formatDate(event.startsAt, locale)}
                    </time>
                    {event.locationDisplay ? (
                      <span lang={authoredLang}>
                        {` · ${event.locationDisplay}`}
                      </span>
                    ) : null}
                  </p>
                  <p lang={authoredLang}>{event.description}</p>
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
                    {t("site.events.book")}
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
            <p className={styles.eyebrow}>{t("site.menu.eyebrow")}</p>
            <h2 id="menu-heading" lang={copyFor("menu").heading?.lang}>
              {copyFor("menu").heading?.text ?? t("site.menu.title")}
            </h2>
          </div>
          {intro("menu")}
        </div>
        {operations.menu.length > 0 ? (
          <div
            className={
              layout === "compact" ? styles.menuCompact : styles.menuColumns
            }
          >
            {operations.menu.map((group) => (
              <article
                className={styles.menuGroup}
                key={group.id}
                lang={authoredLang}
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
              {t("site.menu.open", {
                name: operations.menuDocument.displayName,
              })}
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
            <p className={styles.eyebrow}>{t("site.practical.eyebrow")}</p>
            <h2
              id="accessibility-heading"
              lang={copyFor("accessibility").heading?.lang}
            >
              {copyFor("accessibility").heading?.text ??
                t("site.practical.title")}
            </h2>
          </div>
          {intro("accessibility")}
        </div>
        <ul
          className={
            layout === "list" ? styles.attributeList : styles.attributeChips
          }
        >
          {declared.map((definition) => {
            const copy = attributeCopy(t, definition.key);
            return (
              <li key={definition.key} title={copy.description}>
                {copy.label}
              </li>
            );
          })}
        </ul>
        <p className={styles.footnote}>{t("site.practical.note")}</p>
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
export async function BusinessLifecycleBanner({
  businessName,
  operations,
}: {
  businessName: string;
  operations: PublicBusinessOperations;
}) {
  const { locale, t } = await getTranslator();
  if (operations.lifecycleState === "temporarily_closed") {
    return (
      <div className={styles.lifecycleBanner} role="status">
        <strong>
          {t("site.closed.temporary", { business: businessName })}
        </strong>{" "}
        {operations.temporaryClosedUntil
          ? t("site.closed.reopen", {
              date: formatDate(operations.temporaryClosedUntil, locale),
            })
          : t("site.closed.updates")}
      </div>
    );
  }
  if (operations.lifecycleState === "permanently_closed") {
    return (
      <div className={styles.lifecycleBanner} role="status">
        <strong>
          {t("site.closed.permanent", { business: businessName })}
        </strong>{" "}
        {t("site.closed.permanentBody")}
      </div>
    );
  }
  return null;
}

export async function BusinessCategoryFeatureSections({
  operations,
}: {
  operations: PublicBusinessOperations;
}) {
  const { locale, t } = await getTranslator();
  const authoredLang = locale === "cy" ? "en-GB" : undefined;
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
                {sectionTypeLabel(t, section.sectionType)}
              </p>
              <h2 id={`feature-heading-${section.id}`} lang={authoredLang}>
                {section.title}
              </h2>
            </div>
          </div>
          <ul className={styles.itemGrid}>
            {section.entries.map((entry, index) => (
              <li
                className={`${styles.itemCard} ${styles.featureEntry}`}
                key={`${entry.title}-${index}`}
              >
                <div className={styles.itemBody} lang={authoredLang}>
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
export async function BusinessSiteTools({ children }: { children: ReactNode }) {
  const { t } = await getTranslator();
  return (
    <div className={styles.siteTools} data-print="hide">
      <p>{t("site.tools.prompt")}</p>
      <div>{children}</div>
    </div>
  );
}
