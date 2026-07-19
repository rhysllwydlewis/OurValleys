import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6">
      <p className="font-semibold text-emerald-800">404</p>
      <h1 className="mt-3 text-4xl font-black">We could not find that page</h1>
      <p className="mt-4 text-lg text-slate-600">The listing may be unpublished, suspended or no longer available.</p>
      <Link className="mt-8 inline-flex rounded-xl bg-emerald-800 px-5 py-3 font-bold text-white" href="/businesses">Browse local businesses</Link>
    </div>
  );
}
