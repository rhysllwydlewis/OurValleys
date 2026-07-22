import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicEvent } from "@/modules/events/public";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ eventId: string }> };

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { eventId } = await params;
  const result = await getPublicEvent(eventId);

  return {
    title:
      result.state === "found"
        ? `${result.event.title} | OurValleys`
        : "Event not available | OurValleys",
    description:
      result.state === "found"
        ? `View details for ${result.event.title}, supplied by ${result.event.businessName}.`
        : "The requested local event is not available.",
    robots: { index: false, follow: false },
  };
}

export default async function EventDetailPage({ params }: PageProps) {
  const { eventId } = await params;
  const result = await getPublicEvent(eventId);

  if (result.state === "not_found") notFound();

  return (
    <>
      <SiteHeader />
      <main className="businesses-page">
        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Temporary problem</p>
            <h1>Event details are temporarily unavailable.</h1>
            <p>
              The event service could not be reached. No draft, expired or
              private event information has been shown.
            </p>
            <div className="actions">
              <Link className="button primary" href="/events">
                Return to events
              </Link>
              <Link className="button" href="/businesses">
                Browse businesses
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section
              className="businesses-hero"
              aria-labelledby="event-detail-title"
            >
              <div className="tag-row">
                <span className="tag">
                  {result.event.fictional ? "Fictional demo" : "Local event"}
                </span>
              </div>
              <p className="eyebrow">{formatDate(result.event.startsAt)}</p>
              <h1 id="event-detail-title">{result.event.title}</h1>
              <p className="lead">{result.event.description}</p>
            </section>

            <section
              className="state-panel"
              aria-labelledby="event-information-title"
            >
              <p className="eyebrow">Event information</p>
              <h2 id="event-information-title">Plan your visit</h2>
              <p>
                <strong>Starts:</strong> {formatDate(result.event.startsAt)}
              </p>
              {result.event.endsAt ? (
                <p>
                  <strong>Ends:</strong> {formatDate(result.event.endsAt)}
                </p>
              ) : null}
              {result.event.locationDisplay ? (
                <p>
                  <strong>Location:</strong> {result.event.locationDisplay}
                </p>
              ) : null}
              <p>
                <strong>Organiser:</strong>{" "}
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
                    Book or learn more
                  </a>
                ) : null}
                <Link className="button" href="/events">
                  Browse all events
                </Link>
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
