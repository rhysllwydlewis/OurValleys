import Link from "next/link";
import type { PublicBusiness } from "@/modules/businesses/types";

export function BusinessCard({ business }: { business: PublicBusiness }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-emerald-800">{business.category.name}</p>
      <h2 className="mt-2 text-xl font-bold text-slate-950">
        <Link className="rounded-sm hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700" href={`/businesses/${business.slug}`}>{business.tradingName}</Link>
      </h2>
      <p className="mt-2 text-slate-600">{business.summary}</p>
      <p className="mt-4 text-sm text-slate-500">{business.place?.name ?? "Serving Rhondda Cynon Taf"}</p>
    </article>
  );
}
