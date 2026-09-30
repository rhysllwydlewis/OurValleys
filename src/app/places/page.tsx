import type { Metadata, Route } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { councilAreas } from "@/data/reference/valleys-places";
import { listActivePlaces } from "@/modules/reference-data/places";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore places",
  description:
    "Browse provisional South Wales Valleys place routes and discover published local businesses.",
  robots: { index: false, follow: false },
};

export default async function PlacesPage() {
  const places = await listActivePlaces();

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="places-title">
          <p className="eyebrow">Explore by place</p>
          <h1 id="places-title">Start with somewhere local.</h1>
          <p className="lead">
            These provisional place routes use active reference data while the
            launch hierarchy continues through validation.
          </p>
        </section>

        <section aria-labelledby="council-areas-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Our coverage</p>
              <h2 id="council-areas-title">
                Which council areas are included?
              </h2>
            </div>
          </div>
          <p className="body-copy">
            OurValleys is founded in Rhondda Cynon Taf, where most published
            businesses are today. The place hierarchy also covers the wider
            South Wales Valleys identity, expanding council area by council area
            as real local businesses join.
          </p>
          <div className="business-grid">
            {councilAreas.map((area) => (
              <article
                className="business-card business-card--simple"
                key={area.slug}
              >
                <div className="business-card__body">
                  <h3>{area.name}</h3>
                  <p>{area.description}</p>
                  <Link
                    className="text-link"
                    href={`/places/${area.slug}` as Route}
                  >
                    Explore {area.name}
                    <span aria-hidden="true"> →</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        {places.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Temporary problem</p>
            <h2>Place discovery is temporarily unavailable.</h2>
            <p>Business search is still available without selecting a place.</p>
            <div className="actions">
              <Link className="button primary" href="/businesses">
                Search all businesses
              </Link>
              <Link className="button" href="/">
                Return home
              </Link>
            </div>
          </section>
        ) : (
          <section aria-labelledby="place-list-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Active provisional areas</p>
                <h2 id="place-list-title">
                  Browse {places.length}{" "}
                  {places.length === 1 ? "place" : "places"}
                </h2>
              </div>
              <p>Fictional demonstration content only</p>
            </div>
            <div className="business-grid">
              {places.map((place) => (
                <article
                  className="business-card business-card--simple"
                  key={place.id}
                >
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">Provisional place</span>
                    </div>
                    <h3>{place.name}</h3>
                    <p>
                      Discover published fictional businesses associated with
                      this active reference-data area.
                    </p>
                    <Link
                      className="text-link"
                      href={`/places/${place.slug}` as Route}
                    >
                      Explore {place.name}
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
