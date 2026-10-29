import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import browseStyles from "@/components/browse/browse.module.css";
import { OfferCard } from "@/components/browse/offer-card";
import {
  ContentPicture,
  contentPictureSizes,
} from "@/components/content-picture";
import { JsonLd } from "@/components/json-ld";
import { ShareControl } from "@/components/share-control";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { Translator } from "@/lib/i18n/translate";
import { getPublicPageRobots } from "@/lib/release-stage";
import { getSiteUrl, pageUrlMetadata } from "@/lib/site";
import { buildBreadcrumbJsonLd, buildOfferJsonLd } from "@/lib/structured-data";
import {
  describeOfferTimeline,
  safeOfferActionUrl,
  type OfferTimeline,
} from "@/modules/businesses/offer-page-model";
import {
  getPublicOffer,
  listRelatedOffers,
} from "@/modules/businesses/public-offer-detail";
import { listSavedOfferIdsForUser } from "@/modules/residents/saved-discovery";
import {
  removeOfferAction,
  saveOfferAction,
} from "@/app/account/saved/actions";
import styles from "./offer-page.module.css";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<{
    savedKind?: string | string[];
    savedOutcome?: string | string[];
  }>;
};

function formatDay(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "full",
    timeZone: "Europe/London",
  }).format(value);
}

function timelineLabel(timeline: OfferTimeline, t: Translator): string {
  switch (timeline.kind) {
    case "ended":
      return t("offerPage.ended");
    case "open":
      return t("offers.noEnd");
    case "today":
      return t("offers.endsToday");
    case "tomorrow":
      return t("offers.endsTomorrow");
    case "days":
      return t("offers.endsInDays", { days: timeline.days });
  }
}

function urgencyOf(timeline: OfferTimeline): string {
  if (timeline.kind === "ended") return "ended";
  if (timeline.kind === "open") return "open";
  return timeline.urgency;
}

async function readUserId(): Promise<string | null> {
  try {
    const session = await getAuth().api.getSession({
      headers: await headers(),
    });
    return session?.user.id ?? null;
  } catch {
    return null;
  }
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { offerId } = await params;
  const { t, locale } = await getTranslator();
  const result = await getPublicOffer(offerId, locale);
  if (result.state !== "found") {
    return {
      title: t("offerPage.metaTitleNotFound"),
      description: t("offerPage.metaDescriptionNotFound"),
      robots: { index: false, follow: false },
    };
  }
  const { offer } = result;
  const title = t("offerPage.metaTitle", {
    title: offer.title,
    business: offer.businessName,
  });
  const description = t("offerPage.metaDescription", {
    business: offer.businessName,
    place: offer.placeName,
    title: offer.title,
  });
  return {
    title,
    description,
    // An ended or demonstration offer is never offered to search engines.
    robots:
      offer.ended || offer.fictional
        ? { index: false, follow: false }
        : getPublicPageRobots(),
    ...pageUrlMetadata(`/offers/${offer.id}`, {
      title,
      description,
      locale: LOCALE_DETAILS[locale].openGraph,
    }),
  };
}

export default async function OfferPage({ params, searchParams }: PageProps) {
  const { offerId } = await params;
  const query = await searchParams;
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const result = await getPublicOffer(offerId, locale);

  if (result.state === "not_found") notFound();

  if (result.state === "unavailable") {
    return (
      <>
        <SiteHeader />
        <main className="directory-shell">
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("offerPage.unavailableEyebrow")}</p>
            <h1>{t("offerPage.unavailableTitle")}</h1>
            <p>{t("offerPage.unavailableBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/offers">
                {t("offerPage.allOffers")}
              </Link>
              <Link className="button" href="/businesses">
                {t("offerPage.browseBusinesses")}
              </Link>
            </div>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  const { offer } = result;
  const now = new Date();
  const origin = getSiteUrl().origin;
  const path = `/offers/${offer.id}`;
  const timeline = describeOfferTimeline(offer.endsAt, now);
  const actionUrl = offer.ended ? null : safeOfferActionUrl(offer.actionUrl);
  const userId = await readUserId();
  const [savedIds, related] = await Promise.all([
    userId && !offer.ended
      ? listSavedOfferIdsForUser(userId)
      : Promise.resolve<string[]>([]),
    listRelatedOffers(offer, locale),
  ]);
  const isSaved = savedIds.includes(offer.id);
  const outcome =
    first(query.savedKind) === "offer" ? first(query.savedOutcome) : undefined;
  const outcomeMessage =
    outcome === "saved" || outcome === "already_saved"
      ? t("offerPage.save.outcomeSaved")
      : outcome === "removed" || outcome === "not_found"
        ? t("offerPage.save.outcomeRemoved")
        : outcome === "invalid" ||
            outcome === "unavailable" ||
            outcome === "forbidden"
          ? t("offerPage.save.outcomeFailed")
          : null;
  const titleLang = offer.welshTitle ? "cy-GB" : "en-GB";

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <JsonLd data={buildOfferJsonLd(offer, origin)} />
        <JsonLd
          data={buildBreadcrumbJsonLd(
            [
              { name: t("breadcrumb.home"), path: "/" },
              { name: t("nav.offers"), path: "/offers" },
              { name: offer.title, path },
            ],
            origin,
            { demo: offer.fictional },
          )}
        />

        <Link className={styles.back} href="/offers">
          <span aria-hidden="true">←</span> {t("offerPage.allOffers")}
        </Link>

        {offer.ended ? (
          <section
            className={styles.endedBanner}
            aria-labelledby="offer-ended-title"
            lang={lang}
          >
            <h2 id="offer-ended-title">{t("offerPage.endedTitle")}</h2>
            <p>
              {t("offerPage.endedBody", {
                business: offer.businessName,
                date: formatDay(offer.endsAt as Date, locale),
              })}
            </p>
            <div className={styles.actions}>
              <Link className="button primary" href="/offers">
                {t("offerPage.seeCurrent")}
              </Link>
              <Link
                className="button"
                href={`/b/${offer.businessSlug}#offers` as Route}
              >
                {t("offerPage.viewBusiness", { business: offer.businessName })}
              </Link>
            </div>
          </section>
        ) : null}

        <article className={styles.hero} aria-labelledby="offer-title">
          <div>
            {offer.image ? (
              <div className={styles.picture}>
                <ContentPicture
                  image={offer.image}
                  variant="inset"
                  sizes={contentPictureSizes.wide}
                  priority
                />
              </div>
            ) : (
              <div className={styles.placeholder} lang="en-GB">
                {offer.businessName}
              </div>
            )}
          </div>

          <div className={styles.summary}>
            <div className={styles.badges}>
              <span
                className={styles.urgency}
                data-urgency={urgencyOf(timeline)}
                lang={lang}
              >
                {timelineLabel(timeline, t)}
              </span>
              {offer.fictional ? (
                <span className="tag" lang={lang}>
                  {t("offers.fictionalDemo")}
                </span>
              ) : null}
            </div>
            <h1 id="offer-title" className={styles.title} lang={titleLang}>
              {offer.title}
            </h1>
            <p className={styles.by} lang={lang}>
              {t("offersx.at")}{" "}
              <Link href={`/b/${offer.businessSlug}` as Route} lang="en-GB">
                {offer.businessName}
              </Link>
              {" · "}
              <Link href={`/places/${offer.placeSlug}` as Route} lang="en-GB">
                {offer.placeName}
              </Link>
            </p>
            <p
              className={styles.description}
              lang={offer.welshDescription ? "cy-GB" : "en-GB"}
            >
              {offer.description}
            </p>

            {outcomeMessage ? (
              <p className={styles.status} role="status" lang={lang}>
                {outcomeMessage}
              </p>
            ) : null}

            <div className={styles.actions} lang={lang}>
              {actionUrl ? (
                <a
                  className="button primary"
                  href={actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span lang={offer.welshActionLabel ? "cy-GB" : "en-GB"}>
                    {offer.actionLabel || t("offerPage.actionDefault")}
                  </span>
                  <span className="sr-only"> {t("offerPage.opensNewTab")}</span>
                </a>
              ) : null}
              {offer.ended ? null : isSaved ? (
                <form action={removeOfferAction} data-print="hide">
                  <input name="itemId" type="hidden" value={offer.id} />
                  <input name="returnTo" type="hidden" value={path} />
                  <button className="button" type="submit">
                    {t("offerPage.save.remove")}
                  </button>
                </form>
              ) : (
                <form action={saveOfferAction} data-print="hide">
                  <input name="itemId" type="hidden" value={offer.id} />
                  <input name="returnTo" type="hidden" value={path} />
                  <button
                    className={actionUrl ? "button" : "button primary"}
                    type="submit"
                  >
                    {t("offerPage.save.button")}
                  </button>
                </form>
              )}
              <ShareControl
                title={offer.title}
                url={new URL(path, getSiteUrl()).toString()}
                label={t("offerPage.share")}
                messages={{
                  shared: t("share.shared"),
                  copied: t("share.copied"),
                  cancelled: "",
                  unavailable: t("share.unavailable"),
                }}
              />
            </div>
            {offer.ended ? null : (
              <p className={styles.by} lang={lang}>
                {isSaved
                  ? t("offerPage.save.savedHint")
                  : userId
                    ? t("offerPage.save.hint")
                    : t("offerPage.save.hintSignedOut")}
              </p>
            )}
          </div>
        </article>

        <section
          className={styles.details}
          aria-label={t("offerPage.detailsAria")}
        >
          <div className={styles.panel} lang={lang}>
            <h2>{t("offerPage.when.title")}</h2>
            <dl className={styles.facts}>
              {offer.startsAt && offer.startsAt <= now ? (
                <div>
                  <dt>{t("offerPage.when.from")}</dt>
                  <dd>{formatDay(offer.startsAt, locale)}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t("offerPage.when.until")}</dt>
                <dd>
                  {offer.endsAt
                    ? formatDay(offer.endsAt, locale)
                    : t("offerPage.when.noEnd")}
                </dd>
              </div>
            </dl>
            <p>{t("offerPage.when.times")}</p>
          </div>

          <div className={styles.panel} lang={lang}>
            <h2>{t("offerPage.terms.title")}</h2>
            {offer.terms ? (
              <p lang={offer.welshTerms ? "cy-GB" : "en-GB"}>{offer.terms}</p>
            ) : (
              <p>{t("offerPage.terms.none")}</p>
            )}
            <p>{t("offerPage.terms.check")}</p>
          </div>
        </section>

        {related.length > 0 ? (
          <section
            className={styles.related}
            aria-labelledby="related-offers-title"
            lang={lang}
          >
            <h2 id="related-offers-title">
              {t("offerPage.related", { place: offer.placeName })}
            </h2>
            <ul className={browseStyles.grid}>
              {related.map((item) => (
                <li key={item.id}>
                  <OfferCard t={t} offer={item} now={now} />
                </li>
              ))}
            </ul>
            <p className={styles.relatedFoot}>
              <Link className="button" href="/offers">
                {t("offerPage.allOffers")}
              </Link>
            </p>
          </section>
        ) : null}

        <p className={styles.report} lang={lang}>
          <Link href={`/report/${offer.businessId}` as Route}>
            {t("offerPage.report")}
          </Link>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
