import Link from "next/link";

const categories = ["Home and trades", "Food and drink", "Shopping", "Health and wellbeing", "Beauty", "Professional services"];

export default function HomePage() {
  return (
    <>
      <section className="bg-emerald-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="font-semibold text-emerald-200">Rhondda Cynon Taf, connected</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">Find the businesses, people and places that make our valleys work.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-emerald-50">OurValleys is building one trusted place to discover what is local, starting with useful business pages and town-based search.</p>
          <form className="mt-10 flex max-w-2xl flex-col gap-3 rounded-2xl bg-white p-3 sm:flex-row" action="/businesses">
            <label className="sr-only" htmlFor="home-search">Search local businesses</label>
            <input id="home-search" name="q" className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 text-slate-950" placeholder="Try plumber, café or wedding venue" />
            <button className="min-h-12 rounded-xl bg-amber-400 px-6 font-bold text-slate-950 hover:bg-amber-300">Search RCT</button>
          </form>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight">Explore locally</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link key={category} href={`/businesses?q=${encodeURIComponent(category)}`} className="rounded-2xl border border-slate-200 bg-white p-6 text-lg font-bold shadow-sm hover:border-emerald-600 hover:text-emerald-800">{category}</Link>
          ))}
        </div>
      </section>
      <section id="for-businesses" className="bg-amber-100">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div><p className="font-semibold text-amber-900">For local businesses</p><h2 className="mt-3 text-3xl font-black tracking-tight">One profile. One useful website. Updates everywhere.</h2></div>
          <p className="text-lg leading-8 text-slate-700">Businesses will maintain one structured record that powers their public page, local discovery result and future offers, events and enquiries. The free page stays practical; paid tools add measurable business value.</p>
        </div>
      </section>
    </>
  );
}
