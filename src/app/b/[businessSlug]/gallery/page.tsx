import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { BusinessGallery } from "@/components/business-gallery";
import {
  galleryLabels,
  galleryLayoutKey,
  galleryViews,
} from "@/components/business-gallery-view";
import {
  BusinessSiteFooter,
  BusinessSiteHeader,
} from "@/components/business-site-chrome";
import { businessSiteTheme } from "@/components/business-site-theme";
import siteStyles from "@/components/generated-business-website.module.css";
import { JsonLd } from "@/components/json-ld";
import galleryStyles from "@/components/business-gallery.module.css";
import { ShareControl } from "@/components/share-control";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getSiteUrl, pageUrlMetadata } from "@/lib/site";
import { buildGalleryJsonLd } from "@/lib/structured-data";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import { listBusinessMedia } from "@/modules/businesses/media";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { resolvePublishedBusinessRedirect } from "@/modules/businesses/public-operations";

export const dynamic = "force-dynamic";

type Params = Promise<{ businessSlug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const [result, { locale, t }] = await Promise.all([
    getPublishedBusinessBySlug(businessSlug),
    getTranslator(),
  ]);
  if (result.state !== "ready") {
    return {
      title: t("site.page.metaUnavailable"),
      robots: { index: false, follow: false },
    };
  }
  const { business } = result;
  const title = t("gallery.page.metaTitle", { business: business.tradingName });
  const description = t("gallery.page.metaDescription", {
    business: business.tradingName,
  });
  const base = pageUrlMetadata(`${business.site.platformPath}/gallery`, {
    title,
    description,
    locale: LOCALE_DETAILS[locale].openGraph,
  });
  return {
    title,
    description,
    alternates: base.alternates,
    openGraph: base.openGraph,
    robots: business.isDemo
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export default async function BusinessGalleryPage({
  params,
}: {
  params: Params;
}) {
  const { businessSlug } = await params;
  const [result, { locale, t }] = await Promise.all([
    getPublishedBusinessBySlug(businessSlug),
    getTranslator(),
  ]);
  if (result.state === "missing") {
    // An approved slug change keeps old shared gallery links working.
    const redirectSlug = await resolvePublishedBusinessRedirect(businessSlug);
    if (redirectSlug) permanentRedirect(`/b/${redirectSlug}/gallery`);
  }
  if (result.state !== "ready") notFound();
  const { business } = result;
  const [media, appearance] = await Promise.all([
    listBusinessMedia(business.id),
    getBusinessAppearance(business.id),
  ]);
  // A business with no photos has no gallery page.
  if (media.gallery.length === 0) notFound();

  const theme = businessSiteTheme(appearance);
  const views = galleryViews(media.gallery, media.gallery.length, t);
  const path = `/b/${business.slug}/gallery`;
  const origin = getSiteUrl().origin;
  // The owner's photo descriptions are their own words, not translated text.
  const authoredLang = locale === "cy" ? "en-GB" : undefined;
  // The page leads with the owner's chosen gallery layout, but the strip
  // (a horizontal scroller) is a poor way to browse every photo, so it reads
  // as the mosaic here.
  const chosen = galleryLayoutKey(appearance.sectionLayouts.gallery);
  const layout = chosen === "strip" ? "mosaic" : chosen;

  return (
    <div
      className={`${siteStyles.site} business-gallery-page`}
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
          <Link href={`/b/${business.slug}`}>
            {t("gallery.page.back", { business: business.tradingName })}
          </Link>
        </nav>
        <header className={galleryStyles.pageHeader}>
          <p className={siteStyles.eyebrow}>{t("site.gallery.eyebrow")}</p>
          <h1>{t("gallery.page.pageTitle")}</h1>
          <p>
            {media.gallery.length === 1
              ? t("gallery.page.countOne")
              : t("gallery.page.count", { count: media.gallery.length })}
          </p>
          <p className={galleryStyles.hint}>{t("gallery.page.hint")}</p>
          <ShareControl
            title={t("gallery.page.metaTitle", {
              business: business.tradingName,
            })}
            url={`${origin}${path}`}
            label={t("gallery.page.share")}
            messages={{
              shared: t("share.shared"),
              copied: t("share.copied"),
              cancelled: "",
              unavailable: t("share.unavailable"),
            }}
          />
        </header>
        <div className={galleryStyles.pageBody}>
          <BusinessGallery
            photos={views}
            layout={layout}
            labels={galleryLabels(t)}
            lang={authoredLang}
          />
        </div>
        <JsonLd
          data={buildGalleryJsonLd(
            {
              businessName: business.tradingName,
              path,
              isDemo: business.isDemo,
              photos: views.map((view) => ({
                url: view.url,
                label: view.label,
              })),
            },
            origin,
          )}
        />
      </main>
      <BusinessSiteFooter tradingName={business.tradingName} />
    </div>
  );
}
