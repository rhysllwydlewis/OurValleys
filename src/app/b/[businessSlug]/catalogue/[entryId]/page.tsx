import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  BusinessSiteFooter,
  BusinessSiteHeader,
} from "@/components/business-site-chrome";
import { businessSiteTheme } from "@/components/business-site-theme";
import {
  ContentPicture,
  contentPictureSizes,
} from "@/components/content-picture";
import siteStyles from "@/components/generated-business-website.module.css";
import styles from "@/components/business-catalogue-page.module.css";
import extraStyles from "@/components/business-extra-sections.module.css";
import { JsonLd } from "@/components/json-ld";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { getSiteUrl, pageUrlMetadata } from "@/lib/site";
import { buildCatalogueEntryJsonLd } from "@/lib/structured-data";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import {
  entryPagePath,
  findCatalogueEntry,
  isEntryId,
  structuredPrice,
} from "@/modules/businesses/catalogue-page-model";
import { listCategorySections } from "@/modules/businesses/content-features";
import {
  extraSectionAnchor,
  publicExtraSections,
  splitPriceMeta,
} from "@/modules/businesses/extra-sections-model";
import { listBusinessMedia } from "@/modules/businesses/media";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import {
  getPublicBusinessOperations,
  resolvePublishedBusinessRedirect,
} from "@/modules/businesses/public-operations";

export const dynamic = "force-dynamic";

type Params = Promise<{ businessSlug: string; entryId: string }>;

const load = cache(async function load(businessSlug: string, entryId: string) {
  const result = await getPublishedBusinessBySlug(businessSlug);
  if (result.state !== "ready") return { result, page: null };
  if (!isEntryId(entryId)) return { result, page: null };
  const sections = publicExtraSections(
    await listCategorySections(result.business.id, true),
  );
  return { result, page: findCatalogueEntry(sections, entryId) };
});

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { businessSlug, entryId } = await params;
  const [{ result, page }, { t, locale }] = await Promise.all([
    load(businessSlug, entryId),
    getTranslator(),
  ]);
  if (result.state !== "ready" || !page) {
    return {
      title: t("site.page.metaUnavailable"),
      robots: { index: false, follow: false },
    };
  }
  const { business } = result;
  const text = page.entry.description || page.entry.meta || "";
  const title = t("extra.page.metaTitle", {
    item: page.entry.title,
    business: business.tradingName,
  });
  const description =
    text.slice(0, 200) ||
    t("extra.page.metaDescription", {
      item: page.entry.title,
      business: business.tradingName,
    });
  const path = entryPagePath(business.slug, page.entry.id ?? entryId);
  const base = pageUrlMetadata(path, {
    title,
    description,
    locale: LOCALE_DETAILS[locale].openGraph,
  });
  return {
    title,
    description,
    alternates: base.alternates,
    // Entry-specific social cards even without a picture; the image is optional.
    openGraph: {
      ...base.openGraph,
      ...(page.entry.image ? { images: [{ url: page.entry.image.url }] } : {}),
    },
    twitter: {
      title,
      description,
      ...(page.entry.image ? { images: [page.entry.image.url] } : {}),
    },
    robots: business.isDemo
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export default async function CatalogueEntryPage({
  params,
}: {
  params: Params;
}) {
  const { businessSlug, entryId } = await params;
  const [{ result, page }, { locale, t }] = await Promise.all([
    load(businessSlug, entryId),
    getTranslator(),
  ]);
  if (result.state === "missing") {
    // An approved slug change keeps old shared links working.
    const redirectSlug = await resolvePublishedBusinessRedirect(businessSlug);
    if (redirectSlug) {
      permanentRedirect(`/b/${redirectSlug}/catalogue/${entryId}`);
    }
  }
  if (result.state !== "ready" || !page) notFound();
  const { business } = result;
  const { section, entry, siblings } = page;
  const type = section.sectionType as "products" | "treatments" | "team";
  const [media, appearance, operations] = await Promise.all([
    listBusinessMedia(business.id),
    getBusinessAppearance(business.id),
    getPublicBusinessOperations(business.id),
  ]);
  // The contact page exists only when the business offers an enquiry form.
  const canAsk = operations.contacts.some((contact) => contact.formKind);
  const theme = businessSiteTheme(appearance);
  const authoredLang = locale === "cy" ? "en-GB" : undefined;
  const { price, note } = splitPriceMeta(entry.meta);
  const soldOut = entry.availability === "sold_out";
  const showBadge = entry.availability && entry.availability !== "available";
  const hasLink = type !== "team" && entry.url && !soldOut;
  const path = entryPagePath(business.slug, entry.id!);

  return (
    <div
      className={`${siteStyles.site} business-catalogue-page`}
      lang={LOCALE_DETAILS[locale].htmlLang}
      {...theme.attributes}
      style={theme.style}
    >
      <BusinessSiteHeader
        tradingName={business.tradingName}
        logo={media.logo}
        sections={[]}
        primaryAction={null}
        homeHref={`/b/${business.slug}`}
      />
      <main className="business-site-shell" id="business-content">
        <nav
          className="business-breadcrumb"
          aria-label={t("formsCommon.breadcrumb")}
        >
          <Link href={`/b/${business.slug}#${extraSectionAnchor(section.id)}`}>
            {t("extra.page.back", { business: business.tradingName })}
          </Link>
        </nav>
        <article
          className={styles.entry}
          data-type={type}
          data-testid="catalogue-entry"
        >
          {entry.image ? (
            <div className={styles.picture}>
              <ContentPicture
                image={entry.image}
                variant="inset"
                sizes={contentPictureSizes.wide}
                priority
              />
            </div>
          ) : null}
          <div className={styles.body}>
            <p className={siteStyles.eyebrow}>
              {t(`extra.page.kind.${type}` as MessageKey)} ·{" "}
              <span lang={authoredLang}>{section.title}</span>
            </p>
            <h1 lang={authoredLang}>{entry.title}</h1>
            {type === "team" && entry.meta ? (
              <p className={styles.role} lang={authoredLang}>
                {entry.meta}
              </p>
            ) : null}
            {type !== "team" && (price || showBadge) ? (
              <div className={styles.facts}>
                {price ? (
                  <p className={styles.price}>
                    <span className={styles.factLabel}>
                      {t("extra.page.price")}
                    </span>{" "}
                    <span lang={authoredLang}>{price}</span>
                  </p>
                ) : null}
                {showBadge ? (
                  <p
                    className={`${extraStyles.badge} ${extraStyles[`badge_${entry.availability}`] ?? ""}`}
                  >
                    {t(
                      `extra.availability.${entry.availability}` as MessageKey,
                    )}
                  </p>
                ) : null}
              </div>
            ) : null}
            {type !== "team" && note ? (
              <p className={styles.note} lang={authoredLang}>
                {note}
              </p>
            ) : null}
            {entry.description ? (
              <p className={styles.description} lang={authoredLang}>
                {entry.description}
              </p>
            ) : null}
            <div className={styles.actions}>
              {hasLink ? (
                <a
                  className={siteStyles.primaryAction}
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  {t(
                    type === "products"
                      ? "extra.public.order"
                      : "extra.public.book",
                  )}
                  <span className={extraStyles.srOnly}>
                    {" "}
                    ({t("extra.public.opensElsewhere")})
                  </span>
                </a>
              ) : null}
              {canAsk ? (
                <Link
                  className={siteStyles.outlineAction}
                  href={`/b/${business.slug}/contact`}
                >
                  {t("extra.page.askAbout")}
                  <span className={extraStyles.srOnly}>
                    {" "}
                    (<span lang={authoredLang}>{entry.title}</span>)
                  </span>
                </Link>
              ) : null}
            </div>
            {hasLink ? (
              <p className={styles.fine}>{t("extra.page.noteOrdering")}</p>
            ) : null}
          </div>
        </article>
        {siblings.length > 0 ? (
          <section
            className={styles.more}
            aria-labelledby="catalogue-more-heading"
          >
            <h2 id="catalogue-more-heading">
              {t("extra.page.moreFrom", { section: section.title })}
            </h2>
            <ul className={styles.moreList}>
              {siblings.map((sibling) => (
                <li key={sibling.id}>
                  <Link href={entryPagePath(business.slug, sibling.id!)}>
                    <span lang={authoredLang}>{sibling.title}</span>
                    {type !== "team" && sibling.meta ? (
                      <span className={styles.morePrice} lang={authoredLang}>
                        {splitPriceMeta(sibling.meta).price}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        <JsonLd
          data={buildCatalogueEntryJsonLd(
            {
              businessName: business.tradingName,
              path,
              isDemo: business.isDemo,
              sectionType: type,
              name: entry.title,
              description: entry.description,
              role: type === "team" ? entry.meta : undefined,
              price: type === "team" ? null : structuredPrice(entry.meta),
              availability: entry.availability,
              imageUrl: entry.image?.url,
            },
            getSiteUrl().origin,
          )}
        />
      </main>
      <BusinessSiteFooter tradingName={business.tradingName} />
    </div>
  );
}
