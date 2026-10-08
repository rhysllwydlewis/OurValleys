import { authoredTextLang } from "@/lib/i18n/business-copy";
import { getTranslator } from "@/lib/i18n/server";
import { businessPermissions } from "@/modules/businesses/permissions";
import { listBusinessOffers } from "@/modules/businesses/content-features";
import { removeOfferAction, saveOfferAction } from "../actions";
import styles from "../operations.module.css";
import { isMediaStorageConfigured } from "@/lib/media-storage";
import { ContentImageFields } from "./content-image-fields";
import { dateInput, hidden, hasPermission } from "./shared";

export async function OffersSection({
  businessId,
  userId,
}: {
  businessId: string;
  userId: string;
}) {
  const { t } = await getTranslator();
  const canContentPromise = hasPermission(
    userId,
    businessId,
    businessPermissions.manageContent,
  );
  const offers = await listBusinessOffers(businessId);
  const canContent = await canContentPromise;
  const uploadsEnabled = isMediaStorageConfigured();

  return (
    <section
      className={styles.section}
      id="offers"
      aria-labelledby="offers-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className="eyebrow">{t("ops.phase", { n: 9 })}</p>
          <h2 id="offers-title">{t("ops.offers.title")}</h2>
        </div>
        <p className={styles.meta}>{t("ops.offers.meta")}</p>
      </div>
      <div className={styles.grid}>
        {offers.map((offer) => (
          <form className={styles.card} action={saveOfferAction} key={offer.id}>
            {hidden("businessId", businessId)}
            {hidden("offerId", offer.id)}
            <div className={styles.field}>
              <label htmlFor={`offer-title-${offer.id}`}>
                {t("ops.common.title")}
              </label>
              <input
                id={`offer-title-${offer.id}`}
                lang={authoredTextLang}
                name="title"
                defaultValue={offer.title}
                disabled={!canContent}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`offer-description-${offer.id}`}>
                {t("ops.common.description")}
              </label>
              <textarea
                id={`offer-description-${offer.id}`}
                lang={authoredTextLang}
                name="description"
                defaultValue={offer.description}
                disabled={!canContent}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`offer-terms-${offer.id}`}>
                {t("ops.offers.terms")}
              </label>
              <textarea
                id={`offer-terms-${offer.id}`}
                lang={authoredTextLang}
                name="terms"
                defaultValue={offer.terms ?? ""}
                disabled={!canContent}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor={`offer-url-${offer.id}`}>
                {t("ops.offers.actionUrl")}
              </label>
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
            <ContentImageFields
              idPrefix={`offer-${offer.id}`}
              image={offer.image}
              canEdit={canContent}
              uploadsEnabled={uploadsEnabled}
              noun="offer"
            />
            <div className={styles.field}>
              <label htmlFor={`offer-status-${offer.id}`}>
                {t("ops.common.status")}
              </label>
              <select
                id={`offer-status-${offer.id}`}
                name="status"
                defaultValue={offer.status}
                disabled={!canContent}
              >
                <option value="draft">{t("ops.common.draft")}</option>
                <option value="active">{t("ops.common.active")}</option>
                <option value="hidden">{t("ops.common.hidden")}</option>
              </select>
            </div>
            {canContent ? (
              <button className="button primary" type="submit">
                {t("ops.offers.save")}
              </button>
            ) : null}
          </form>
        ))}
        {canContent ? (
          <form className={styles.card} action={saveOfferAction}>
            {hidden("businessId", businessId)}
            <h3>{t("ops.offers.addTitle")}</h3>
            <div className={styles.field}>
              <label htmlFor="offer-new-title">{t("ops.common.title")}</label>
              <input id="offer-new-title" name="title" required />
            </div>
            <div className={styles.field}>
              <label htmlFor="offer-new-description">
                {t("ops.common.description")}
              </label>
              <textarea
                id="offer-new-description"
                name="description"
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="offer-new-start">{t("ops.common.starts")}</label>
              <input
                id="offer-new-start"
                name="startsAt"
                type="datetime-local"
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="offer-new-end">{t("ops.common.ends")}</label>
              <input id="offer-new-end" name="endsAt" type="datetime-local" />
            </div>
            <ContentImageFields
              idPrefix="offer-new"
              image={null}
              canEdit={canContent}
              uploadsEnabled={uploadsEnabled}
              noun="offer"
            />
            <input type="hidden" name="terms" value="" />
            <input type="hidden" name="actionLabel" value="View offer" />
            <input type="hidden" name="actionUrl" value="" />
            <input type="hidden" name="sortOrder" value={offers.length} />
            <select
              name="status"
              defaultValue="draft"
              aria-label={t("ops.offers.statusAria")}
            >
              <option value="draft">{t("ops.common.draft")}</option>
              <option value="active">{t("ops.common.active")}</option>
            </select>
            <button className="button primary" type="submit">
              {t("ops.offers.add")}
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
                {t("ops.common.removeNamed", { name: offer.title })}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </section>
  );
}
