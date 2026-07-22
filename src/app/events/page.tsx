import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listPublicEvents } from "@/modules/events/public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local events | OurValleys",
  description:
    "Discover upcoming fictional events supplied by published local businesses and organisations.",
  robots: { index: false, follow: false },
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function EventsPage() {
  const result = await listPublicEvents();

  return (
    <>
      <SiteHeader />
      <main className="businesses-page">
        <section className="businesses-hero" aria-labelledby="events-title">
          <p className="eyebrow">What is happening locally</p>
          <h1 id="events-title">Find your next local event.</h1>
          <p className="lead">
            Browse active event demonstrations from published local businesses.
            Events disappear automatically when they finish or are withdrawn.
          </p>
          <div className="actions">
            <Link className="button primary" href="/places">
              Explore local places
            </Link>
            <Link className="button" href="/businesses">
              Browse businesses
            </Link>
          </div>
        </section>

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Temporary problem</p>
            <h2>Local events are temporarily unavailable.</h2>
            <p>
              The event service could not be reached. Business and place
              discovery remain available while it recovers.
            </p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                Browse businesses
              </Link>
              <Link className="button" href="/">
                Return home
              </Link>
            </div>
          </section>
        ) : result.events.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Developing local coverage</p>
            <h2>No upcoming event demonstrations are published yet.</h2>
            <p>
              This directory is ready for active events without inventing real
              local listings or displaying expired content.
            </p>
            <Link className="button primary" href="/businesses">
              Discover local businesses
            </Link>
          </section>
        ) : (
          <section
            className="business-results"
            aria-labelledby="event-results-title"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">Upcoming demonstrations</p>
                <h2 id="event-results-title">
                  {result.events.length} upcoming event
                  {result.events.length === 1 ? "" : "s"}
                </h2>
              </div>
              <p>Active events from published businesses only</p>
            </div>
            <div className="business-grid">
              {result.events.map((event) => (
                <article className="business-card" key={event.id}>
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">
                        {event.fictional ? "Fictional demo" : "Local event"}
                      </span>
                    </div>
                    <p className="eyebrow">{formatDate(event.startsAt)}</p>
                    <h3>{event.title}</h3>
                    <p>
                      By{" "}
                      <Link href={`/b/${event.businessSlug}` as Route}>
                        {event.businessName}
                      </Link>
                    </p>
                    {event.locationDisplay ? (
                      <p>{event.locationDisplay}</p>
                    ) : null}
                    <p>{event.description}</p>
                    <Link
                      className="text-link"
                      href={`/events/${event.id}` as Route}
                    >
                      View event details
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
