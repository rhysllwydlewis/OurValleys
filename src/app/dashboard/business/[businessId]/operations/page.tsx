import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { isMediaStorageConfigured } from "@/lib/media-storage";
import { getBusinessAnalyticsSummary } from "@/modules/businesses/analytics";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  categorySectionTypes,
  getBusinessMenuDocument,
  listBusinessEvents,
  listBusinessMenu,
  listBusinessOffers,
  listCategorySections,
} from "@/modules/businesses/content-features";
import {
  contactMethodTypes,
  listBusinessContactMethods,
  listBusinessEnquiries,
} from "@/modules/businesses/contacts-and-enquiries";
import { getBusinessEntitlement } from "@/modules/businesses/entitlements";
import {
  ensureBusinessLifecycle,
  getAutomaticPublicationEligibility,
} from "@/modules/businesses/lifecycle-automation";
import {
  businessPermissions,
  canUserAccessBusiness,
} from "@/modules/businesses/permissions";
import styles from "./operations.module.css";
import {
  acceptTermsAction,
  configureAutoPublishAction,
  confirmTradingAction,
  lifecycleAction,
  postponeAutoPublishAction,
  removeCategorySectionAction,
  removeContactAction,
  removeEventAction,
  removeMenuAction,
  removeMenuDocumentAction,
  removeOfferAction,
  saveCategorySectionAction,
  saveContactAction,
  saveEventAction,
  saveMenuGroupAction,
  saveMenuItemAction,
  saveOfferAction,
  updateEnquiryAction,
  uploadMenuDocumentAction,
} from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Operate your business website",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ businessId: string }>;
  searchParams: Promise<{ outcome?: string }>;
};

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

const outcomeMessages: Record<string, string> = {
  "contact-saved": "Contact method saved.",
  removed: "Item removed safely.",
  updated: "Status updated.",
  "offer-saved": "Offer saved.",
  "event-saved": "Event saved.",
  "menu-saved": "Menu updated.",
  "section-saved": "Category section saved.",
  "document-saved": "Menu document uploaded.",
  "terms-accepted": "The current business website terms have been accepted.",
  "auto-publish-updated": "Automatic publication preference updated.",
  confirmed: "Trading status confirmed for another 12 months.",
  invalid: "Check the submitted information and try again.",
  forbidden: "Your membership does not permit that action.",
  unavailable: "That action is temporarily unavailable. Nothing was changed.",
  storage_unavailable: "Document storage is not configured yet.",
};

function dateInput(value: Date | null): string {
  if (!value) return "";
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDate(value: Date | null): string {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

function hidden(name: string, value: string) {
  return <input type="hidden" name={name} value={value} />;
}

export default async function BusinessOperationsPage({
  params,
  searchParams,
}: PageProps) {
  const session = await getAuth()
    .api.getSession({ headers: await headers() })
    .catch(() => null);
  if (!session) redirect("/login?next=/account");

  const { businessId } = await params;
  if (!z.uuid().safeParse(businessId).success) notFound();
  const canView = await canUserAccessBusiness({
    userId: session.user.id,
    businessId,
    permission: businessPermissions.view,
  });
  if (!canView) notFound();

  const [
    canContacts,
    canEnquiries,
    canContent,
    canLifecycle,
    canPublish,
    canAnalytics,
    memberships,
    contacts,
    enquiries,
    offers,
    events,
    menu,
    categorySections,
    menuDocument,
    lifecycle,
    eligibility,
    analytics,
    entitlement,
  ] = await Promise.all([
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.manageContacts,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.manageEnquiries,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.manageContent,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.manageLifecycle,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.publish,
    }),
    canUserAccessBusiness({
      userId: session.user.id,
      businessId,
      permission: businessPermissions.viewAnalytics,
    }),
    listAccessibleBusinesses(session.user.id),
    listBusinessContactMethods(businessId),
    listBusinessEnquiries(businessId),
    listBusinessOffers(businessId),
    listBusinessEvents(businessId),
    listBusinessMenu(businessId),
    listCategorySections(businessId),
    getBusinessMenuDocument(businessId),
    ensureBusinessLifecycle(businessId),
    getAutomaticPublicationEligibility(businessId),
    getBusinessAnalyticsSummary(businessId),
    getBusinessEntitlement(businessId),
  ]);
  const businessSummary = memberships.find((item) => item.id === businessId);
  if (!businessSummary) notFound();
  const { outcome } = await searchParams;

  return (
    <>
      <SiteHeader />
      <main className={styles.shell}>
        <nav aria-label="Breadcrumb">
          <Link href={`/dashboard/business/${businessId}` as Route}>
            ← Business dashboard
          </Link>
        </nav>
        <header className={styles.hero}>
          <p className="eyebrow">Business operations</p>
          <h1>{businessSummary.tradingName}</h1>
          <p className="lead">
            Manage how customers contact you, respond to enquiries, publish
            timely content, keep the website current and understand simple
            results.
          </p>
        </header>
        <div className={styles.toolbar}>
          <Link
            className="button"
            href={`/dashboard/business/${businessId}/preview` as Route}
          >
            Preview website
          </Link>
          <Link className="button" href={`/b/${businessSummary.slug}` as Route}>
            Open published website
          </Link>
          <Link
            className="button"
            href={`/b/${businessSummary.slug}/qr` as Route}
          >
            QR code
          </Link>
        </div>
        {outcome && outcomeMessages[outcome] ? (
          <p className={styles.notice} role="status">
            {outcomeMessages[outcome]}
          </p>
        ) : null}

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
                  <select
                    id="new-contact-type"
                    name="type"
                    defaultValue="enquiry"
                  >
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
                  <input type="checkbox" name="enabled" defaultChecked />{" "}
                  Enabled
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

        <section
          className={styles.section}
          id="inbox"
          aria-labelledby="inbox-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Protected inbox</p>
              <h2 id="inbox-title">Customer enquiries</h2>
            </div>
            <p className={styles.meta}>
              {enquiries.length} retained message
              {enquiries.length === 1 ? "" : "s"}
            </p>
          </div>
          {enquiries.length === 0 ? (
            <p className={styles.empty}>
              No enquiries yet. Configure an enquiry, quote or callback action
              to receive messages here.
            </p>
          ) : (
            <ol className={styles.list}>
              {enquiries.map((enquiry) => (
                <li className={styles.inboxItem} key={enquiry.id}>
                  <div>
                    <strong>{enquiry.senderName}</strong> · {enquiry.kind} ·{" "}
                    {formatDate(enquiry.submittedAt)}
                  </div>
                  <p>{enquiry.message}</p>
                  <p className={styles.meta}>
                    {enquiry.senderEmail ?? "No email"} ·{" "}
                    {enquiry.senderPhone ?? "No phone"}
                    {enquiry.preferredTime ? ` · ${enquiry.preferredTime}` : ""}
                  </p>
                  {canEnquiries ? (
                    <form
                      className={styles.actions}
                      action={updateEnquiryAction}
                    >
                      {hidden("businessId", businessId)}
                      {hidden("enquiryId", enquiry.id)}
                      <label htmlFor={`status-${enquiry.id}`}>Status</label>
                      <select
                        id={`status-${enquiry.id}`}
                        name="status"
                        defaultValue={enquiry.status}
                      >
                        {["new", "read", "replied", "archived", "spam"].map(
                          (status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ),
                        )}
                      </select>
                      <button className="button" type="submit">
                        Update
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ol>
          )}
        </section>

        <section
          className={styles.section}
          id="offers"
          aria-labelledby="offers-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Phase 9</p>
              <h2 id="offers-title">Special offers</h2>
            </div>
            <p className={styles.meta}>
              Expired offers disappear from the public site automatically.
            </p>
          </div>
          <div className={styles.grid}>
            {offers.map((offer) => (
              <form
                className={styles.card}
                action={saveOfferAction}
                key={offer.id}
              >
                {hidden("businessId", businessId)}
                {hidden("offerId", offer.id)}
                <div className={styles.field}>
                  <label htmlFor={`offer-title-${offer.id}`}>Title</label>
                  <input
                    id={`offer-title-${offer.id}`}
                    name="title"
                    defaultValue={offer.title}
                    disabled={!canContent}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`offer-description-${offer.id}`}>
                    Description
                  </label>
                  <textarea
                    id={`offer-description-${offer.id}`}
                    name="description"
                    defaultValue={offer.description}
                    disabled={!canContent}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`offer-terms-${offer.id}`}>Terms</label>
                  <textarea
                    id={`offer-terms-${offer.id}`}
                    name="terms"
                    defaultValue={offer.terms ?? ""}
                    disabled={!canContent}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`offer-url-${offer.id}`}>Action URL</label>
                  <input
                    id={`offer-url-${offer.id}`}
                    name="actionUrl"
                    type="url"
                    defaultValue={offer.actionUrl ?? ""}
                    disabled={!canContent}
                  />
                </div>
                <input
                  type="hidden"
                  name="actionLabel"
                  value={offer.actionLabel ?? "View offer"}
                />
                <input
                  type="hidden"
                  name="startsAt"
                  value={dateInput(offer.startsAt)}
                />
                <input
                  type="hidden"
                  name="endsAt"
                  value={dateInput(offer.endsAt)}
                />
                <input type="hidden" name="sortOrder" value={offer.sortOrder} />
                <div className={styles.field}>
                  <label htmlFor={`offer-status-${offer.id}`}>Status</label>
                  <select
                    id={`offer-status-${offer.id}`}
                    name="status"
                    defaultValue={offer.status}
                    disabled={!canContent}
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </div>
                {canContent ? (
                  <button className="button primary" type="submit">
                    Save offer
                  </button>
                ) : null}
              </form>
            ))}
            {canContent ? (
              <form className={styles.card} action={saveOfferAction}>
                {hidden("businessId", businessId)}
                <h3>Add an offer</h3>
                <div className={styles.field}>
                  <label htmlFor="offer-new-title">Title</label>
                  <input id="offer-new-title" name="title" required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="offer-new-description">Description</label>
                  <textarea
                    id="offer-new-description"
                    name="description"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="offer-new-start">Starts</label>
                  <input
                    id="offer-new-start"
                    name="startsAt"
                    type="datetime-local"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="offer-new-end">Ends</label>
                  <input
                    id="offer-new-end"
                    name="endsAt"
                    type="datetime-local"
                  />
                </div>
                <input type="hidden" name="terms" value="" />
                <input type="hidden" name="actionLabel" value="View offer" />
                <input type="hidden" name="actionUrl" value="" />
                <input type="hidden" name="sortOrder" value={offers.length} />
                <select name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
                <button className="button primary" type="submit">
                  Add offer
                </button>
              </form>
            ) : null}
          </div>
          {canContent && offers.length > 0 ? (
            <div className={styles.actions}>
              {offers.map((offer) => (
                <form action={removeOfferAction} key={offer.id}>
                  {hidden("businessId", businessId)}
                  {hidden("offerId", offer.id)}
                  <button className={`button ${styles.danger}`} type="submit">
                    Remove {offer.title}
                  </button>
                </form>
              ))}
            </div>
          ) : null}
        </section>

        <section
          className={styles.section}
          id="events"
          aria-labelledby="events-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">One event, multiple surfaces</p>
              <h2 id="events-title">Events</h2>
            </div>
            <Link href="/events">Open public events</Link>
          </div>
          <div className={styles.grid}>
            {events.map((event) => (
              <form
                className={styles.card}
                action={saveEventAction}
                key={event.id}
              >
                {hidden("businessId", businessId)}
                {hidden("eventId", event.id)}
                <div className={styles.field}>
                  <label htmlFor={`event-title-${event.id}`}>Title</label>
                  <input
                    id={`event-title-${event.id}`}
                    name="title"
                    defaultValue={event.title}
                    disabled={!canContent}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`event-description-${event.id}`}>
                    Description
                  </label>
                  <textarea
                    id={`event-description-${event.id}`}
                    name="description"
                    defaultValue={event.description}
                    disabled={!canContent}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`event-start-${event.id}`}>Starts</label>
                  <input
                    id={`event-start-${event.id}`}
                    name="startsAt"
                    type="datetime-local"
                    defaultValue={dateInput(event.startsAt)}
                    disabled={!canContent}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor={`event-end-${event.id}`}>Ends</label>
                  <input
                    id={`event-end-${event.id}`}
                    name="endsAt"
                    type="datetime-local"
                    defaultValue={dateInput(event.endsAt)}
                    disabled={!canContent}
                  />
                </div>
                <input
                  type="hidden"
                  name="locationDisplay"
                  value={event.locationDisplay ?? ""}
                />
                <input
                  type="hidden"
                  name="bookingUrl"
                  value={event.bookingUrl ?? ""}
                />
                <select
                  name="status"
                  defaultValue={event.status}
                  disabled={!canContent}
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="hidden">Hidden</option>
                </select>
                {canContent ? (
                  <button className="button primary" type="submit">
                    Save event
                  </button>
                ) : null}
              </form>
            ))}
            {canContent ? (
              <form className={styles.card} action={saveEventAction}>
                {hidden("businessId", businessId)}
                <h3>Add an event</h3>
                <div className={styles.field}>
                  <label htmlFor="event-new-title">Title</label>
                  <input id="event-new-title" name="title" required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="event-new-description">Description</label>
                  <textarea
                    id="event-new-description"
                    name="description"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="event-new-start">Starts</label>
                  <input
                    id="event-new-start"
                    name="startsAt"
                    type="datetime-local"
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="event-new-end">Ends</label>
                  <input
                    id="event-new-end"
                    name="endsAt"
                    type="datetime-local"
                  />
                </div>
                <input type="hidden" name="locationDisplay" value="" />
                <input type="hidden" name="bookingUrl" value="" />
                <select name="status" defaultValue="draft">
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                </select>
                <button className="button primary" type="submit">
                  Add event
                </button>
              </form>
            ) : null}
          </div>
          {canContent && events.length > 0 ? (
            <div className={styles.actions}>
              {events.map((event) => (
                <form action={removeEventAction} key={event.id}>
                  {hidden("businessId", businessId)}
                  {hidden("eventId", event.id)}
                  <button className={`button ${styles.danger}`} type="submit">
                    Remove {event.title}
                  </button>
                </form>
              ))}
            </div>
          ) : null}
        </section>

        <section
          className={styles.section}
          id="menu"
          aria-labelledby="menu-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Structured or quick upload</p>
              <h2 id="menu-title">Menu</h2>
            </div>
            <p className={styles.meta}>
              Structured content is accessible and searchable; a PDF or image is
              available as a quick route.
            </p>
          </div>
          {menu.length === 0 ? (
            <p className={styles.empty}>No structured menu groups yet.</p>
          ) : (
            <div className={styles.grid}>
              {menu.map((group) => (
                <article className={styles.card} key={group.id}>
                  <h3>{group.name}</h3>
                  <p>{group.description}</p>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <strong>{item.name}</strong>
                        {item.priceDisplay ? ` — ${item.priceDisplay}` : ""}
                        {item.description ? <p>{item.description}</p> : null}
                      </li>
                    ))}
                  </ul>
                  {canContent ? (
                    <form action={removeMenuAction}>
                      {hidden("businessId", businessId)}
                      {hidden("groupId", group.id)}
                      <button
                        className={`button ${styles.danger}`}
                        type="submit"
                      >
                        Remove group
                      </button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          )}
          {canContent ? (
            <div className={styles.grid}>
              <form className={styles.card} action={saveMenuGroupAction}>
                {hidden("businessId", businessId)}
                <h3>Add menu group</h3>
                <div className={styles.field}>
                  <label htmlFor="menu-group-name">Name</label>
                  <input id="menu-group-name" name="name" required />
                </div>
                <div className={styles.field}>
                  <label htmlFor="menu-group-description">Description</label>
                  <textarea id="menu-group-description" name="description" />
                </div>
                <input type="hidden" name="sortOrder" value={menu.length} />
                <input type="hidden" name="status" value="active" />
                <button className="button primary" type="submit">
                  Add group
                </button>
              </form>
              {menu.length > 0 ? (
                <form className={styles.card} action={saveMenuItemAction}>
                  {hidden("businessId", businessId)}
                  <h3>Add menu item</h3>
                  <div className={styles.field}>
                    <label htmlFor="menu-item-group">Group</label>
                    <select id="menu-item-group" name="groupId">
                      {menu.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="menu-item-name">Name</label>
                    <input id="menu-item-name" name="name" required />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="menu-item-description">Description</label>
                    <textarea id="menu-item-description" name="description" />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="menu-item-price">Price</label>
                    <input id="menu-item-price" name="priceDisplay" />
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="menu-item-labels">
                      Dietary/allergen labels, comma-separated
                    </label>
                    <input id="menu-item-labels" name="dietaryLabels" />
                  </div>
                  <input type="hidden" name="sortOrder" value="0" />
                  <label className={styles.check}>
                    <input type="checkbox" name="available" defaultChecked />{" "}
                    Available
                  </label>
                  <label className={styles.check}>
                    <input type="checkbox" name="featured" /> Featured
                  </label>
                  <button className="button primary" type="submit">
                    Add item
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}
          <div className={styles.card}>
            {menuDocument ? (
              <>
                <h3>{menuDocument.displayName}</h3>
                <p>
                  {Math.ceil(menuDocument.byteSize / 1024)} KB ·{" "}
                  {menuDocument.contentType}
                </p>
                {menuDocument.url ? (
                  <a href={menuDocument.url}>Open uploaded menu</a>
                ) : (
                  <p>Public media URL is not configured.</p>
                )}
                {canContent ? (
                  <form action={removeMenuDocumentAction}>
                    {hidden("businessId", businessId)}
                    <button className={`button ${styles.danger}`} type="submit">
                      Remove uploaded menu
                    </button>
                  </form>
                ) : null}
              </>
            ) : canContent ? (
              <form className={styles.form} action={uploadMenuDocumentAction}>
                {hidden("businessId", businessId)}
                <h3>Quick menu upload</h3>
                <input
                  name="file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  required
                  disabled={!isMediaStorageConfigured()}
                />
                <p className={styles.meta}>
                  {isMediaStorageConfigured()
                    ? "PDF, JPEG, PNG or WebP up to 8 MB."
                    : "R2 storage must be configured before uploads open."}
                </p>
                <button
                  className="button"
                  type="submit"
                  disabled={!isMediaStorageConfigured()}
                >
                  Upload menu
                </button>
              </form>
            ) : (
              <p>No menu document uploaded.</p>
            )}
          </div>
        </section>

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
                      <button
                        className={`button ${styles.danger}`}
                        type="submit"
                      >
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
                <textarea
                  id="category-section-entries"
                  name="entries"
                  required
                />
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

        <section
          className={styles.section}
          id="lifecycle"
          aria-labelledby="lifecycle-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Phase 10</p>
              <h2 id="lifecycle-title">Publication and lifecycle</h2>
            </div>
            <p className={styles.meta}>
              Current state: {lifecycle?.state ?? "unavailable"}
            </p>
          </div>
          <div className={styles.grid}>
            <article className={styles.card}>
              <h3>Publication eligibility</h3>
              {eligibility.eligible ? (
                <p>All automated checks pass.</p>
              ) : (
                <>
                  <p>Complete these before automatic publication:</p>
                  <ul>
                    {eligibility.missing.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              <p className={styles.meta}>
                Terms accepted: {lifecycle?.termsAccepted ? "Yes" : "No"}
              </p>
              {canPublish && !lifecycle?.termsAccepted ? (
                <form action={acceptTermsAction}>
                  {hidden("businessId", businessId)}
                  <label className={styles.check}>
                    <input type="checkbox" name="acceptTerms" required /> I
                    confirm the business information is accurate, I have a
                    reasonable basis to manage it, and I accept the current free
                    website terms.
                  </label>
                  <button className="button primary" type="submit">
                    Accept terms
                  </button>
                </form>
              ) : null}
            </article>
            <article className={styles.card}>
              <h3>Automatic publication</h3>
              <p>
                {lifecycle?.autoPublishEnabled
                  ? `Scheduled for ${formatDate(lifecycle.autoPublishAt)}`
                  : "Off. Nothing will publish automatically."}
              </p>
              {canPublish ? (
                <>
                  <form action={configureAutoPublishAction}>
                    {hidden("businessId", businessId)}
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        name="enabled"
                        defaultChecked={lifecycle?.autoPublishEnabled}
                      />{" "}
                      Publish automatically after the 14-day reminder period
                      when eligible
                    </label>
                    <button className="button" type="submit">
                      Save preference
                    </button>
                  </form>
                  {lifecycle?.autoPublishEnabled ? (
                    <form action={postponeAutoPublishAction}>
                      {hidden("businessId", businessId)}
                      <div className={styles.field}>
                        <label htmlFor="postpone-until">Postpone until</label>
                        <input
                          id="postpone-until"
                          name="until"
                          type="datetime-local"
                          required
                        />
                      </div>
                      <button className="button" type="submit">
                        Postpone
                      </button>
                    </form>
                  ) : null}
                </>
              ) : null}
            </article>
            <article className={styles.card}>
              <h3>Trading confirmation</h3>
              <p>
                Last confirmed: {formatDate(lifecycle?.lastConfirmedAt ?? null)}
              </p>
              <p>
                Next due: {formatDate(lifecycle?.nextConfirmationDueAt ?? null)}
              </p>
              {canLifecycle ? (
                <form action={confirmTradingAction}>
                  {hidden("businessId", businessId)}
                  <button className="button primary" type="submit">
                    Confirm still trading
                  </button>
                </form>
              ) : null}
            </article>
            {canLifecycle ? (
              <article className={styles.card}>
                <h3>Pause, close or recover</h3>
                <form className={styles.form} action={lifecycleAction}>
                  {hidden("businessId", businessId)}
                  <div className={styles.field}>
                    <label htmlFor="lifecycle-action">Action</label>
                    <select
                      id="lifecycle-action"
                      name="action"
                      defaultValue="pause"
                    >
                      <option value="pause">Pause/unpublish</option>
                      <option value="resume">Resume</option>
                      <option value="temporary_close">Temporarily close</option>
                      <option value="permanent_close">
                        Mark permanently closed
                      </option>
                      <option value="request_deletion">
                        Request recoverable deletion
                      </option>
                      <option value="cancel_deletion">
                        Cancel deletion request
                      </option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label htmlFor="temporary-close-until">
                      Temporary closure ends
                    </label>
                    <input
                      id="temporary-close-until"
                      name="temporaryClosedUntil"
                      type="datetime-local"
                    />
                  </div>
                  <button className="button" type="submit">
                    Apply lifecycle action
                  </button>
                </form>
                {lifecycle?.deleteAfter ? (
                  <p className={styles.meta}>
                    Deletion remains recoverable until{" "}
                    {formatDate(lifecycle.deleteAfter)}. No automated hard
                    deletion is activated.
                  </p>
                ) : null}
              </article>
            ) : null}
          </div>
        </section>

        <section
          className={styles.section}
          id="analytics"
          aria-labelledby="analytics-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className="eyebrow">Phase 11</p>
              <h2 id="analytics-title">Promotion and insight</h2>
            </div>
            <p className={styles.meta}>
              Simple aggregate counts for the last {analytics.periodDays} days.
            </p>
          </div>
          {canAnalytics ? (
            <div className={styles.analytics}>
              <div className={styles.metric}>
                <strong>{analytics.totalViews}</strong>
                <span>website views</span>
              </div>
              <div className={styles.metric}>
                <strong>{analytics.searchAppearances}</strong>
                <span>search appearances</span>
              </div>
              <div className={styles.metric}>
                <strong>{analytics.contactActions}</strong>
                <span>contact-button uses</span>
              </div>
              <div className={styles.metric}>
                <strong>{analytics.enquiries}</strong>
                <span>enquiries</span>
              </div>
              <div className={styles.metric}>
                <strong>{analytics.qrVisits}</strong>
                <span>QR visits</span>
              </div>
            </div>
          ) : (
            <p className={styles.empty}>
              Your membership cannot view analytics.
            </p>
          )}
          <div className={styles.toolbar}>
            <Link
              className="button"
              href={`/b/${businessSummary.slug}/qr` as Route}
            >
              View or print QR code
            </Link>
            <Link
              className="button"
              href={`/b/${businessSummary.slug}` as Route}
            >
              Share website
            </Link>
          </div>
        </section>

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
      </main>
      <SiteFooter />
    </>
  );
}
