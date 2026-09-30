import type { Route } from "next";
import Link from "next/link";
import { businessCardArtStyle } from "@/lib/business-card-art";
import { getInitials } from "@/lib/initials";
import type { PublicBusinessSummary } from "@/modules/businesses/types";
import { BusinessRatingTag } from "./business-rating-tag";
import styles from "./business-operations-sections.module.css";

export function RelatedBusinesses({
  categoryName,
  businesses,
}: {
  categoryName: string;
  businesses: PublicBusinessSummary[];
}) {
  if (businesses.length === 0) return null;

  return (
    <section
      className={styles.section}
      id="related"
      aria-labelledby="related-heading"
    >
      <div className={styles.heading}>
        <p className="eyebrow">Keep looking</p>
        <h2 id="related-heading">More {categoryName.toLowerCase()} nearby</h2>
      </div>
      <div className="business-grid">
        {businesses.map((business) => (
          <article className="business-card" key={business.id}>
            <div
              className="business-card__art"
              aria-hidden="true"
              style={businessCardArtStyle(business.cardImage)}
            >
              {business.cardImage ? null : (
                <span className="business-card__initials">
                  {getInitials(business.tradingName)}
                </span>
              )}
              <span>{business.place.name}</span>
            </div>
            <div className="business-card__body">
              <div className="tag-row">
                {business.isDemo ? (
                  <span className="tag">Fictional demo</span>
                ) : null}
                <BusinessRatingTag rating={business.rating} />
              </div>
              <h3>{business.tradingName}</h3>
              {business.welshName &&
              business.welshName !== business.tradingName ? (
                <p className="body-copy" lang="cy">
                  {business.welshName}
                </p>
              ) : null}
              <p>{business.summary}</p>
              <Link className="text-link" href={`/b/${business.slug}` as Route}>
                View {business.tradingName}
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
      <p className="field-hint">
        Organic suggestions from the same category, nearest first. No paid
        placement.
      </p>
    </section>
  );
}
