import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { z } from "zod";
import {
  BusinessSiteFooter,
  BusinessSiteHeader,
} from "@/components/business-site-chrome";
import { businessSiteTheme } from "@/components/business-site-theme";
import { contentPictureSizes } from "@/components/content-picture";
import { LocalisedContentPicture } from "@/components/localised-content-picture";
import { updateDateLabel } from "@/components/business-updates";
import updateStyles from "@/components/business-updates.module.css";
import siteStyles from "@/components/generated-business-website.module.css";
import { JsonLd } from "@/components/json-ld";
import { ShareControl } from "@/components/share-control";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getPublicPageRobots } from "@/lib/release-stage";
import { getSiteUrl, pageUrlMetadata } from "@/lib/site";
import {
  buildBreadcrumbJsonLd,
  buildBusinessUpdateJsonLd,
} from "@/lib/structured-data";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import { listBusinessMedia } from "@/modules/businesses/media";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { resolvePublishedBusinessRedirect } from "@/modules/businesses/public-operations";
import { getPublicBusinessUpdate } from "@/modules/businesses/public-updates";
import {
  bodyParagraphs,
  updateExcerpt,
} from "@/modules/businesses/updates-model";

export const dynamic = "force-dynamic";

type Params = Promise<{ businessSlug: string; updateId: string }>;

/** Resolve the business and the update, or null when either is not public. */
async function load(params: Params) {
  const { businessSlug, updateId } = await params;
  const { locale, t } = await getTranslator();
  const business = await getPublishedBusinessBySlug(businessSlug);
  // An outage is an error page, not a "no such page".
  if (business.state === "unavailable") {
    throw new Error("The published business could not be read.");
  }
  if (business.state === "missing") {
    // An approved slug change keeps old shared links working.
    const redirectSlug = await resolvePublishedBusinessRedirect(businessSlug);
    if (redirectSlug) {
      permanentRedirect(`/b/${redirectSlug}/updates/${updateId}`);
    }
  }
  if (business.state !== "ready") return null;
  if (!z.uuid().safeParse(updateId).success) return null;
  const detail = await getPublicBusinessUpdate({
    businessId: business.business.id,
    updateId,
    locale,
  });
  if (detail.state === "unavailable") {
    throw new Error("The business update could not be read.");
  }
  if (detail.state !== "found") return null;
  return { business: business.business, detail, locale, t };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const loaded = await load(params);
  if (!loaded) {
    const { t } = await getTranslator();
    return {
      title: t("site.page.metaUnavailable"),
      robots: { index: false, follow: false },
    };
  }
  const { business, detail, locale, t } = loaded;
  const { update } = detail;
  const title = t("upd.page.metaTitle", {
    title: update.title,
    business: business.tradingName,
  });
  const description =
    updateExcerpt(update.body, 160) ||
    t("upd.page.metaDescriptionFallback", { business: business.tradingName });
  const path = `/b/${business.slug}/updates/${update.id}`;
  return {
    title,
    description,
    robots: business.isDemo
      ? { index: false, follow: false }
      : getPublicPageRobots(),
    ...pageUrlMetadata(path, {
      title,
      description,
      locale: LOCALE_DETAILS[locale].openGraph,
    }),
  };
}

export default async function BusinessUpdatePage({
  params,
}: {
  params: Params;
}) {
  const loaded = await load(params);
  if (!loaded) notFound();
  const { business, detail, locale, t } = loaded;
  const { update, newer, older } = detail;
  const [appearance, media] = await Promise.all([
    getBusinessAppearance(business.id),
    listBusinessMedia(business.id),
  ]);
  const theme = businessSiteTheme(appearance);
  const origin = getSiteUrl().origin;
  const path = `/b/${business.slug}/updates/${update.id}`;
  const htmlLang = LOCALE_DETAILS[locale].htmlLang;
  const jsonLd = buildBusinessUpdateJsonLd(
    {
      id: update.id,
      title: update.title,
      body: update.body,
      publishedAt: update.publishedAt,
      businessName: business.tradingName,
      businessSlug: business.slug,
      fictional: business.isDemo,
      image: update.image,
    },
    origin,
  );
  const neighbourHref = (id: string) =>
    `/b/${business.slug}/updates/${id}` as Route;

  return (
    <div
      className={`${siteStyles.site} business-updates-page`}
      lang={htmlLang}
      {...theme.attributes}
      style={theme.style}
    >
      <JsonLd data={jsonLd} />
      <JsonLd
        data={buildBreadcrumbJsonLd(
          [
            { name: business.tradingName, path: `/b/${business.slug}` },
            {
              name: t("upd.site.nav"),
              path: `/b/${business.slug}/updates`,
            },
            { name: update.title, path },
          ],
          origin,
          { demo: business.isDemo },
        )}
      />
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
          <Link href={`/b/${business.slug}/updates` as Route}>
            {t("upd.page.allUpdates", { business: business.tradingName })}
          </Link>
        </nav>
        <article
          className={updateStyles.single}
          // Owner-written text: Welsh only where the owner wrote Welsh.
          lang={update.welsh ? "cy-GB" : "en-GB"}
        >
          <LocalisedContentPicture
            image={update.image}
            variant="inset"
            sizes={contentPictureSizes.site}
          />
          <header>
            <p className={siteStyles.eyebrow} lang={htmlLang}>
              {t("upd.site.eyebrow")}
            </p>
            <h1>{update.title}</h1>
            <p className={updateStyles.date}>
              <time dateTime={update.publishedAt.toISOString()} lang={htmlLang}>
                {updateDateLabel(update.publishedAt, locale)}
              </time>
              {" · "}
              <Link href={`/b/${business.slug}` as Route} lang="en-GB">
                {business.tradingName}
              </Link>
            </p>
          </header>
          <div className={updateStyles.body}>
            {bodyParagraphs(update.body).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </article>
        <div className={updateStyles.actions} lang={htmlLang}>
          <ShareControl
            title={update.title}
            url={`${origin}${path}`}
            label={t("upd.page.share")}
            messages={{
              shared: t("share.shared"),
              copied: t("share.copied"),
              cancelled: "",
              unavailable: t("share.unavailable"),
            }}
          />
          <Link
            className={updateStyles.quiet}
            href={`/report/update/${update.id}` as Route}
          >
            {t("upd.report")}
          </Link>
          <a
            className={updateStyles.quiet}
            href={`/b/${business.slug}/updates/feed.xml`}
          >
            {t("upd.follow.link")}
          </a>
        </div>
        {newer || older ? (
          <nav
            className={updateStyles.neighbours}
            aria-label={t("upd.page.moreAria")}
            lang={htmlLang}
          >
            {older ? (
              <Link
                className={siteStyles.outlineAction}
                rel="prev"
                href={neighbourHref(older.id)}
              >
                <span>{t("upd.page.older")}</span>
                <strong lang={older.welsh ? "cy-GB" : "en-GB"}>
                  {older.title}
                </strong>
              </Link>
            ) : (
              <span />
            )}
            {newer ? (
              <Link
                className={siteStyles.outlineAction}
                rel="next"
                href={neighbourHref(newer.id)}
              >
                <span>{t("upd.page.newer")}</span>
                <strong lang={newer.welsh ? "cy-GB" : "en-GB"}>
                  {newer.title}
                </strong>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </main>
      <BusinessSiteFooter tradingName={business.tradingName} />
    </div>
  );
}
