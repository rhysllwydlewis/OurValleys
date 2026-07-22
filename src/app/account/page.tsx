import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuth } from "@/lib/auth";
import {
  getPublicDemoAccountByEmail,
  publicBusinessDemoAccount,
} from "@/lib/demo-account";
import { getAvatarTone, getInitials } from "@/lib/initials";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your account",
};

const roleCopy: Record<string, { label: string; description: string }> = {
  owner: {
    label: "Owner",
    description:
      "Full control of this business, including publishing and managing members.",
  },
  manager: {
    label: "Manager",
    description: "Can edit, publish and operate content for this business.",
  },
  editor: {
    label: "Editor",
    description: "Can edit profile, contacts and content but cannot publish.",
  },
  viewer: {
    label: "Viewer",
    description: "View-only access to this dashboard. Cannot edit or publish.",
  },
};

const restrictedDemoOwnerCopy = {
  label: "Demo owner",
  description:
    "Can view, edit and publish this fictional business. Member management and other business operations are disabled.",
};

const roleBadgeClass: Record<string, string | undefined> = {
  owner: styles.roleOwner,
  manager: styles.roleManager,
  editor: styles.roleEditor,
  viewer: styles.roleViewer,
};

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="m4 12.5 5.5 5.5L20 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M5 21h15M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M16 21v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3.5 5 6v6c0 4.5 3 7.6 7 8.5 4-.9 7-4 7-8.5V6l-7-2.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 3.5v3M17 3.5v3M4.5 9.5h15M6 6h12a1.5 1.5 0 0 1 1.5 1.5V19A1.5 1.5 0 0 1 18 20.5H6A1.5 1.5 0 0 1 4.5 19V7.5A1.5 1.5 0 0 1 6 6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 9v4.5M12 17h.01M10.4 4.3 2.9 17.5a1.5 1.5 0 0 0 1.3 2.25h15.6a1.5 1.5 0 0 0 1.3-2.25L13.6 4.3a1.5 1.5 0 0 0-2.6 0Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12h14m0 0-5.5-5.5M19 12l-5.5 5.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

  const publicDemo = getPublicDemoAccountByEmail(session.user.email);
  const businessAccess = await listAccessibleBusinesses(session.user.id)
    .then((businesses) => ({ state: "ready" as const, businesses }))
    .catch(() => ({ state: "unavailable" as const, businesses: [] }));
  const businesses =
    businessAccess.state === "ready" ? businessAccess.businesses : [];

  const firstName =
    session.user.name.trim().split(/\s+/)[0] ?? session.user.name;
  const memberSince = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(session.user.createdAt);

  return (
    <>
      <SiteHeader />
      <main className={styles.shell}>
        <section
          className={`${styles.hero} ov-glass`}
          aria-labelledby="account-title"
        >
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroTop}>
            <span
              className={`${styles.avatar} ${styles[`tone${getAvatarTone(session.user.id)}`]}`}
              aria-hidden="true"
            >
              {getInitials(session.user.name)}
            </span>
            <div>
              <p className={styles.eyebrow}>Your account</p>
              <h1 id="account-title">Welcome back, {firstName}.</h1>
              <p className={styles.heroMeta}>
                <span>{session.user.email}</span>
                {session.user.emailVerified ? (
                  <span className={styles.verifiedBadge}>
                    <CheckIcon /> Verified
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <p className={styles.lead}>
            {publicDemo
              ? "This intentionally public demonstration is restricted to its supplied journey. Account settings and additional business creation are disabled."
              : "You are signed in using a server-verified session, checked again on every request. Public browsing and search never require an account."}
          </p>
          <div className={styles.heroActions}>
            <Link className="button primary" href="/businesses">
              Browse local businesses
            </Link>
            {!publicDemo ? (
              <Link className="button" href={"/account/settings" as Route}>
                Account settings
              </Link>
            ) : null}
            <SignOutButton />
          </div>
        </section>

        <div className={styles.statRow}>
          <div className={styles.statTile}>
            <span className={styles.statIcon} aria-hidden="true">
              <BuildingIcon />
            </span>
            <div>
              <strong>{businesses.length}</strong>
              <span>{businesses.length === 1 ? "Business" : "Businesses"}</span>
            </div>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statIcon} aria-hidden="true">
              <ShieldIcon />
            </span>
            <div>
              <strong>
                {publicDemo
                  ? "Public demo"
                  : session.user.emailVerified
                    ? "Verified"
                    : "Unverified"}
              </strong>
              <span>Account status</span>
            </div>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statIcon} aria-hidden="true">
              <CalendarIcon />
            </span>
            <div>
              <strong>{memberSince}</strong>
              <span>Member since</span>
            </div>
          </div>
        </div>

        <section
          className={styles.section}
          aria-labelledby="business-access-heading"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Protected business access</p>
              <h2 id="business-access-heading">Your business dashboards</h2>
            </div>
            <p className={styles.sectionHint}>
              {publicDemo ? (
                "Public demo accounts are limited to their supplied access."
              ) : (
                <>
                  Server-verified membership, checked on every request.{" "}
                  <Link href={"/account/new-business" as Route}>
                    Create another business
                  </Link>
                </>
              )}
            </p>
          </div>

          {businessAccess.state === "unavailable" ? (
            <div
              className={`${styles.stateCard} ${styles.stateCardWarning}`}
              role="status"
            >
              <span className={styles.stateIcon} aria-hidden="true">
                <WarningIcon />
              </span>
              <div>
                <h3>Business access is temporarily unavailable.</h3>
                <p>
                  Your account remains signed in. Please try this page again
                  shortly.
                </p>
              </div>
            </div>
          ) : publicDemo && businesses.length === 0 ? (
            <div className={styles.stateCard} role="note">
              <span className={styles.stateIcon} aria-hidden="true">
                <ShieldIcon />
              </span>
              <div>
                <h3>This demonstration has no business dashboards.</h3>
                <p>
                  Public demo accounts cannot create additional business
                  records. Use a private account for a real business journey.
                </p>
              </div>
            </div>
          ) : businesses.length === 0 ? (
            <div className={styles.stateCard}>
              <span className={styles.stateIcon} aria-hidden="true">
                <BuildingIcon />
              </span>
              <div>
                <h3>Create your free business website.</h3>
                <p>
                  Add your business name, category and location and preview a
                  starter website straight away. Your free OurValleys website
                  and local listing grow from the same details.
                </p>
                <p>
                  <Link
                    className={styles.businessCta}
                    href={"/account/new-business" as Route}
                  >
                    Create your free business website
                    <ArrowIcon />
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            <div className={styles.businessGrid}>
              {businesses.map((business) => {
                const isRestrictedDemoOwner =
                  publicDemo?.key === "business" &&
                  business.id === publicBusinessDemoAccount.businessId;
                const role = isRestrictedDemoOwner
                  ? restrictedDemoOwnerCopy
                  : (roleCopy[business.role] ?? {
                      label: business.role,
                      description: "Access to this business dashboard.",
                    });

                return (
                  <article className={styles.businessCard} key={business.id}>
                    <div className={styles.businessCardTop}>
                      <span
                        className={`${styles.businessAvatar} ${styles[`tone${getAvatarTone(business.id)}`]}`}
                        aria-hidden="true"
                      >
                        {getInitials(business.tradingName)}
                      </span>
                      <div className={styles.businessTags}>
                        <span
                          className={`${styles.roleBadge} ${roleBadgeClass[business.role] ?? styles.roleViewer}`}
                        >
                          {role.label}
                        </span>
                        {business.isDemo ? (
                          <span className={styles.demoBadge}>
                            Fictional demo
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <h3>{business.tradingName}</h3>
                    <p>{role.description}</p>
                    <Link
                      className={styles.businessCta}
                      href={`/dashboard/business/${business.id}` as Route}
                    >
                      Open business dashboard
                      <ArrowIcon />
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section
          className={styles.teaser}
          aria-labelledby="resident-teaser-heading"
        >
          <span className={styles.teaserBadge}>Coming soon</span>
          <h2 id="resident-teaser-heading">
            Saved places and tailored updates.
          </h2>
          <p>
            Resident accounts will unlock saved businesses, followed areas and
            useful local updates once those journeys are complete and verified.
            Public search already works fully without an account.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
