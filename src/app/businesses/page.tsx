import { BusinessCard } from "@/components/public/business-card";
import { searchPublishedBusinesses } from "@/modules/businesses/repository";

export const dynamic = "force-dynamic";
type SearchParameters = Promise<Record<string, string | string[] | undefined>>;

export default async function BusinessesPage({ searchParams }: { searchParams: SearchParameters }) {
  const parameters = await searchParams;
  const query = typeof parameters.q === "string" ? parameters.q : "";
  const place = typeof parameters.place === "string" ? parameters.place : "";
  const businesses = await searchPublishedBusinesses({ query, place: place || undefined });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-3xl">
        <p className="font-semibold text-emerald-800">Local directory</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Businesses across RCT</h1>
        <p className="mt-4 text-lg text-slate-600">Published profiles only. Private owner, verification and billing information is never included in public results.</p>
      </div>
      <form className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_1fr_auto]" action="/businesses">
        <div>
          <label className="text-sm font-bold" htmlFor="directory-query">What do you need?</label>
          <input id="directory-query" name="q" defaultValue={query} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4" placeholder="Business name or service" />
        </div>
        <div>
          <label className="text-sm font-bold" htmlFor="directory-place">Town or village slug</label>
          <input id="directory-place" name="place" defaultValue={place} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4" placeholder="for example, treorchy" />
        </div>
        <button className="min-h-12 self-end rounded-xl bg-emerald-800 px-6 font-bold text-white hover:bg-emerald-700">Search</button>
      </form>
      <p className="mt-8 text-sm text-slate-600" aria-live="polite">{businesses.length} published {businesses.length === 1 ? "business" : "businesses"} found</p>
      {businesses.length > 0 ? (
        <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{businesses.map((business) => <BusinessCard key={business.id} business={business} />)}</div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8">
          <h2 className="text-xl font-bold">No matching businesses yet</h2>
          <p className="mt-2 text-slate-600">Try a broader term or remove the place filter. Empty results are kept honest rather than filled with invented listings.</p>
        </div>
      )}
    </div>
  );
}
