import {
  ContentPicture,
  contentPictureSizes,
} from "@/components/content-picture";
import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { ShareControl } from "@/components/share-control";
import { SavedEventControl } from "@/components/saved-event-control";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { LOCALE_DETAILS, type Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import { getSiteUrl } from "@/lib/site";
import { buildEventJsonLd } from "@/lib/structured-data";
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
} from "@/modules/events/calendar";
import { getPublicEvent } from "@/modules/events/public";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ eventId: string }> };

function formatDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const { t } = await getTranslator();
  const result = await getPublicEvent(eventId);
  const found =
    result.state === "found"
      ? t("eventDetail.metaDescription", {
          title: result.event.title,
          business: result.event.businessName,
        })
      : undefined;

  return {
    title:
      result.state === "found"
        ? result.event.title
        : t("eventDetail.metaTitleNotFound"),
    description: found ?? t("eventDetail.metaDescriptionNotFound"),
    robots: { index: false, follow: false },
    openGraph:
      result.state === "found"
        ? {
            type: "website",
            title: result.event.title,
            description: found,
            url: `/events/${result.event.id}`,
          }
        : undefined,
    twitter:
      result.state === "found"
        ? {
            card: "summary",
            title: result.event.title,
            description: found,
          }
        : undefined,
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { eventId } = await params;
  const { t, locale } = await getTranslator();
  const lang = LOCALE_DETAILS[locale].htmlLang;
  const result = await getPublicEvent(eventId);

  if (result.state === "not_found") notFound();

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite" lang={lang}>
            <p className="eyebrow">{t("eventDetail.unavailableEyebrow")}</p>
            <h1>{t("eventDetail.unavailableTitle")}</h1>
            <p>{t("eventDetail.unavailableBody")}</p>
            <div className="actions">
              <Link className="button primary" href="/events">
                {t("eventDetail.returnToEvents")}
              </Link>
              <Link className="button" href="/businesses">
                {t("eventDetail.browseBusinesses")}
              </Link>
            </div>
          </section>
        ) : (
          <>
            <JsonLd
              data={buildEventJsonLd(result.event, getSiteUrl().origin)}
            />
            <section
              className="directory-intro"
              aria-labelledby="event-detail-title"
            >
              <div className="tag-row">
                <span className="tag" lang={lang}>
                  {result.event.fictional
                    ? t("eventDetail.fictionalDemo")
                    : t("eventDetail.localEvent")}
                </span>
              </div>
              <p className="eyebrow">
                {formatDate(result.event.startsAt, locale)}
              </p>
              <h1 id="event-detail-title">{result.event.title}</h1>
              <p className="lead">{result.event.description}</p>
              <ContentPicture
                image={result.event.image}
                variant="inset"
                sizes={contentPictureSizes.wide}
                priority
              />
            </section>

            <section
              className="state-panel"
              aria-labelledby="event-information-title"
            >
              <p className="eyebrow" lang={lang}>
                {t("eventDetail.infoEyebrow")}
              </p>
              <h2 id="event-information-title" lang={lang}>
                {t("eventDetail.infoTitle")}
              </h2>
              <p>
                <strong lang={lang}>{t("eventDetail.starts")}</strong>{" "}
                {formatDate(result.event.startsAt, locale)}
              </p>
              {result.event.endsAt ? (
                <p>
                  <strong lang={lang}>{t("eventDetail.ends")}</strong>{" "}
                  {formatDate(result.event.endsAt, locale)}
                </p>
              ) : null}
              {result.event.locationDisplay ? (
                <p>
                  <strong lang={lang}>{t("eventDetail.location")}</strong>{" "}
                  {result.event.locationDisplay}
                </p>
              ) : null}
              <p>
                <strong lang={lang}>{t("eventDetail.organiser")}</strong>{" "}
                <Link href={`/b/${result.event.businessSlug}` as Route}>
                  {result.event.businessName}
                </Link>
              </p>
              <div className="actions">
                {result.event.bookingUrl ? (
                  <a
                    className="button primary"
                    href={result.event.bookingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span lang={lang}>{t("eventDetail.book")}</span>
                  </a>
                ) : null}
                <Link className="button" href="/events">
                  {t("eventDetail.browseAll")}
                </Link>
              </div>
            </section>

            <section
              className="state-panel"
              aria-labelledby="add-to-calendar-title"
              lang={lang}
            >
              <p className="eyebrow">{t("eventDetail.calendarEyebrow")}</p>
              <h2 id="add-to-calendar-title">
                {t("eventDetail.calendarTitle")}
              </h2>
              <p>{t("eventDetail.calendarBody")}</p>
              <div className="actions">
                <a
                  className="button primary"
                  href={`/api/events/${result.event.id}/ics`}
                >
                  {t("eventDetail.downloadIcs")}
                </a>
                <a
                  className="button"
                  href={buildGoogleCalendarUrl(result.event)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("eventDetail.googleCalendar")}
                </a>
                <a
                  className="button"
                  href={buildOutlookCalendarUrl(result.event)}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("eventDetail.outlookCalendar")}
                </a>
              </div>
            </section>

            <div lang={lang}>
              <ShareControl
                title={result.event.title}
                url={new URL(
                  `/events/${result.event.id}`,
                  getSiteUrl(),
                ).toString()}
                label={t("eventDetail.share")}
                messages={{
                  shared: t("share.shared"),
                  copied: t("share.copied"),
                  cancelled: "",
                  unavailable: t("share.unavailable"),
                }}
              />
            </div>

            <SavedEventControl
              eventId={result.event.id}
              returnTo={`/events/${result.event.id}`}
            />

            <p>
              <Link href={`/report/event/${result.event.id}` as Route}>
                <span lang={lang}>{t("eventDetail.report")}</span>
              </Link>
            </p>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
