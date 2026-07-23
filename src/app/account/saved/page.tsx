import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import { isPublicDemoEmail } from "@/lib/demo-account";
import { listSavedDiscoveryForUser } from "@/modules/residents/saved-discovery";
import { removeBusinessAction, removeEventAction } from "./actions";
import styles from "./saved.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Saved businesses and events",
};

async function readSession() {
  try {
    return await getAuth().api.getSession({ headers: await headers() });
  } catch {
    return null;
  }
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/London",
  }).format(value);
}

export default async function SavedItemsPage() {
  const session = await readSession();
  if (!session) redirect("/login?next=/account/saved");

  const isDemoAccount = isPublicDemoEmail(session.user.email);
  const saved = isDemoAccount
    ? { state: "ready" as const, businesses: [], events: [] }
    : await listSavedDiscoveryForUser(session.user.id);

  return (
    <>
      <SiteHeader />
      <main className={styles.shell}>
        <section className={`${styles.hero} ov-glass`}>
          <p className={styles.eyebrow}>Your account</p>
          <h1>Saved businesses and events</h1>
          <p className={styles.lead}>
            Keep useful local businesses and upcoming events together in one
            private list. Items disappear automatically when they are no longer
            publicly available.
          </p>
          <div className={styles.actions}>
            <Link className="button" href={"/account" as Route}>
              Back to your account
            </Link>
            <Link className="button primary" href="/businesses">
              Browse businesses
            </Link>
          </div>
        </section>

        {isDemoAccount ? (
          <section className={styles.stateCard} role="note">
            <h2>Saved items are unavailable in the public demonstration.</h2>
            <p>
              Register your own free account to build a private list of local
              businesses and events.
            </p>
            <Link href="/register">Create your free account</Link>
          </section>
        ) : saved.state === "unavailable" ? (
          <section className={styles.stateCard} role="status">
            <h2>Your saved items are temporarily unavailable.</h2>
            <p>
              Your account remains signed in. Please refresh this page or try
              again shortly.
            </p>
          </section>
        ) : saved.state === "invalid" ? (
          <section className={styles.stateCard} role="status">
            <h2>We could not load this saved list safely.</h2>
            <p>Please sign out and sign in again before retrying.</p>
          </section>
        ) : saved.businesses.length === 0 && saved.events.length === 0 ? (
          <section className={styles.stateCard}>
            <h2>You have not saved anything yet.</h2>
            <p>
              Browse local businesses and events, then use their save controls
              to add them here.
            </p>
          </section>
        ) : (
          <div className={styles.sections}>
            <section aria-labelledby="saved-businesses-title">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>Local directory</p>
                  <h2 id="saved-businesses-title">Saved businesses</h2>
                </div>
                <span>{saved.businesses.length}</span>
              </div>

              {saved.businesses.length === 0 ? (
                <div className={styles.emptyRow}>No saved businesses.</div>
              ) : (
                <div className={styles.grid}>
                  {saved.businesses.map((business) => (
                    <article className={styles.card} key={business.id}>
                      <div>
                        <p className={styles.meta}>
                          {business.categoryName} · {business.placeName}
                        </p>
                        <h3>{business.tradingName}</h3>
                        <p>{business.summary}</p>
                      </div>
                      <div className={styles.cardActions}>
                        <Link
                          href={`/businesses/${business.slug}` as Route}
                        >
                          View business
                        </Link>
                        <form action={removeBusinessAction}>
                          <input
                            name="itemId"
                            type="hidden"
                            value={business.id}
                          />
                          <input
                            name="returnTo"
                            type="hidden"
                            value="/account/saved"
                          />
                          <button type="submit">Remove</button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section aria-labelledby="saved-events-title">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.eyebrow}>What is on</p>
                  <h2 id="saved-events-title">Saved events</h2>
                </div>
                <span>{saved.events.length}</span>
              </div>

              {saved.events.length === 0 ? (
                <div className={styles.emptyRow}>No upcoming saved events.</div>
              ) : (
                <div className={styles.grid}>
                  {saved.events.map((event) => (
                    <article className={styles.card} key={event.id}>
                      <div>
                        <p className={styles.meta}>
                          {formatDate(event.startsAt)}
                        </p>
                        <h3>{event.title}</h3>
                        <p>
                          {event.businessName}
                          {event.locationDisplay
                            ? ` · ${event.locationDisplay}`
                            : ""}
                        </p>
                      </div>
                      <div className={styles.cardActions}>
                        <Link
                          href={`/businesses/${event.businessSlug}` as Route}
                        >
                          View organiser
                        </Link>
                        <form action={removeEventAction}>
                          <input
                            name="itemId"
                            type="hidden"
                            value={event.id}
                          />
                          <input
                            name="returnTo"
                            type="hidden"
                            value="/account/saved"
                          />
                          <button type="submit">Remove</button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
