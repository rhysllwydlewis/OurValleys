import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listPublicGuides } from "@/modules/guides/public";

export const metadata: Metadata = {
  title: "Local guides | OurValleys",
  description:
    "Browse fictional representative guides for discovering businesses, places and events across Rhondda Cynon Taf.",
  robots: { index: false, follow: false },
};

export default function GuidesPage() {
  const guides = listPublicGuides();

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="guides-title">
          <p className="eyebrow">Explore local guide concepts</p>
          <h1 id="guides-title">
            Plan a local day with a clearer starting point.
          </h1>
          <p className="lead">
            These fictional representative guides demonstrate how future
            governed editorial content can connect businesses, places and events
            without presenting unverified recommendations as fact.
          </p>
          <div className="tag-row" aria-label="Guide status">
            <span className="tag">Fictional previews</span>
            <span className="tag">Provisional content model</span>
          </div>
        </section>

        <section aria-labelledby="guide-list-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Representative journeys</p>
              <h2 id="guide-list-title">
                Browse {guides.length} guide concepts
              </h2>
            </div>
            <p>No paid placement or real recommendation claims</p>
          </div>
          <div className="business-grid">
            {guides.map((guide) => (
              <article className="business-card" key={guide.slug}>
                <div className="business-card__body">
                  <div className="tag-row">
                    <span className="tag">Fictional guide</span>
                    <span className="tag">{guide.area}</span>
                  </div>
                  <h3>{guide.title}</h3>
                  <p>{guide.summary}</p>
                  <p>{guide.readingTime}</p>
                  <Link
                    className="text-link"
                    href={`/guides/${guide.slug}` as Route}
                  >
                    Open guide preview
                    <span aria-hidden="true"> →</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="state-panel" aria-labelledby="guide-safety-title">
          <p className="eyebrow">Content boundary</p>
          <h2 id="guide-safety-title">Useful structure, honest limitations.</h2>
          <p>
            Real guides will require editorial ownership, source checking,
            accessibility review and local validation. Until then, directory
            search remains the source of truth for published platform content.
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
