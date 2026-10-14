import Link from "next/link";
import type { Route } from "next";
import { ContentPicture } from "@/components/content-picture";
import type { Translator } from "@/lib/i18n/translate";
import {
  offerUrgency,
  type OfferUrgency,
} from "@/modules/businesses/offer-filters";
import {
  daysUntilOfferEnds,
  type PublicOffer,
} from "@/modules/businesses/public-offers";
import styles from "./browse.module.css";

function endsLabel(days: number | null, t: Translator): string {
  if (days === null) return t("offers.noEnd");
  if (days === 0) return t("offers.endsToday");
  if (days === 1) return t("offers.endsTomorrow");
  return t("offers.endsInDays", { days });
}

/**
 * One current offer. The title link covers the whole card; the business link
 * and the terms disclosure sit above it so each stays separately usable.
 * Business and offer wording is owner-written English, so it is tagged as such.
 */
export function OfferCard({
  t,
  offer,
  now,
}: {
  t: Translator;
  offer: PublicOffer;
  now: Date;
}) {
  const days = daysUntilOfferEnds(offer.endsAt, now);
  const urgency: OfferUrgency = offerUrgency(days);
  return (
    <article className={styles.card}>
      <ContentPicture image={offer.image} />
      <div className={styles.cardBody}>
        <div className="tag-row">
          <span className={styles.urgency} data-urgency={urgency}>
            {endsLabel(days, t)}
          </span>
          {offer.fictional ? (
            <span className="tag">{t("offers.fictionalDemo")}</span>
          ) : null}
        </div>
        <h3 className={styles.cardTitle} lang="en-GB">
          <Link href={`/b/${offer.businessSlug}#offers` as Route}>
            {offer.title}
          </Link>
        </h3>
        <p className={styles.meta}>
          {t("offersx.at")}{" "}
          <Link href={`/b/${offer.businessSlug}` as Route} lang="en-GB">
            {offer.businessName}
          </Link>
          {" · "}
          {offer.placeName}
        </p>
        <p className={styles.copy} lang="en-GB">
          {offer.description}
        </p>
        {offer.terms ? (
          <details className={styles.terms}>
            <summary>{t("offers.terms")}</summary>
            <p lang="en-GB">{offer.terms}</p>
          </details>
        ) : null}
      </div>
    </article>
  );
}
