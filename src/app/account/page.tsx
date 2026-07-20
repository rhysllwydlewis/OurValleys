import type { Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getAuth } from "@/lib/auth";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";

export const dynamic = "force-dynamic";

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

export default async function AccountPage() {
  const session = await readSession();
  if (!session) redirect("/login?next=/account");

  const businessAccess = await listAccessibleBusinesses(session.user.id)
    .then((businesses) => ({ state: "ready" as const, businesses }))
    .catch(() => ({ state: "unavailable" as const, businesses: [] }));

  return (
    <main className="page-shell compact">
      <section className="hero">
        <p className="eyebrow">Your account</p>
        <h1>Welcome, {session.user.name}.</h1>
        <p className="lead">
          This content is authorised on the server using a database-backed
          Better Auth session.
        </p>
        <div className="actions">
          <Link className="button primary" href="/businesses">
            Browse local businesses
          </Link>
          <Link className="button" href="/">
            Return home
          </Link>
          <SignOutButton />
        </div>
      </section>

      <section aria-labelledby="business-access-heading">
        <p className="eyebrow">Protected business access</p>
        <h2 id="business-access-heading">Your business dashboards</h2>
        {businessAccess.state === "unavailable" ? (
          <div className="state-panel" role="status">
            <h3>Business access is temporarily unavailable.</h3>
            <p>Your account remains signed in. Please try this page again.</p>
          </div>
        ) : businessAccess.businesses.length === 0 ? (
          <div className="state-panel">
            <h3>No business access is attached to this account.</h3>
            <p>Public browsing and account sign-out remain available.</p>
          </div>
        ) : (
          <div className="business-grid">
            {businessAccess.businesses.map((business) => (
              <article className="business-card" key={business.id}>
                <div className="business-card__body">
                  <div className="tag-row">
                    <span className="tag">{business.role}</span>
                    {business.isDemo ? (
                      <span className="tag tag--quiet">Fictional demo</span>
                    ) : null}
                  </div>
                  <h3>{business.tradingName}</h3>
                  <p>
                    Open the server-protected dashboard available to this
                    membership. Viewer accounts cannot edit or publish.
                  </p>
                  <Link
                    className="button primary"
                    href={`/dashboard/business/${business.id}` as Route}
                  >
                    Open business dashboard
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
