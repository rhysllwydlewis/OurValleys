import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { listPublishedBusinesses } from "@/modules/businesses/public";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Local businesses | OurValleys",
  description:
    "Browse a clearly labelled fictional business fixture proving local discovery for Rhondda Cynon Taf.",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  q?: string | string[];
  category?: string | string[];
  place?: string | string[];
}>;

function firstValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const values = await searchParams;
  const query = firstValue(values.q);
  const category = firstValue(values.category);
  const place = firstValue(values.place);
  const result = await listPublishedBusinesses({ query, category, place });

  return (
    <>
      <SiteHeader />
      <main className="directory-shell">
        <section className="directory-intro" aria-labelledby="directory-title">
          <p className="eyebrow">Local business discovery</p>
          <h1 id="directory-title">Find something useful nearby.</h1>
          <p className="lead">
            This first connected slice uses fictional data only. Search the same
            canonical business record that powers its generated website.
          </p>
        </section>

        <form className="search-panel" action="/businesses" method="get">
          <div className="field">
            <label htmlFor="business-query">What do you need?</label>
            <input
              id="business-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Try heating"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="business-place">Place</label>
            <select id="business-place" name="place" defaultValue={place}>
              <option value="">All launch areas</option>
              <option value="tonypandy">Tonypandy</option>
            </select>
          </div>
          <button className="button primary" type="submit">
            Search businesses
          </button>
        </form>

        {result.state === "unavailable" ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">Temporary problem</p>
            <h2>Business discovery is temporarily unavailable.</h2>
            <p>
              The public site is still available. Please try this search again
              after the data service has recovered.
            </p>
          </section>
        ) : result.businesses.length === 0 ? (
          <section className="state-panel" aria-live="polite">
            <p className="eyebrow">No exact matches</p>
            <h2>No businesses match these filters.</h2>
            <p>Try a broader search or clear the selected place.</p>
            <Link className="button" href="/businesses">
              Clear search
            </Link>
          </section>
        ) : (
          <section aria-labelledby="results-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Search results</p>
                <h2 id="results-title">
                  {result.businesses.length} fictional local business
                </h2>
              </div>
              <p>Organic demonstration result · no paid placement</p>
            </div>
            <div className="business-grid">
              {result.businesses.map((business) => (
                <article className="business-card" key={business.id}>
                  <div className="business-card__art" aria-hidden="true">
                    <span>Local service</span>
                  </div>
                  <div className="business-card__body">
                    <div className="tag-row">
                      <span className="tag">Fictional demo</span>
                      <span className="tag tag--quiet">
                        {business.verificationStatus === "verified"
                          ? "Verified"
                          : "Not verified"}
                      </span>
                    </div>
                    <h3>{business.tradingName}</h3>
                    <p>{business.summary}</p>
                    <dl className="compact-facts">
                      <div>
                        <dt>Category</dt>
                        <dd>{business.category.name}</dd>
                      </div>
                      <div>
                        <dt>Area</dt>
                        <dd>{business.place.name}</dd>
                      </div>
                    </dl>
                    <Link className="text-link" href={`/b/${business.slug}`}>
                      View generated website
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
