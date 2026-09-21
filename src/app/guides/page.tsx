import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublicPageRobots } from "@/lib/release-stage";
import { listPublicGuides } from "@/modules/guides/public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local guides",
  description:
    "Browse local guides connecting businesses, places and events across Rhondda Cynon Taf.",
  robots: getPublicPageRobots(),
};

export default async function GuidesPage() {
  const result = await listPublicGuides();
  const guides = result.state === "ready" ? result.guides : [];

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="guides-title">
          <p className="eyebrow">Local guides</p>
          <h1 id="guides-title">
            Plan a local day with a clearer starting point.
          </h1>
          <p className="lead">
            Guides connect businesses, places and events into a single practical
            journey, written and kept up to date by the OurValleys editorial
            team.
          </p>
        </section>

        <section aria-labelledby="guide-list-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Published guides</p>
              <h2 id="guide-list-title">
                {guides.length === 0
                  ? "No guides published yet"
                  : `Browse ${guides.length} guide${guides.length === 1 ? "" : "s"}`}
              </h2>
            </div>
            <p>No paid placement or unverified recommendation claims</p>
          </div>
          {result.state === "unavailable" ? (
            <div className="state-panel">
              <p>
                Guides are temporarily unavailable. Please try again shortly.
              </p>
            </div>
          ) : guides.length === 0 ? (
            <div className="state-panel">
              <p>
                Nothing has been published here yet. Search the directory below
                for businesses, places and events in the meantime.
              </p>
            </div>
          ) : (
            <div className="business-grid">
              {guides.map((guide) => (
                <article
                  className="business-card business-card--simple"
                  key={guide.slug}
                >
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">{guide.area}</span>
                    </div>
                    <h3>{guide.title}</h3>
                    <p>{guide.summary}</p>
                    <p>{guide.readingTime}</p>
                    <Link
                      className="text-link"
                      href={`/guides/${guide.slug}` as Route}
                    >
                      Read the guide
                      <span aria-hidden="true"> →</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="state-panel" aria-labelledby="guide-safety-title">
          <p className="eyebrow">Can&apos;t find what you need?</p>
          <h2 id="guide-safety-title">Search the full directory instead.</h2>
          <p>
            Guides cover a growing set of local journeys. Directory search
            remains the source of truth for every published business, place and
            event.
          </p>
          <div className="actions">
            <Link className="button primary" href="/businesses">
              Search businesses
            </Link>
            <Link className="button" href="/events">
              Browse events
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
