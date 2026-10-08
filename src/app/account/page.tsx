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
import { LOCALE_DETAILS } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/translate";
import { getAvatarTone, getInitials } from "@/lib/initials";
import { listAccessibleBusinesses } from "@/modules/businesses/account-access";
import {
  listSavedBusinessIdsForUser,
  listSavedEventIdsForUser,
  listSavedPlaceIdsForUser,
} from "@/modules/residents/saved-discovery";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return { title: t("account.metaTitle") };
}

const roleCopy: Record<string, { label: MessageKey; description: MessageKey }> =
  {
    owner: {
      label: "account.role.owner",
      description: "account.role.ownerDescription",
    },
    manager: {
      label: "account.role.manager",
      description: "account.role.managerDescription",
    },
    editor: {
      label: "account.role.editor",
      description: "account.role.editorDescription",
    },
    viewer: {
      label: "account.role.viewer",
      description: "account.role.viewerDescription",
    },
  };

const restrictedDemoOwnerCopy = {
  label: "account.role.demoOwner",
  description: "account.role.demoOwnerDescription",
} as const;

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
  const { locale, t } = await getTranslator();
  const session = await readSession();
  if (!session) redirect("/login?next=/account");

  const publicDemo = getPublicDemoAccountByEmail(session.user.email);
  const businessAccess = await listAccessibleBusinesses(session.user.id)
    .then((businesses) => ({ state: "ready" as const, businesses }))
    .catch(() => ({ state: "unavailable" as const, businesses: [] }));
  const businesses =
    businessAccess.state === "ready" ? businessAccess.businesses : [];

  const [savedBusinessIds, savedEventIds, savedPlaceIds] = await Promise.all([
    listSavedBusinessIdsForUser(session.user.id),
    listSavedEventIdsForUser(session.user.id),
    listSavedPlaceIdsForUser(session.user.id),
  ]);
  const savedTotal =
    savedBusinessIds.length + savedEventIds.length + savedPlaceIds.length;
  const savedCounts = [
    {
      count: savedBusinessIds.length,
      one: "account.saved.business.one",
      other: "account.saved.business.other",
    },
    {
      count: savedEventIds.length,
      one: "account.saved.event.one",
      other: "account.saved.event.other",
    },
    {
      count: savedPlaceIds.length,
      one: "account.saved.place.one",
      other: "account.saved.place.other",
    },
  ] as const;
  const savedSummary = savedCounts
    .filter(({ count }) => count > 0)
    .map(({ count, one, other }) => t(count === 1 ? one : other, { count }))
    .join(", ");

  const firstName =
    session.user.name.trim().split(/\s+/)[0] ?? session.user.name;
  const memberSince = new Intl.DateTimeFormat(LOCALE_DETAILS[locale].htmlLang, {
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(session.user.createdAt);

  return (
    <>
      <SiteHeader />
      <main className={styles.shell} lang={LOCALE_DETAILS[locale].htmlLang}>
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
              <p className={styles.eyebrow}>{t("account.eyebrow")}</p>
              <h1 id="account-title">
                {t("account.welcome", { name: firstName })}
              </h1>
              <p className={styles.heroMeta}>
                <span>{session.user.email}</span>
                {session.user.emailVerified ? (
                  <span className={styles.verifiedBadge}>
                    <CheckIcon /> {t("account.verified")}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <p className={styles.lead}>
            {publicDemo ? t("account.leadDemo") : t("account.lead")}
          </p>
          <div className={styles.heroActions}>
            <Link className="button primary" href="/businesses">
              {t("account.browse")}
            </Link>
            {!publicDemo ? (
              <Link className="button" href={"/account/settings" as Route}>
                {t("account.settings")}
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
              <span>
                {businesses.length === 1
                  ? t("account.stat.business")
                  : t("account.stat.businesses")}
              </span>
            </div>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statIcon} aria-hidden="true">
              <ShieldIcon />
            </span>
            <div>
              <strong>
                {publicDemo
                  ? t("account.publicDemo")
                  : session.user.emailVerified
                    ? t("account.verified")
                    : t("account.unverified")}
              </strong>
              <span>{t("account.stat.status")}</span>
            </div>
          </div>
          <div className={styles.statTile}>
            <span className={styles.statIcon} aria-hidden="true">
              <CalendarIcon />
            </span>
            <div>
              <strong>{memberSince}</strong>
              <span>{t("account.stat.memberSince")}</span>
            </div>
          </div>
        </div>

        <section
          className={styles.section}
          aria-labelledby="business-access-heading"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>{t("account.access.eyebrow")}</p>
              <h2 id="business-access-heading">{t("account.access.title")}</h2>
            </div>
            <p className={styles.sectionHint}>
              {publicDemo ? (
                t("account.access.hintDemo")
              ) : (
                <>
                  {t("account.access.hint")}{" "}
                  <Link href={"/account/new-business" as Route}>
                    {t("account.access.createAnother")}
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
                <h3>{t("account.access.unavailableTitle")}</h3>
                <p>{t("account.access.unavailableBody")}</p>
              </div>
            </div>
          ) : publicDemo && businesses.length === 0 ? (
            <div className={styles.stateCard} role="note">
              <span className={styles.stateIcon} aria-hidden="true">
                <ShieldIcon />
              </span>
              <div>
                <h3>{t("account.access.demoEmptyTitle")}</h3>
                <p>{t("account.access.demoEmptyBody")}</p>
              </div>
            </div>
          ) : businesses.length === 0 ? (
            <div className={styles.stateCard}>
              <span className={styles.stateIcon} aria-hidden="true">
                <BuildingIcon />
              </span>
              <div>
                <h3>{t("account.access.emptyTitle")}</h3>
                <p>{t("account.access.emptyBody")}</p>
                <p>
                  <Link
                    className={styles.businessCta}
                    href={"/account/new-business" as Route}
                  >
                    {t("account.access.emptyCta")}
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
                const roleMessages = isRestrictedDemoOwner
                  ? restrictedDemoOwnerCopy
                  : roleCopy[business.role];
                const role = roleMessages
                  ? {
                      label: t(roleMessages.label),
                      description: t(roleMessages.description),
                    }
                  : {
                      label: business.role,
                      description: t("account.role.fallbackDescription"),
                    };

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
                            {t("account.business.demoBadge")}
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
                      {t("account.business.open")}
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
          aria-labelledby="saved-summary-heading"
        >
          <h2 id="saved-summary-heading">{t("account.saved.title")}</h2>
          <p>
            {savedTotal === 0
              ? t("account.saved.empty")
              : t("account.saved.summary", { items: savedSummary })}
          </p>
          <div className={styles.teaserActions}>
            <Link className="button" href={"/account/saved" as Route}>
              {t("account.saved.view")}
            </Link>
            <Link className="button" href={"/account/settings" as Route}>
              {t("account.saved.digest")}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
