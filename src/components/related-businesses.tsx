import type { Route } from "next";
import Link from "next/link";
import { businessCardArtStyle } from "@/lib/business-card-art";
import { getTranslator } from "@/lib/i18n/server";
import { getInitials } from "@/lib/initials";
import type { PublicBusinessSummary } from "@/modules/businesses/types";
import { BusinessRatingTag } from "./business-rating-tag";
import styles from "./generated-business-website.module.css";

export async function RelatedBusinesses({
  categoryName,
  businesses,
}: {
  categoryName: string;
  businesses: PublicBusinessSummary[];
}) {
  if (businesses.length === 0) return null;
  const { locale, t } = await getTranslator();
  const authoredLang = locale === "cy" ? "en-GB" : undefined;

  return (
    <section
      className={styles.section}
      id="related"
      aria-labelledby="related-heading"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>{t("site.related.eyebrow")}</p>
          <h2 id="related-heading">
            {t("site.related.title", { category: categoryName.toLowerCase() })}
          </h2>
        </div>
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
                  <span className="tag">{t("site.related.demo")}</span>
                ) : null}
                <BusinessRatingTag rating={business.rating} />
              </div>
              <h3 lang={authoredLang}>{business.tradingName}</h3>
              {business.welshName &&
              business.welshName !== business.tradingName ? (
                <p className="body-copy" lang="cy">
                  {business.welshName}
                </p>
              ) : null}
              <p lang={authoredLang}>{business.summary}</p>
              <Link className="text-link" href={`/b/${business.slug}` as Route}>
                {t("site.related.view", { business: business.tradingName })}
                <span aria-hidden="true"> →</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
      <p className="field-hint">{t("site.related.note")}</p>
    </section>
  );
}
