import Link from "next/link";
import { BusinessRatingTag } from "@/components/business-rating-tag";
import { businessCardArtStyle } from "@/lib/business-card-art";
import type { Translator } from "@/lib/i18n/translate";
import { getInitials } from "@/lib/initials";
import { isNewListing } from "@/modules/businesses/directory-sort";
import type { PublicBusinessSummary } from "@/modules/businesses/types";
import styles from "./directory.module.css";

/**
 * One business in the directory results. Only fields of the public listing
 * summary are used; the owner's private data never reaches this component.
 */
export function DirectoryCard({
  t,
  business,
  categoryName,
  placeName,
  welsh = false,
}: {
  t: Translator;
  business: PublicBusinessSummary;
  categoryName: string;
  placeName: string;
  /** Show the owner's Welsh summary, where they wrote one. */
  welsh?: boolean;
}) {
  const services = business.serviceNames ?? [];
  return (
    <article className={`business-card ${styles.card}`}>
      <div
        className={`business-card__art ${styles.art}`}
        aria-hidden="true"
        style={businessCardArtStyle(business.cardImage)}
      >
        {business.cardImage ? null : (
          <span className="business-card__initials">
            {getInitials(business.tradingName)}
          </span>
        )}
        <span>{categoryName}</span>
      </div>
      <div className={`business-card__body ${styles.body}`}>
        <div className="tag-row">
          {business.isDemo ? (
            <span className="tag">{t("dir.fictionalDemo")}</span>
          ) : null}
          {isNewListing(business.publishedAt) ? (
            <span className="tag tag--new">{t("dir.new")}</span>
          ) : null}
          <span className="tag tag--quiet">
            {business.verificationStatus === "verified"
              ? t("dir.verified")
              : t("dir.notVerified")}
          </span>
          <BusinessRatingTag rating={business.rating} />
          {business.distanceKm != null ? (
            <span className="tag tag--quiet">
              {business.distanceKm < 1
                ? t("dir.under1km")
                : t("dir.kmAway", { km: business.distanceKm.toFixed(1) })}
            </span>
          ) : null}
        </div>
        <h3 className={styles.name}>
          <Link href={`/b/${business.slug}`}>{business.tradingName}</Link>
        </h3>
        {business.welshName && business.welshName !== business.tradingName ? (
          <p className={styles.welshName} lang="cy">
            {business.welshName}
          </p>
        ) : null}
        {welsh && business.welshSummary ? (
          <p className={styles.summary} lang="cy-GB">
            {business.welshSummary}
          </p>
        ) : (
          <p className={styles.summary} lang="en-GB">
            {business.summary}
          </p>
        )}
        {services.length > 0 ? (
          <ul
            className={styles.services}
            aria-label={t("dirx.servicesLabel")}
            lang="en-GB"
          >
            {services.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        ) : null}
        {business.currentOffer ? (
          <p className={styles.offer} lang="en-GB">
            <span className={styles.offerBadge}>{t("dirx.offerBadge")}</span>
            {business.currentOffer.title}
          </p>
        ) : null}
        <div className={styles.meta}>
          <span>
            <span className="sr-only">
              {t("dir.categoryLabel")}: {categoryName}.{" "}
            </span>
            {placeName}
          </span>
          {business.openNow != null ? (
            <span
              className={
                business.openNow ? styles.statusOpen : styles.statusClosed
              }
            >
              {business.openNow ? t("dir.openNow") : t("dirx.closedNow")}
            </span>
          ) : null}
        </div>
        <Link
          className="text-link"
          href={`/b/${business.slug}`}
          aria-hidden="true"
          tabIndex={-1}
        >
          {t("dir.viewWebsite")}
          <span aria-hidden="true"> →</span>
        </Link>
      </div>
    </article>
  );
}
