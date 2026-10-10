import { Fragment } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";
import {
  BusinessSiteFooter,
  BusinessSiteHeader,
  type BusinessSiteSection,
} from "@/components/business-site-chrome";
import {
  getAccent,
  resolveCategoryVariant,
  resolveVisibleSections,
  type BusinessAppearanceConfig,
  type BusinessOperationSectionId,
  type BusinessSectionId,
} from "@/modules/businesses/appearance";
import { getTranslator } from "@/lib/i18n/server";
import { sectionLabel, weekdayLabel } from "@/lib/i18n/business-copy";
import type { OperationSectionRenderers } from "@/components/business-operations-sections";
import type { BusinessMediaCollection } from "@/modules/businesses/media";
import type { BusinessSiteProjection } from "@/modules/businesses/site-projection";
import type { PublicVerificationCheck } from "@/modules/businesses/verification";
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
  verificationChecks?: PublicVerificationCheck[];
  updatedLabel?: string | null;
  confirmedLabel?: string | null;
  reportHref?: string | null;
  embedded?: boolean;
  primaryActionOverride?: { href: string; label: string } | null;
  additionalSections?: BusinessSiteSection[];
  additionalContent?: ReactNode;
  /**
   * Content for the operation-driven sections (contact, offers, events, menu,
   * accessibility). A section with no renderer has nothing to show and is left
   * out of both the page and its navigation.
   */
  operationSections?: OperationSectionRenderers;
  /** Notices that must show above everything else, such as a closure. */
  notice?: ReactNode;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export async function GeneratedBusinessWebsite({
  projection,
  description,
  category,
  placeName,
  appearance,
  media,
  isDemo = false,
  verificationStatus = "unverified",
  verificationChecks = [],
  updatedLabel = null,
  confirmedLabel = null,
  reportHref = null,
  embedded = false,
  primaryActionOverride = null,
  additionalSections = [],
  additionalContent = null,
  operationSections = {},
  notice = null,
}: GeneratedBusinessWebsiteProps) {
  const { locale, t } = await getTranslator();
  // Text the business typed is data, not translated wording: while the page
  // is Welsh it is marked as the English it is written in.
  const authoredLang = locale === "cy" ? "en-GB" : undefined;
  const accent = getAccent(appearance.accentKey);
  const categoryVariant = resolveCategoryVariant(category.name, category.slug);
  const categoryCopy = {
    eyebrow: t(`site.cat.${categoryVariant}.eyebrow`),
    placeholder: t(`site.cat.${categoryVariant}.placeholder`),
  };
  const configuredSections = resolveVisibleSections(appearance);
  const visibleSections = configuredSections.filter((section) => {
    switch (section.id) {
      case "contact":
      case "offers":
      case "events":
      case "menu":
      case "accessibility":
        return Boolean(operationSections[section.id]);
      default:
        return embedded || hasProfileContent(section.id);
    }
  });
  function hasProfileContent(
    id: "about" | "services" | "gallery" | "location" | "hours",
  ) {
    switch (id) {
      case "about":
        return Boolean(description?.trim() || projection.summary?.trim());
      case "services":
        return projection.services.length > 0;
      case "gallery":
        return media.gallery.length > 0;
      case "location":
        return Boolean(projection.locationDisplay);
      case "hours":
        return (
          projection.openingHours.length > 0 ||
          projection.openingExceptions.length > 0
        );
    }
  }
  const primaryAction =
    primaryActionOverride ??
    (projection.publicEmail
      ? { href: `mailto:${projection.publicEmail}`, label: t("site.emailUs") }
      : projection.publicPhone
        ? { href: `tel:${projection.publicPhone}`, label: t("site.callUs") }
        : null);
  const siteStyle = {
    "--business-primary": accent.primary,
    "--business-strong": accent.strong,
    "--business-soft": accent.soft,
  } as CSSProperties;
  const ContentTag: ElementType = embedded ? "div" : "main";

  const renderOperationSection = (
    id: BusinessOperationSectionId,
    layout: string,
  ): ReactNode => {
    const render = operationSections[id];
    return render ? <Fragment key={id}>{render(layout)}</Fragment> : null;
  };

  const renderSection = (
    section: (typeof visibleSections)[number],
  ): ReactNode => {
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
              <p className={styles.eyebrow}>{t("site.about.eyebrow")}</p>
              <h2>
                {t("site.about.title", { business: projection.tradingName })}
              </h2>
            </div>
            <p
              className={styles.bodyCopy}
              lang={
                (description ?? projection.summary) ? authoredLang : undefined
              }
            >
              {description ?? projection.summary ?? t("site.about.empty")}
            </p>
          </section>
        );

      case "services":
        return (
          <section className={styles.section} id="services" key="services">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>{t("site.services.eyebrow")}</p>
                <h2>{t("site.services.title")}</h2>
              </div>
              <p className={styles.sectionLead}>{t("site.services.lead")}</p>
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
                    <h3 lang={authoredLang}>{service.name}</h3>
                    <p lang={service.description ? authoredLang : undefined}>
                      {service.description ?? t("site.services.noDescription")}
                    </p>
                    <strong
                      lang={service.priceDisplay ? authoredLang : undefined}
                    >
                      {service.priceDisplay ?? t("site.services.noPrice")}
                    </strong>
                  </article>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>{t("site.services.empty")}</p>
            )}
          </section>
        );

      case "gallery":
        return (
          <section className={styles.section} id="gallery" key="gallery">
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>{t("site.gallery.eyebrow")}</p>
                <h2>{t("site.gallery.title")}</h2>
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
                  </figure>
                ))}
              </div>
            ) : (
              <p className={styles.emptyState}>{t("site.gallery.empty")}</p>
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
              <p className={styles.eyebrow}>{t("site.location.eyebrow")}</p>
              <h2 lang={projection.locationDisplay ? authoredLang : undefined}>
                {projection.locationDisplay ?? t("site.location.fallback")}
              </h2>
              <p>{t("site.location.note")}</p>
            </div>
            {section.layout === "panel" ? (
              <div className={styles.detailPanel}>
                <p className={styles.eyebrow}>
                  {t("site.location.contactEyebrow")}
                </p>
                <h2>{t("site.location.contactTitle")}</h2>
                <p>
                  {t("site.location.contactBody", {
                    business: projection.tradingName,
                  })}
                </p>
                {primaryAction ? (
                  <a className={styles.primaryAction} href={primaryAction.href}>
                    {primaryAction.label}
                  </a>
                ) : null}
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
              <p className={styles.eyebrow}>{t("site.hours.eyebrow")}</p>
              <h2>{t("site.hours.title")}</h2>
            </div>
            {projection.openingHours.length > 0 ||
            projection.openingExceptions.length > 0 ? (
              <div>
                {projection.openingHours.length > 0 ? (
                  <dl>
                    {projection.openingHours.map((hour) => (
                      <div key={hour.day}>
                        <dt>{weekdayLabel(t, hour.day.toLowerCase())}</dt>
                        <dd>
                          {hour.display === "Closed"
                            ? t("site.hours.closed")
                            : hour.display}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {projection.openingExceptions.length > 0 ? (
                  <div className={styles.hoursNotice}>
                    <h3>{t("site.hours.changes")}</h3>
                    <dl lang={authoredLang}>
                      {projection.openingExceptions.map((exception) => (
                        <div key={exception.date}>
                          <dt>
                            <time dateTime={exception.date}>
                              {exception.label}
                            </time>
                          </dt>
                          <dd>
                            {exception.display}
                            {exception.note ? ` (${exception.note})` : ""}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className={styles.emptyState}>{t("site.hours.empty")}</p>
            )}
          </section>
        );

      case "contact":
      case "offers":
      case "events":
      case "menu":
      case "accessibility":
        return renderOperationSection(
          section.id as BusinessOperationSectionId,
          section.layout,
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
        sections={[
          ...visibleSections.map(({ id }) => ({
            id,
            label: sectionLabel(t, id),
          })),
          ...additionalSections,
        ]}
        primaryAction={primaryAction}
      />

      <ContentTag className={styles.content} id="business-content">
        {notice}

        {isDemo ? (
          <div className={styles.demoBanner} role="note">
            <strong>{t("site.demo.title")}</strong>
            <span>{t("site.demo.body")}</span>
          </div>
        ) : null}

        <section className={styles.hero} aria-labelledby="business-title">
          <div className={styles.heroCopy}>
            <div className={styles.tagRow}>
              <span className={styles.tag} lang={authoredLang}>
                {category.name}
              </span>
              {placeName ? (
                <span className={joinClasses(styles.tag, styles.tagQuiet)}>
                  {placeName}
                </span>
              ) : null}
            </div>
            <p className={styles.eyebrow}>{categoryCopy.eyebrow}</p>
            <h1
              className={styles.title}
              id="business-title"
              lang={authoredLang}
            >
              {projection.tradingName}
            </h1>
            {projection.welshName &&
            projection.welshName !== projection.tradingName ? (
              <p className={styles.welshName} lang="cy">
                {projection.welshName}
              </p>
            ) : null}
            <p
              className={styles.lead}
              lang={projection.summary ? authoredLang : undefined}
            >
              {projection.summary ?? t("site.lead.empty")}
            </p>
            <div className={styles.actions}>
              {projection.publicEmail ? (
                <a
                  className={styles.primaryAction}
                  href={`mailto:${projection.publicEmail}`}
                >
                  {t("site.emailThis")}
                </a>
              ) : null}
              {projection.publicPhone ? (
                <a
                  className={styles.secondaryAction}
                  href={`tel:${projection.publicPhone}`}
                >
                  {t("site.callThis")}
                </a>
              ) : null}
            </div>
            <p className={styles.trustNote}>
              {verificationStatus === "verified"
                ? verificationChecks.length > 0
                  ? t("site.trust.checks")
                  : t("site.trust.verified")
                : t("site.trust.unverified")}
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

        {additionalContent}

        {updatedLabel || confirmedLabel || reportHref ? (
          <section
            className={styles.disclosure}
            aria-label={t("site.info.label")}
          >
            <div>
              <p className={styles.eyebrow}>{t("site.info.eyebrow")}</p>
              <h2>{t("site.info.title")}</h2>
            </div>
            <dl className={styles.compactFacts}>
              {updatedLabel ? (
                <div>
                  <dt>{t("site.info.updated")}</dt>
                  <dd>{updatedLabel}</dd>
                </div>
              ) : null}
              {confirmedLabel ? (
                <div>
                  <dt>{t("site.info.confirmed")}</dt>
                  <dd>{confirmedLabel}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t("site.info.hostedBy")}</dt>
                <dd>OurValleys</dd>
              </div>
              <div>
                <dt>{t("site.info.verification")}</dt>
                <dd>
                  {verificationStatus !== "verified"
                    ? t("site.info.notVerified")
                    : verificationChecks.length > 0
                      ? t("site.info.checksOnly")
                      : t("site.info.verifiedAvailable")}
                </dd>
              </div>
            </dl>
            {verificationStatus === "verified" &&
            verificationChecks.length > 0 ? (
              <div className={styles.verificationChecks}>
                <h3>{t("site.info.checkedTitle")}</h3>
                <ul>
                  {verificationChecks.map((check) => (
                    <li key={check.checkType}>
                      {check.label}, {check.checkedLabel}
                    </li>
                  ))}
                </ul>
                <p>{t("site.info.checkedNote")}</p>
              </div>
            ) : null}
            {reportHref ? (
              <a className={styles.reportLink} href={reportHref}>
                {t("site.info.report")}
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
