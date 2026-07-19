import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700">OurValleys</Link>
        <nav aria-label="Primary navigation">
          <ul className="flex items-center gap-4 text-sm font-semibold text-slate-700">
            <li><Link className="hover:text-emerald-800" href="/businesses">Businesses</Link></li>
            <li><Link className="hover:text-emerald-800" href="/#for-businesses">For businesses</Link></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
