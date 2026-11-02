import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { z } from "zod";
import {
  BusinessSiteFooter,
  BusinessSiteHeader,
} from "@/components/business-site-chrome";
import { businessSiteTheme } from "@/components/business-site-theme";
import { BusinessUpdateList } from "@/components/business-updates";
import updateStyles from "@/components/business-updates.module.css";
import siteStyles from "@/components/generated-business-website.module.css";
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getBusinessAppearance } from "@/modules/businesses/appearance-repository";
import { listBusinessMedia } from "@/modules/businesses/media";
import { getPublishedBusinessBySlug } from "@/modules/businesses/public";
import { resolvePublishedBusinessRedirect } from "@/modules/businesses/public-operations";
import {
  findUpdatePage,
  listBusinessUpdates,
} from "@/modules/businesses/public-updates";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

type Params = Promise<{ businessSlug: string }>;
type Search = Promise<{
  page?: string | string[];
  update?: string | string[];
}>;

function pageNumber(raw: string | string[] | undefined): number {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return Number.isInteger(value) && value >= 1 && value <= 10_000 ? value : 1;
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const [result, { t }] = await Promise.all([
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
  return {
    title: t("upd.site.metaTitle", { business: business.tradingName }),
    description: t("upd.site.metaDescription", {
      business: business.tradingName,
    }),
    alternates: { canonical: `${business.site.platformPath}/updates` },
    robots: business.isDemo
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export default async function BusinessUpdatesPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { businessSlug } = await params;
  const [result, { locale, t }, query] = await Promise.all([
    getPublishedBusinessBySlug(businessSlug),
    getTranslator(),
    searchParams,
  ]);
  // An outage is an error page, not a "no such page".
  if (result.state === "unavailable") {
    throw new Error("The published business could not be read.");
  }
  if (result.state === "missing") {
    // An approved slug change keeps old shared links working.
    const redirectSlug = await resolvePublishedBusinessRedirect(businessSlug);
    if (redirectSlug) permanentRedirect(`/b/${redirectSlug}/updates`);
  }
  if (result.state !== "ready") notFound();
  const { business } = result;
  // `?update=<id>` opens the page that holds that update.
  const updateParam = Array.isArray(query.update)
    ? query.update[0]
    : query.update;
  const targetPage =
    updateParam && z.uuid().safeParse(updateParam).success
      ? await findUpdatePage({
          businessId: business.id,
          updateId: updateParam,
          pageSize: PAGE_SIZE,
        })
      : null;
  const requestedPage = targetPage ?? pageNumber(query.page);
  const [first, appearance, media] = await Promise.all([
    listBusinessUpdates({
      businessId: business.id,
      locale,
      limit: PAGE_SIZE,
      offset: (requestedPage - 1) * PAGE_SIZE,
    }),
    getBusinessAppearance(business.id),
    listBusinessMedia(business.id),
  ]);
  // An outage is an error page, not a "no such page".
  if (first.unavailable) throw new Error("Business updates could not be read.");
  // A business with no published updates has nothing to show here.
  if (first.total === 0) notFound();
  const totalPages = Math.ceil(first.total / PAGE_SIZE);
  // A page past the end shows the last page rather than an empty list.
  const page = Math.min(requestedPage, totalPages);
  const shown =
    page === requestedPage
      ? first
      : await listBusinessUpdates({
          businessId: business.id,
          locale,
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE,
        });
  const theme = businessSiteTheme(appearance);
  const href = (target: number) =>
    (target > 1
      ? `/b/${business.slug}/updates?page=${target}`
      : `/b/${business.slug}/updates`) as Route;

  return (
    <div
      className={`${siteStyles.site} business-updates-page`}
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
            {t("menu.public.back", { business: business.tradingName })}
          </Link>
        </nav>
        <header>
          <p className={siteStyles.eyebrow}>{t("upd.site.eyebrow")}</p>
          <h1>{t("upd.site.pageTitle", { business: business.tradingName })}</h1>
          <p>
            {first.total === 1
              ? t("upd.site.countOne")
              : t("upd.site.count", { count: first.total })}
          </p>
        </header>
        <BusinessUpdateList
          updates={shown.updates}
          locale={locale}
          headingLevel="h2"
          reportLabel={t("upd.report")}
        />
        {totalPages > 1 ? (
          <nav className={updateStyles.pager} aria-label={t("dir.pagesAria")}>
            {page > 1 ? (
              <Link
                className={siteStyles.outlineAction}
                rel="prev"
                href={href(page - 1)}
              >
                {t("dir.previous")}
              </Link>
            ) : null}
            <span aria-current="page">
              {t("upd.site.pageOf", { page, total: totalPages })}
            </span>
            {page < totalPages ? (
              <Link
                className={siteStyles.outlineAction}
                rel="next"
                href={href(page + 1)}
              >
                {t("dir.next")}
              </Link>
            ) : null}
          </nav>
        ) : null}
      </main>
      <BusinessSiteFooter tradingName={business.tradingName} />
    </div>
  );
}
