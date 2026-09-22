import type { Metadata, Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SavedEventControl } from "@/components/saved-event-control";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
} from "@/modules/events/calendar";
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
      result.state === "found" ? result.event.title : "Event not available",
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
      <main className="directory-shell">
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
              className="directory-intro"
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

            <section
              className="state-panel"
              aria-labelledby="add-to-calendar-title"
            >
              <p className="eyebrow">Plan ahead</p>
              <h2 id="add-to-calendar-title">Add to your calendar</h2>
              <p>
                Save the date so this event turns up alongside the rest of your
                plans.
              </p>
              <div className="actions">
                <a
                  className="button primary"
                  href={`/api/events/${result.event.id}/ics`}
                >
                  Download .ics (Apple, Outlook desktop)
                </a>
                <a
                  className="button"
                  href={buildGoogleCalendarUrl(result.event)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Add to Google Calendar
                </a>
                <a
                  className="button"
                  href={buildOutlookCalendarUrl(result.event)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Add to Outlook.com
                </a>
              </div>
            </section>

            <SavedEventControl
              eventId={result.event.id}
              returnTo={`/events/${result.event.id}`}
            />

            <p>
              <Link href={`/report/event/${result.event.id}` as Route}>
                Report an issue with this event
              </Link>
            </p>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
