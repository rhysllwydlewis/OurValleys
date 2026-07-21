import type { CSSProperties, ElementType, ReactNode } from "react";
import {
  BusinessSiteFooter,
  BusinessSiteHeader,
} from "@/components/business-site-chrome";
import {
  categoryPresentation,
  getAccent,
  resolveCategoryVariant,
  resolveVisibleSections,
  type BusinessAppearanceConfig,
  type BusinessSectionId,
} from "@/modules/businesses/appearance";
import type { BusinessMediaCollection } from "@/modules/businesses/media";
import type { BusinessSiteProjection } from "@/modules/businesses/site-projection";
import styles from "./generated-business-website.module.css";

export type GeneratedBusinessWebsiteProps = {
  projection: BusinessSiteProjection;
  description: string | null;
  category: { name: string; slug: string };
  placeName: string | null;
  appearance: BusinessAppearanceConfig;
  media: BusinessMediaCollection;
  isDemo?: boolean;
  verificationStatus?: "verified" | "unverified";
  updatedLabel?: string | null;
  reportHref?: string | null;
  embedded?: boolean;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function GeneratedBusinessWebsite({
  projection,
  description,
  category,
  placeName,
  appearance,
  media,
  isDemo = false,
  verificationStatus = "unverified",
  updatedLabel = null,
  reportHref = null,
  embedded = false,
}: GeneratedBusinessWebsiteProps) {
  const accent = getAccent(appearance.accentKey);
  const categoryVariant = resolveCategoryVariant(category.name, category.slug);
  const categoryCopy = categoryPresentation[categoryVariant];
  const visibleSections = resolveVisibleSections(appearance);
  const primaryAction = projection.publicEmail
    ? { href: `mailto:${projection.publicEmail}`, label: "Email us" }
    : projection.publicPhone
      ? { href: `tel:${projection.publicPhone}`, label: "Call us" }
      : null;
  const siteStyle = {
    "--business-primary": accent.primary,
    "--business-strong": accent.strong,
    "--business-soft": accent.soft,
  } as CSSProperties;
  const ContentTag: ElementType = embedded ? "div" : "main";

  const renderSection = (section: (typeof visibleSections)[number]): ReactNode => {
    switch (section.id satisfies BusinessSectionId) {
      case "about":
        return (
          <section
            className={joinClasses(
              styles.section,
              section.layout === "stacked"
                ? styles.aboutStacked
                : styles.aboutSplit,
            )}
            id="about"
            key="about"
          >
            <div>
              <p className={styles.eyebrow}>About</p>
              <h2>Meet {projection.tradingName}.</h2>
            </div>
            <p className={styles.bodyCopy}>
              {description ??
                projection.summary ??
                "Add an introduction in the business dashboard to tell customers what makes this business useful."}
            </p>
          </section>
        );

      case "services":
        return (
          <section className={styles.section} id="services" key="services">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>What we do</p>
                <h2>Services</h2>
              </div>
              <p className={styles.sectionLead}>
                Clear information supplied directly by the business.
              </p>
            </div>
            {projection.services.length > 0 ? (
              <div
                className={
                  section.layout === "list"
                    ? styles.servicesList
                    : styles.servicesCards
                }
              >
                {projection.services.map((service, index) => (
                  <article
                    className={styles.serviceCard}
                    key={`${service.name}-${index}`}
                  >
                    <span className={styles.serviceNumber} aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3>{service.name}</h3>
                    <p>
                      {service.description ??
                        "Contact the business for more information about this service."}
                    </p>
                    <strong>
                      {service.priceDisplay ?? "Contact for details"}
                    </strong>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>
                Services have not been added yet.
              </p>
            )}
          </section>
        );

      case "gallery":
        return (
          <section className={styles.section} id="gallery" key="gallery">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Gallery</p>
                <h2>A closer look.</h2>
              </div>
            </div>
            {media.gallery.length > 0 ? (
              <div
                className={
                  section.layout === "feature"
                    ? styles.galleryFeature
                    : styles.galleryGrid
                }
              >
                {media.gallery.map((item) => (
                  <figure className={styles.galleryFigure} key={item.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={styles.galleryImage}
                      src={item.url}
                      alt={item.altText}
                      style={{
                        objectPosition: `${item.focalX}% ${item.focalY}%`,
                      }}
                    />
                    {item.altText ? (
                      <figcaption>{item.altText}</figcaption>
                    ) : null}
                  </figure>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>
                Gallery photographs have not been added yet. The website remains
                complete and readable without them.
              </p>
            )}
          </section>
        );

      case "location":
        return (
          <section
            className={joinClasses(
              styles.section,
              section.layout === "statement"
                ? styles.locationStatement
                : styles.locationPanel,
            )}
            id="location"
            key="location"
          >
            <div className={styles.detailPanel}>
              <p className={styles.eyebrow}>Where we work</p>
              <h2>{projection.locationDisplay ?? "Serving the local area"}</h2>
              <p>
                Only location information selected for public presentation is
                shown. Private premises details remain private.
              </p>
            </div>
            {section.layout === "panel" ? (
              <div className={styles.detailPanel}>
                <p className={styles.eyebrow}>Get in touch</p>
                <h2>Start a conversation.</h2>
                <p>
                  Use the contact options at the top of the website to contact
                  {` ${projection.tradingName}`} directly.
                </p>
              </div>
            ) : null}
          </section>
        );

      case "hours":
        return (
          <section
            className={joinClasses(
              styles.section,
              section.layout === "compact"
                ? styles.hoursCompact
                : styles.hoursList,
            )}
            id="hours"
            key="hours"
          >
            <div>
              <p className={styles.eyebrow}>Opening hours</p>
              <h2>When to get in touch.</h2>
            </div>
            {projection.openingHours.length > 0 ? (
              <dl>
                {projection.openingHours.map((hour) => (
                  <div key={hour.day}>
                    <dt>{hour.day}</dt>
                    <dd>{hour.display}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className={styles.emptyState}>
                Opening hours have not been supplied yet.
              </p>
            )}
          </section>
        );
    }
  };

  return (
    <div
      className={joinClasses(styles.site, embedded && styles.embedded)}
      data-template={appearance.templateKey}
      data-category={categoryVariant}
      style={siteStyle}
    >
      <BusinessSiteHeader
        tradingName={projection.tradingName}
        logo={media.logo}
        sections={visibleSections.map(({ id, label }) => ({ id, label }))}
        primaryAction={primaryAction}
      />

      <ContentTag className={styles.content} id="business-content">
        {isDemo ? (
          <div className={styles.demoBanner} role="note">
            <strong>Fictional demonstration business.</strong>
            <span>
              This is test content for the OurValleys build, not a real company
              or public listing.
            </span>
          </div>
        ) : null}

        <section className={styles.hero} aria-labelledby="business-title">
          <div className={styles.heroCopy}>
            <div className={styles.tagRow}>
              <span className={styles.tag}>{category.name}</span>
              {placeName ? (
                <span className={joinClasses(styles.tag, styles.tagQuiet)}>
                  {placeName}
                </span>
              ) : null}
            </div>
            <p className={styles.eyebrow}>{categoryCopy.eyebrow}</p>
            <h1 className={styles.title} id="business-title">
              {projection.tradingName}
            </h1>
            <p className={styles.lead}>
              {projection.summary ??
                "Add a concise business summary to introduce the website."}
            </p>
            <div className={styles.actions}>
              {projection.publicEmail ? (
                <a
                  className={styles.primaryAction}
                  href={`mailto:${projection.publicEmail}`}
                >
                  Email this business
                </a>
              ) : null}
              {projection.publicPhone ? (
                <a
                  className={styles.secondaryAction}
                  href={`tel:${projection.publicPhone}`}
                >
                  Call this business
                </a>
              ) : null}
            </div>
            <p className={styles.trustNote}>
              {verificationStatus === "verified"
                ? "Selected details have been verified by OurValleys."
                : "Business information is shown as supplied. It has not been independently verified."}
            </p>
          </div>
          <div className={styles.heroMedia}>
            {media.hero ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.heroImage}
                src={media.hero.url}
                alt={media.hero.altText}
                style={{
                  objectPosition: `${media.hero.focalX}% ${media.hero.focalY}%`,
                }}
              />
            ) : (
              <div className={styles.heroPlaceholder} aria-hidden="true">
                <span className={styles.placeholderMark}>
                  {projection.tradingName.slice(0, 1).toUpperCase()}
                </span>
                <p>{categoryCopy.placeholder}</p>
              </div>
            )}
          </div>
        </section>

        {visibleSections.map(renderSection)}

        {updatedLabel || reportHref ? (
          <section className={styles.disclosure} aria-label="Website information">
            <div>
              <p className={styles.eyebrow}>Website information</p>
              <h2>Transparent by design.</h2>
            </div>
            <dl className={styles.compactFacts}>
              {updatedLabel ? (
                <div>
                  <dt>Last updated</dt>
                  <dd>{updatedLabel}</dd>
                </div>
              ) : null}
              <div>
                <dt>Hosted by</dt>
                <dd>OurValleys</dd>
              </div>
              <div>
                <dt>Verification</dt>
                <dd>
                  {verificationStatus === "verified"
                    ? "Verified details available"
                    : "Not independently verified"}
                </dd>
              </div>
            </dl>
            {reportHref ? (
              <a className={styles.reportLink} href={reportHref}>
                Report incorrect information
                <span aria-hidden="true"> →</span>
              </a>
            ) : null}
          </section>
        ) : null}
      </ContentTag>

      <BusinessSiteFooter tradingName={projection.tradingName} />
    </div>
  );
}
