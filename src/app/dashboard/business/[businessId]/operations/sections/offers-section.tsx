import { businessPermissions } from "@/modules/businesses/permissions";
import { listBusinessOffers } from "@/modules/businesses/content-features";
import { removeOfferAction, saveOfferAction } from "../actions";
import styles from "../operations.module.css";
import { dateInput, hidden, hasPermission } from "./shared";

export async function OffersSection({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
  const canContentPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.manageContent,
  );
  const offers = await listBusinessOffers(businessId);
  const canContent = await canContentPromise;

  return (
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
          <form className={styles.card} action={saveOfferAction} key={offer.id}>
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
              <input id="offer-new-end" name="endsAt" type="datetime-local" />
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
  );
}
