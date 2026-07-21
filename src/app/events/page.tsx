import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listUpcomingBusinessEvents } from "@/modules/businesses/content-features";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Local events",
  description:
    "Upcoming events supplied by local businesses and organisations.",
};

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function EventsPage() {
  const events = await listUpcomingBusinessEvents();
  return (
    <>
      <SiteHeader />
      <main className="businesses-page">
        <section className="businesses-hero" aria-labelledby="events-title">
          <p className="eyebrow">Across OurValleys</p>
          <h1 id="events-title">Upcoming local events.</h1>
          <p className="lead">
            Businesses enter an event once. Active events appear here and on the
            business website, then stop promoting automatically when they
            finish.
          </p>
        </section>
        <section
          className="business-results"
          aria-labelledby="event-results-title"
        >
          <h2 id="event-results-title">
            {events.length} upcoming event{events.length === 1 ? "" : "s"}
          </h2>
          {events.length === 0 ? (
            <div className="state-panel">
              <h3>No upcoming business events are published yet.</h3>
              <p>Check back as local businesses add events.</p>
            </div>
          ) : (
            <div className="business-grid">
              {events.map((event) => (
                <article className="business-card" key={event.id}>
                  <p className="eyebrow">{formatDate(event.startsAt)}</p>
                  <h3>{event.title}</h3>
                  {event.businessName && event.businessSlug ? (
                    <p>
                      By{" "}
                      <Link href={`/b/${event.businessSlug}` as Route}>
                        {event.businessName}
                      </Link>
                    </p>
                  ) : null}
                  {event.locationDisplay ? (
                    <p>{event.locationDisplay}</p>
                  ) : null}
                  <p>{event.description}</p>
                  {event.bookingUrl ? (
                    <a
                      className="button"
                      href={event.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Book or learn more
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
